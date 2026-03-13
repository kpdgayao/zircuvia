import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { businessSchema } from "@/lib/validations";
import { createSystemLog } from "@/lib/system-log";
import type { BusinessCategory } from "@prisma/client";
import { z } from "zod";

// GET /api/businesses/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const business = await prisma.business.findUnique({
      where: { id },
      include: {
        reviews: {
          orderBy: { createdAt: "desc" },
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true },
            },
          },
        },
        _count: { select: { reviews: true } },
      },
    });

    if (!business || business.isArchived) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    const { _count, reviews, ...rest } = business;
    const reviewCount = _count.reviews;
    const avgRating =
      reviewCount > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
        : 0;

    return NextResponse.json({ business: { ...rest, reviews, avgRating, reviewCount } });
  } catch (error) {
    console.error("GET /api/businesses/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/businesses/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminAccess = await prisma.adminAccess.findUnique({
      where: { userId: session.userId },
    });
    if (!adminAccess?.businessManagement) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existing = await prisma.business.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    const body = await request.json();
    const data = businessSchema.parse(body);

    const business = await prisma.business.update({
      where: { id },
      data: {
        name: data.name,
        category: data.category as BusinessCategory,
        about: data.about ?? null,
        address: data.address,
        barangay: data.barangay ?? null,
        lat: data.lat ?? null,
        lng: data.lng ?? null,
        email: data.email || null,
        phone: data.phone ?? null,
        website: data.website ?? null,
        owner: data.owner ?? null,
        coverPhotoUrl: data.coverPhotoUrl || null,
      },
    });

    await createSystemLog({
      action: "BUSINESS_UPDATED",
      description: `Business "${business.name}" updated`,
      userId: session.userId,
      targetType: "Business",
      targetId: business.id,
    });

    return NextResponse.json({ business });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("PUT /api/businesses/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

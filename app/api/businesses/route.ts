import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { businessSchema, paginationSchema } from "@/lib/validations";
import { createSystemLog } from "@/lib/system-log";
import type { BusinessCategory, Prisma } from "@prisma/client";
import { z } from "zod";

// GET /api/businesses
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const { page, limit } = paginationSchema.parse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    const search = searchParams.get("search") ?? undefined;
    const categoryParam = searchParams.get("category") ?? undefined;
    const ecoOnly = searchParams.get("ecoOnly") === "true";

    // Build where clause
    const where: Prisma.BusinessWhereInput = {
      isArchived: false,
    };

    if (ecoOnly) {
      where.isEcoCertified = true;
    }

    if (categoryParam) {
      const categories = categoryParam
        .split(",")
        .map((c) => c.trim().toUpperCase())
        .filter(Boolean) as BusinessCategory[];
      if (categories.length > 0) {
        where.category = { in: categories };
      }
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [businesses, total] = await Promise.all([
      prisma.business.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { reviews: true } },
          reviews: {
            select: { rating: true },
          },
        },
      }),
      prisma.business.count({ where }),
    ]);

    const result = businesses.map((b) => {
      const { reviews, _count, ...rest } = b;
      const reviewCount = _count.reviews;
      const avgRating =
        reviewCount > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
          : 0;
      return { ...rest, avgRating, reviewCount };
    });

    return NextResponse.json({
      businesses: result,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: error.issues },
        { status: 400 }
      );
    }
    console.error("GET /api/businesses error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/businesses
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check business management permission
    const adminAccess = await prisma.adminAccess.findUnique({
      where: { userId: session.userId },
    });
    if (!adminAccess?.businessManagement) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const data = businessSchema.parse(body);

    const business = await prisma.business.create({
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
      action: "BUSINESS_CREATED",
      description: `Business "${business.name}" created`,
      userId: session.userId,
      targetType: "Business",
      targetId: business.id,
    });

    return NextResponse.json({ business }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("POST /api/businesses error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

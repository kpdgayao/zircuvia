import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { reviewSchema, paginationSchema } from "@/lib/validations";
import { z } from "zod";

// GET /api/businesses/[id]/reviews
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    const { page, limit } = paginationSchema.parse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    const business = await prisma.business.findUnique({
      where: { id },
      select: { id: true, isArchived: true },
    });

    if (!business || business.isArchived) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { businessId: id },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true },
          },
        },
      }),
      prisma.review.count({ where: { businessId: id } }),
    ]);

    return NextResponse.json({
      reviews,
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
    console.error("GET /api/businesses/[id]/reviews error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/businesses/[id]/reviews
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role !== "TOURIST") {
      return NextResponse.json(
        { error: "Only tourists can leave reviews" },
        { status: 403 }
      );
    }

    const business = await prisma.business.findUnique({
      where: { id },
      select: { id: true, isArchived: true },
    });

    if (!business || business.isArchived) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    const body = await request.json();
    const data = reviewSchema.parse(body);

    const review = await prisma.review.create({
      data: {
        businessId: id,
        userId: session.userId,
        rating: data.rating,
        text: data.text ?? null,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });

    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("POST /api/businesses/[id]/reviews error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

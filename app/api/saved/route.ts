import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role !== "TOURIST") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const saved = await prisma.savedBusiness.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      include: {
        business: {
          include: {
            reviews: { select: { rating: true } },
            _count: { select: { reviews: true } },
          },
        },
      },
    });

    const businesses = saved.map((s) => {
      const { reviews, _count, ...rest } = s.business;
      const reviewCount = _count.reviews;
      const avgRating =
        reviewCount > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
          : 0;
      return { ...rest, avgRating, reviewCount, savedAt: s.createdAt };
    });

    return NextResponse.json({ businesses });
  } catch (error) {
    console.error("GET /api/saved error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

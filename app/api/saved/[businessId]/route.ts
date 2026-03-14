import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role !== "TOURIST") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { businessId } = await params;

    // Check that business exists
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });
    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    // Toggle: if already saved, unsave; otherwise save
    const existing = await prisma.savedBusiness.findUnique({
      where: {
        userId_businessId: {
          userId: session.userId,
          businessId,
        },
      },
    });

    if (existing) {
      await prisma.savedBusiness.delete({ where: { id: existing.id } });
      return NextResponse.json({ saved: false, message: "Business unsaved" });
    }

    await prisma.savedBusiness.create({
      data: {
        userId: session.userId,
        businessId,
      },
    });

    return NextResponse.json({ saved: true, message: "Business saved" }, { status: 201 });
  } catch (error) {
    console.error("POST /api/saved/[businessId] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role !== "VERIFIER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const dateParam = req.nextUrl.searchParams.get("date");
    const date = dateParam ? new Date(dateParam) : new Date();
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const verifierProfile = await prisma.verifierProfile.findUnique({
      where: { userId: session.userId },
    });
    if (!verifierProfile) {
      return NextResponse.json({ error: "Verifier profile not found" }, { status: 400 });
    }

    const checkIns = await prisma.checkIn.findMany({
      where: {
        verifierId: verifierProfile.id,
        verifiedAt: { gte: dayStart, lte: dayEnd },
      },
      include: {
        feePayment: {
          select: {
            referenceId: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { verifiedAt: "desc" },
    });

    const summary = {
      totalPersons: checkIns.reduce((sum, ci) => sum + ci.totalPersons, 0),
      checkInCount: checkIns.length,
    };

    return NextResponse.json({ summary, checkIns });
  } catch (error) {
    console.error("Checker history error:", error);
    return NextResponse.json({ error: "Failed to load history" }, { status: 500 });
  }
}

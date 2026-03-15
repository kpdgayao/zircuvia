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

    const checkIns = await prisma.checkIn.findMany({
      where: {
        verifier: { userId: session.userId },
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

    // Weekly summary (always current week, independent of browsed date)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setDate(monday.getDate() - mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const weekCheckIns = await prisma.checkIn.findMany({
      where: {
        verifier: { userId: session.userId },
        checkDate: { gte: monday, lte: sunday },
      },
      select: { totalPersons: true, checkDate: true },
    });

    const weekTotalPersons = weekCheckIns.reduce((sum, ci) => sum + ci.totalPersons, 0);
    const daysElapsed = mondayOffset + 1; // inclusive of today (Mon=1, Tue=2, ..., Sun=7)
    const dailyAverage = daysElapsed > 0 ? Math.round((weekTotalPersons / daysElapsed) * 10) / 10 : 0;

    // Today's total from week data
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const todayPersons = weekCheckIns
      .filter((ci) => {
        const d = new Date(ci.checkDate);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` === todayStr;
      })
      .reduce((sum, ci) => sum + ci.totalPersons, 0);

    const todayVsAverage: "above" | "below" | "equal" =
      todayPersons > dailyAverage ? "above" : todayPersons < dailyAverage ? "below" : "equal";

    const weeklySummary = {
      totalPersons: weekTotalPersons,
      checkInCount: weekCheckIns.length,
      dailyAverage,
      todayPersons,
      todayVsAverage,
    };

    return NextResponse.json({ summary, checkIns, weeklySummary });
  } catch (error) {
    console.error("Checker history error:", error);
    return NextResponse.json({ error: "Failed to load history" }, { status: 500 });
  }
}

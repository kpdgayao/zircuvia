import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfWeek, endOfWeek, differenceInCalendarDays } from "date-fns";

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

    // Weekly summary boundaries (always current week, independent of browsed date)
    const now = new Date();
    const monday = startOfWeek(now, { weekStartsOn: 1 });
    const sunday = endOfWeek(now, { weekStartsOn: 1 });

    // Run daily and weekly queries in parallel
    const [checkIns, weekCheckIns] = await Promise.all([
      prisma.checkIn.findMany({
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
      }),
      prisma.checkIn.findMany({
        where: {
          verifier: { userId: session.userId },
          checkDate: { gte: monday, lte: sunday },
        },
        select: { totalPersons: true, checkDate: true },
      }),
    ]);

    const summary = {
      totalPersons: checkIns.reduce((sum, ci) => sum + ci.totalPersons, 0),
      checkInCount: checkIns.length,
    };

    const weekTotalPersons = weekCheckIns.reduce((sum, ci) => sum + ci.totalPersons, 0);
    const daysElapsed = differenceInCalendarDays(now, monday) + 1;
    const dailyAverage = daysElapsed > 0 ? Math.round((weekTotalPersons / daysElapsed) * 10) / 10 : 0;

    // Today's total from week data
    const todayStr = now.toISOString().slice(0, 10);
    const todayPersons = weekCheckIns
      .filter((ci) => new Date(ci.checkDate).toISOString().slice(0, 10) === todayStr)
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

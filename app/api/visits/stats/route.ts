import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseDateRangeFilter } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

// GET /api/visits/stats — visitor stats with payer breakdown, daily volume, verifier activity
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminAccess = await prisma.adminAccess.findUnique({
      where: { userId: session.userId },
    });
    if (!adminAccess?.visitorStats) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const paidAtFilter = parseDateRangeFilter(searchParams.get("from"), searchParams.get("to"));

    const dateFilter: Prisma.FeePaymentWhereInput = {
      status: { in: ["ACTIVE", "EXPIRED"] },
      ...(paidAtFilter && { paidAt: paidAtFilter }),
    };

    const checkInDateFilter: Prisma.CheckInWhereInput = paidAtFilter
      ? { checkDate: { gte: paidAtFilter.gte, lte: paidAtFilter.lte } }
      : {};

    // Run independent queries in parallel
    const [aggregates, breakdownRaw, verifierRaw, dailyVolumeRaw] = await Promise.all([
      prisma.feePayment.aggregate({
        where: dateFilter,
        _sum: { totalPersons: true, totalAmount: true },
        _count: true,
      }),
      prisma.feePaymentLine.groupBy({
        by: ["payerType"],
        where: { feePayment: dateFilter },
        _sum: { quantity: true, lineTotal: true },
      }),
      prisma.checkIn.groupBy({
        by: ["verifierId"],
        where: checkInDateFilter,
        _sum: { totalPersons: true },
        orderBy: { _sum: { totalPersons: "desc" } },
        take: 5,
      }),
      prisma.checkIn.groupBy({
        by: ["checkDate"],
        where: checkInDateFilter,
        _sum: { totalPersons: true },
        orderBy: { checkDate: "asc" },
      }),
    ]);

    const breakdown = breakdownRaw.map((row) => ({
      payerType: row.payerType,
      persons: row._sum.quantity ?? 0,
      amount: row._sum.lineTotal ?? 0,
    }));

    // Daily volume
    const dailyVolume = dailyVolumeRaw.map((row) => ({
      date: row.checkDate.toISOString().slice(0, 10),
      visitors: row._sum.totalPersons ?? 0,
    }));

    // Verifier activity
    const verifierIds = verifierRaw.map((v) => v.verifierId);
    const verifiers =
      verifierIds.length > 0
        ? await prisma.verifierProfile.findMany({
            where: { id: { in: verifierIds } },
            include: {
              user: { select: { firstName: true, lastName: true } },
              assignedLocation: { select: { name: true } },
            },
          })
        : [];

    const verifierMap = Object.fromEntries(verifiers.map((v) => [v.id, v]));

    const verifierActivity = verifierRaw.map((item) => {
      const verifier = verifierMap[item.verifierId];
      const name = verifier
        ? `${verifier.user.firstName} ${verifier.user.lastName}`
        : "Unknown";
      return {
        name,
        location: verifier?.assignedLocation?.name ?? "Unassigned",
        visitors: item._sum.totalPersons ?? 0,
      };
    });

    return NextResponse.json({
      totalPayments: aggregates._count,
      totalVisitors: aggregates._sum.totalPersons ?? 0,
      totalAmount: aggregates._sum.totalAmount ?? 0,
      breakdown,
      dailyVolume,
      verifierActivity,
    });
  } catch (error) {
    console.error("GET /api/visits/stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseDateRangeFilter } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

// GET /api/visits/stats — visitor stats with payer breakdown, visits by category, top 5 places
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

    // Run independent queries in parallel
    const [aggregates, breakdownRaw, topPlacesRaw] = await Promise.all([
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
        _sum: { totalPersons: true },
        orderBy: { _sum: { totalPersons: "desc" } },
        take: 5,
      }),
    ]);

    const breakdown = breakdownRaw.map((row) => ({
      payerType: row.payerType,
      persons: row._sum.quantity ?? 0,
      amount: row._sum.lineTotal ?? 0,
    }));

    const verifierIds = topPlacesRaw.map((v) => v.verifierId);
    const verifiers =
      verifierIds.length > 0
        ? await prisma.verifierProfile.findMany({
            where: { id: { in: verifierIds } },
            include: { assignedLocation: { select: { id: true, name: true, category: true } } },
          })
        : [];

    const verifierMap = Object.fromEntries(verifiers.map((v) => [v.id, v]));

    const topPlaces = topPlacesRaw
      .map((item) => {
        const verifier = verifierMap[item.verifierId];
        return {
          name: verifier?.assignedLocation?.name ?? "Unknown Location",
          category: verifier?.assignedLocation?.category ?? "UNKNOWN",
          visitors: item._sum.totalPersons ?? 0,
        };
      })
      .filter((p) => p.name !== "Unknown Location");

    // Visits by category (from check-ins via verifier locations)
    const categoryMap: Record<string, number> = {};
    for (const item of topPlacesRaw) {
      const verifier = verifierMap[item.verifierId];
      const cat = verifier?.assignedLocation?.category ?? "UNKNOWN";
      categoryMap[cat] = (categoryMap[cat] ?? 0) + (item._sum.totalPersons ?? 0);
    }

    const visitsByCategory = Object.entries(categoryMap).map(([category, visitors]) => ({
      category,
      visitors,
    }));

    return NextResponse.json({
      totalPayments: aggregates._count,
      totalVisitors: aggregates._sum.totalPersons ?? 0,
      totalAmount: aggregates._sum.totalAmount ?? 0,
      breakdown,
      topPlaces,
      visitsByCategory,
    });
  } catch (error) {
    console.error("GET /api/visits/stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

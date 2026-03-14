import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    // Date filter for confirmed payments
    const dateFilter: Prisma.FeePaymentWhereInput = {
      status: { in: ["ACTIVE", "EXPIRED"] },
    };

    if (from || to) {
      const paidAtFilter: { gte?: Date; lte?: Date } = {};
      if (from) {
        const d = new Date(from);
        if (!isNaN(d.getTime())) paidAtFilter.gte = d;
      }
      if (to) {
        const d = new Date(to);
        if (!isNaN(d.getTime())) paidAtFilter.lte = d;
      }
      if (paidAtFilter.gte || paidAtFilter.lte) {
        dateFilter.paidAt = paidAtFilter;
      }
    }

    // Aggregates
    const aggregates = await prisma.feePayment.aggregate({
      where: dateFilter,
      _sum: { totalPersons: true, totalAmount: true },
      _count: true,
    });

    // Breakdown by payer type
    const lines = await prisma.feePaymentLine.findMany({
      where: { feePayment: dateFilter },
      select: { payerType: true, quantity: true, lineTotal: true },
    });

    const breakdownMap: Record<string, { persons: number; amount: number }> = {};
    for (const line of lines) {
      if (!breakdownMap[line.payerType]) {
        breakdownMap[line.payerType] = { persons: 0, amount: 0 };
      }
      breakdownMap[line.payerType].persons += line.quantity;
      breakdownMap[line.payerType].amount += line.lineTotal;
    }

    const breakdown = Object.entries(breakdownMap).map(([payerType, data]) => ({
      payerType,
      ...data,
    }));

    // Top 5 places by check-in count
    const topPlacesRaw = await prisma.checkIn.groupBy({
      by: ["verifierId"],
      _sum: { totalPersons: true },
      orderBy: { _sum: { totalPersons: "desc" } },
      take: 5,
    });

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

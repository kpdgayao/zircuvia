import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseDateRangeFilter } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check environmentalFees permission
    const adminAccess = await prisma.adminAccess.findUnique({
      where: { userId: session.userId },
    });
    if (!adminAccess?.environmentalFees) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const paidAtFilter = parseDateRangeFilter(searchParams.get("from"), searchParams.get("to"));

    const dateFilter: Prisma.FeePaymentWhereInput = {
      status: { in: ["ACTIVE", "EXPIRED"] },
      ...(paidAtFilter && { paidAt: paidAtFilter }),
    };

    // Total visitors and amount + breakdown by payer type in parallel
    const [aggregates, groupedLines] = await Promise.all([
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
    ]);

    const breakdown = groupedLines.map((g) => ({
      payerType: g.payerType,
      persons: g._sum.quantity ?? 0,
      amount: g._sum.lineTotal ?? 0,
    }));

    return NextResponse.json({
      totalPayments: aggregates._count,
      totalVisitors: aggregates._sum.totalPersons ?? 0,
      totalAmount: aggregates._sum.totalAmount ?? 0,
      breakdown,
    });
  } catch (error) {
    console.error("GET /api/fees/stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    // Build date filter for confirmed payments (paidAt)
    const dateFilter: Prisma.FeePaymentWhereInput = {
      status: { in: ["ACTIVE", "EXPIRED"] },
    };

    if (from || to) {
      dateFilter.paidAt = {};
      if (from) dateFilter.paidAt.gte = new Date(from);
      if (to) dateFilter.paidAt.lte = new Date(to);
    }

    // Total visitors and amount
    const aggregates = await prisma.feePayment.aggregate({
      where: dateFilter,
      _sum: { totalPersons: true, totalAmount: true },
      _count: true,
    });

    // Breakdown by payer type
    const lines = await prisma.feePaymentLine.findMany({
      where: {
        feePayment: dateFilter,
      },
      select: {
        payerType: true,
        quantity: true,
        lineTotal: true,
      },
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

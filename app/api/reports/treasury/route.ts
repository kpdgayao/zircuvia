import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseDateRangeFilter } from "@/lib/utils";
import { FEE_PRICES } from "@/lib/fee-constants";
import type { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminAccess = await prisma.adminAccess.findUnique({
      where: { userId: session.userId },
    });
    if (!adminAccess?.environmentalFees) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const paidAtFilter = parseDateRangeFilter(
      searchParams.get("from"),
      searchParams.get("to")
    );

    const paidFilter: Prisma.FeePaymentWhereInput = {
      status: { in: ["ACTIVE", "EXPIRED"] },
      ...(paidAtFilter && { paidAt: paidAtFilter }),
    };

    const allStatusFilter: Prisma.FeePaymentWhereInput = {
      ...(paidAtFilter && { createdAt: paidAtFilter }),
    };

    // Run all queries in parallel
    const [aggregates, groupedLines, statusGroups, recentPayments] =
      await Promise.all([
        // Summary aggregates (only paid/expired — actual collections)
        prisma.feePayment.aggregate({
          where: paidFilter,
          _sum: { totalPersons: true, totalAmount: true },
          _count: true,
        }),

        // Breakdown by payer type
        prisma.feePaymentLine.groupBy({
          by: ["payerType"],
          where: { feePayment: paidFilter },
          _sum: { quantity: true, lineTotal: true },
        }),

        // Breakdown by status (all statuses)
        prisma.feePayment.groupBy({
          by: ["status"],
          where: allStatusFilter,
          _sum: { totalAmount: true },
          _count: true,
        }),

        // Recent transactions
        prisma.feePayment.findMany({
          where: paidFilter,
          orderBy: { paidAt: "desc" },
          take: 50,
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        }),
      ]);

    const totalRevenue = aggregates._sum.totalAmount ?? 0;
    const totalVisitors = aggregates._sum.totalPersons ?? 0;
    const totalPaidPayments = aggregates._count;

    // Collection rate: active+expired (collected) vs all statuses
    const totalAllStatuses = statusGroups.reduce((s, g) => s + g._count, 0);
    const collectionRate =
      totalAllStatuses > 0
        ? Math.round((totalPaidPayments / totalAllStatuses) * 100)
        : 0;

    // Payer type breakdown with share percentages
    const byPayerType = groupedLines.map((g) => {
      const collected = g._sum.lineTotal ?? 0;
      return {
        payerType: g.payerType,
        count: g._sum.quantity ?? 0,
        unitRate: FEE_PRICES[g.payerType as keyof typeof FEE_PRICES] ?? 0,
        totalCollected: collected,
        sharePercent:
          totalRevenue > 0 ? Math.round((collected / totalRevenue) * 100) : 0,
      };
    });

    // Status breakdown with percentages
    const totalStatusAmount = statusGroups.reduce(
      (s, g) => s + (g._sum.totalAmount ?? 0),
      0
    );
    const byStatus = statusGroups.map((g) => {
      const amount = g._sum.totalAmount ?? 0;
      return {
        status: g.status,
        transactions: g._count,
        amount,
        percent:
          totalStatusAmount > 0
            ? Math.round((amount / totalStatusAmount) * 100)
            : 0,
      };
    });

    const formattedPayments = recentPayments.map((p) => ({
      referenceId: p.referenceId,
      payerName: `${p.user.firstName} ${p.user.lastName}`,
      totalPersons: p.totalPersons,
      totalAmount: p.totalAmount,
      status: p.status,
      paidAt: p.paidAt?.toISOString() ?? null,
    }));

    return NextResponse.json({
      summary: {
        totalRevenue,
        totalVisitors,
        totalPayments: totalPaidPayments,
        collectionRate,
      },
      byPayerType,
      byStatus,
      recentPayments: formattedPayments,
    });
  } catch (error) {
    console.error("GET /api/reports/treasury error:", error);
    return NextResponse.json(
      { error: "Failed to generate treasury report" },
      { status: 500 }
    );
  }
}

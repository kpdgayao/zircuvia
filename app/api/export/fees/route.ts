import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

// GET /api/export/fees — CSV export of fee payments
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
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: Prisma.FeePaymentWhereInput = {
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
        where.paidAt = paidAtFilter;
      }
    }

    const payments = await prisma.feePayment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        lines: true,
      },
    });

    // Build CSV
    const headers = [
      "Reference ID",
      "Payer Name",
      "Payer Email",
      "Total Persons",
      "Total Amount",
      "Status",
      "Paid At",
      "Created At",
    ];

    const rows = payments.map((p) => [
      p.referenceId,
      `${p.user.firstName} ${p.user.lastName}`,
      p.user.email,
      String(p.totalPersons),
      p.totalAmount.toFixed(2),
      p.status,
      p.paidAt ? new Date(p.paidAt).toISOString() : "",
      new Date(p.createdAt).toISOString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="fee-payments-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error("GET /api/export/fees error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

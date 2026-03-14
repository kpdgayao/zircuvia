import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseDateRangeFilter } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

// GET /api/export/visits — CSV export of visitor data
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

    const where: Prisma.FeePaymentWhereInput = {
      status: { in: ["ACTIVE", "EXPIRED"] },
      ...(paidAtFilter && { paidAt: paidAtFilter }),
    };

    const payments = await prisma.feePayment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 10000,
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        lines: true,
        checkIns: {
          include: {
            verifier: {
              include: {
                assignedLocation: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    const headers = [
      "Reference ID",
      "Payer Name",
      "Total Persons",
      "Total Amount",
      "Status",
      "Paid At",
      "Payer Types",
      "Check-in Locations",
    ];

    const rows = payments.map((p) => {
      const payerTypes = p.lines
        .map((l) => `${l.payerType}(${l.quantity})`)
        .join("; ");
      const checkInLocations = p.checkIns
        .map((c) => c.verifier.assignedLocation?.name ?? "Unknown")
        .join("; ");

      return [
        p.referenceId,
        `${p.user.firstName} ${p.user.lastName}`,
        String(p.totalPersons),
        p.totalAmount.toFixed(2),
        p.status,
        p.paidAt ? new Date(p.paidAt).toISOString() : "",
        payerTypes,
        checkInLocations,
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="visitor-data-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error("GET /api/export/visits error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

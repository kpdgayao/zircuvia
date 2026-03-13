import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(["TOURIST", "ADMIN"]);
    const { id } = await params;

    const payment = await prisma.feePayment.findUnique({
      where: { id },
      include: {
        lines: true,
        checkIns: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    // Tourist can only see their own payments
    if (session.role === "TOURIST" && payment.userId !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Auto-expire if needed
    const now = new Date();
    if (payment.status === "ACTIVE" && payment.validUntil < now) {
      await prisma.feePayment.update({
        where: { id },
        data: { status: "EXPIRED" },
      });
      payment.status = "EXPIRED";
    }

    return NextResponse.json({ payment });
  } catch (error) {
    console.error("GET /api/fees/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment" },
      { status: 500 }
    );
  }
}

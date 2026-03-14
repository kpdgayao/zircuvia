import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isMockMode } from "@/lib/xendit";
import { FEE_VALIDITY_DAYS } from "@/lib/fee-constants";

export async function POST(req: NextRequest) {
  if (!isMockMode()) {
    return NextResponse.json({ error: "Mock mode only" }, { status: 403 });
  }

  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role !== "TOURIST") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { referenceId } = await req.json();

    if (!referenceId) {
      return NextResponse.json(
        { error: "Missing referenceId" },
        { status: 400 }
      );
    }

    const payment = await prisma.feePayment.findUnique({
      where: { referenceId },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    // Ownership check — tourist can only confirm their own payments
    if (payment.userId !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Already confirmed — idempotent
    if (payment.status === "ACTIVE") {
      return NextResponse.json({ message: "Payment already confirmed" });
    }

    const paidAt = new Date();
    const validUntil = new Date(
      paidAt.getTime() + FEE_VALIDITY_DAYS * 24 * 60 * 60 * 1000
    );

    await prisma.feePayment.update({
      where: { referenceId },
      data: {
        status: "ACTIVE",
        paidAt,
        validUntil,
        xenditPaymentId: `mock_${referenceId}`,
        xenditStatus: "PAID",
      },
    });

    return NextResponse.json({ message: "Payment confirmed (mock)" });
  } catch (error) {
    console.error("Mock confirm error:", error);
    return NextResponse.json(
      { error: "Confirmation failed" },
      { status: 500 }
    );
  }
}

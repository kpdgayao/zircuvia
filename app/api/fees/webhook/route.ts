import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookToken } from "@/lib/xendit";
import { FEE_VALIDITY_DAYS } from "@/lib/fee-constants";

export async function POST(req: NextRequest) {
  try {
    const callbackToken = req.headers.get("x-callback-token");
    if (!verifyWebhookToken(callbackToken)) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const body = await req.json();
    const { external_id, status, id: xenditPaymentId } = body;

    if (!external_id) {
      return NextResponse.json(
        { error: "Missing external_id" },
        { status: 400 }
      );
    }

    // Only process PAID status
    if (status !== "PAID") {
      // For non-PAID statuses, update xendit info but don't activate
      const payment = await prisma.feePayment.findUnique({
        where: { referenceId: external_id },
      });

      if (payment && payment.status === "PENDING") {
        if (status === "EXPIRED" || status === "FAILED") {
          await prisma.feePayment.update({
            where: { referenceId: external_id },
            data: {
              status: status === "EXPIRED" ? "EXPIRED" : "FAILED",
              xenditPaymentId: xenditPaymentId ?? null,
              xenditStatus: status,
            },
          });
        }
      }

      return NextResponse.json({ message: "Webhook received" });
    }

    // PAID flow — idempotent check
    const payment = await prisma.feePayment.findUnique({
      where: { referenceId: external_id },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    // Already processed — idempotent
    if (payment.status === "ACTIVE") {
      return NextResponse.json({ message: "Already processed" });
    }

    const paidAt = new Date();
    const validUntil = new Date(
      paidAt.getTime() + FEE_VALIDITY_DAYS * 24 * 60 * 60 * 1000
    );

    await prisma.feePayment.update({
      where: { referenceId: external_id },
      data: {
        status: "ACTIVE",
        paidAt,
        validUntil,
        xenditPaymentId: xenditPaymentId ?? null,
        xenditStatus: status,
      },
    });

    return NextResponse.json({ message: "Payment confirmed" });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

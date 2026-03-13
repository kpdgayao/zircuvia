import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { feePaymentSchema } from "@/lib/validations";
import { FEE_PRICES } from "@/lib/fee-constants";
import { generateReferenceId } from "@/lib/utils";
import { createPaymentInvoice } from "@/lib/xendit";
import { z } from "zod";

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(["TOURIST"]);
    const body = await req.json();
    const { lines } = feePaymentSchema.parse(body);

    const activeLines = lines.filter((l) => l.quantity > 0);
    if (activeLines.length === 0) {
      return NextResponse.json(
        { error: "At least one person required" },
        { status: 400 }
      );
    }

    let totalAmount = 0;
    let totalPersons = 0;
    const lineData = activeLines.map((line) => {
      const unitPrice = FEE_PRICES[line.payerType as keyof typeof FEE_PRICES];
      const lineTotal = unitPrice * line.quantity;
      totalAmount += lineTotal;
      totalPersons += line.quantity;
      return {
        payerType: line.payerType,
        quantity: line.quantity,
        unitPrice,
        lineTotal,
      };
    });

    const referenceId = generateReferenceId();
    // validUntil is a placeholder — the real value is set by the webhook when payment is confirmed
    const validUntil = new Date(0);

    const payment = await prisma.feePayment.create({
      data: {
        userId: session.userId,
        referenceId,
        totalPersons,
        totalAmount,
        validUntil,
        lines: {
          create: lineData.map((l) => ({
            payerType: l.payerType as "REGULAR_TOURIST" | "PALAWENO" | "STUDENT" | "SENIOR_CITIZEN" | "PWD",
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            lineTotal: l.lineTotal,
          })),
        },
      },
    });

    const invoice = await createPaymentInvoice({
      externalId: referenceId,
      amount: totalAmount,
      payerEmail: session.email,
      description: `Environmental Fee - ${totalPersons} person(s)`,
    });

    // Extract checkout URL — mock returns invoice_url, real SDK may use invoiceUrl
    const invoiceResult = invoice as Record<string, unknown>;
    const checkoutUrl =
      invoiceResult.invoice_url ?? invoiceResult.invoiceUrl ?? invoice;

    return NextResponse.json({
      paymentId: payment.id,
      referenceId,
      checkoutUrl,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Create fee error:", error);
    return NextResponse.json(
      { error: "Payment creation failed" },
      { status: 500 }
    );
  }
}

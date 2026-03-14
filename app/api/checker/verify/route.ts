import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role !== "VERIFIER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { feePaymentId } = await req.json();

    const payment = await prisma.feePayment.findUnique({
      where: { id: feePaymentId },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }
    if (payment.status !== "ACTIVE") {
      return NextResponse.json({ error: "Payment is not active" }, { status: 400 });
    }
    if (new Date() > payment.validUntil) {
      return NextResponse.json({ error: "Payment has expired" }, { status: 400 });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const existingCheckIn = await prisma.checkIn.findFirst({
      where: {
        feePaymentId,
        verifiedAt: { gte: todayStart, lte: todayEnd },
      },
    });

    if (existingCheckIn) {
      return NextResponse.json({ error: "Already checked in today" }, { status: 409 });
    }

    const verifierProfile = await prisma.verifierProfile.findUnique({
      where: { userId: session.userId },
    });

    if (!verifierProfile) {
      return NextResponse.json({ error: "Verifier profile not found" }, { status: 400 });
    }

    await prisma.checkIn.create({
      data: {
        feePaymentId,
        verifierId: verifierProfile.id,
        totalPersons: payment.totalPersons,
      },
    });

    return NextResponse.json({ message: "Payment verified successfully" });
  } catch (error) {
    console.error("Verify error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}

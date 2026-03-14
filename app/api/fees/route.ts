import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role !== "TOURIST") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const payments = await prisma.feePayment.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      include: { lines: true },
    });

    // Auto-expire: if validUntil < now and status is ACTIVE, update to EXPIRED
    const now = new Date();
    const expiredIds: string[] = [];

    for (const payment of payments) {
      if (payment.status === "ACTIVE" && payment.validUntil < now) {
        expiredIds.push(payment.id);
        payment.status = "EXPIRED";
      }
    }

    // Batch update expired payments
    if (expiredIds.length > 0) {
      await prisma.feePayment.updateMany({
        where: { id: { in: expiredIds } },
        data: { status: "EXPIRED" },
      });
    }

    return NextResponse.json({ payments });
  } catch (error) {
    console.error("GET /api/fees error:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}

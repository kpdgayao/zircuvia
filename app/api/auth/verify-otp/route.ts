import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, setSessionCookie } from "@/lib/auth";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, code } = body as { userId?: string; code?: string };

    if (!userId || !code) {
      return NextResponse.json({ message: "userId and code are required" }, { status: 400 });
    }

    const now = new Date();

    // Check if there's an expired code first (for better error messaging)
    const expiredCode = await prisma.verificationCode.findFirst({
      where: {
        userId,
        type: "SIGNUP",
        usedAt: null,
        code,
        expiresAt: { lt: now },
      },
    });

    if (expiredCode) {
      return NextResponse.json(
        { message: "Code expired. Please request a new one." },
        { status: 410 }
      );
    }

    // Find a valid, unused, non-expired code for this user
    const verification = await prisma.verificationCode.findFirst({
      where: {
        userId,
        type: "SIGNUP",
        usedAt: null,
        code,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!verification) {
      return NextResponse.json({ message: "Invalid verification code" }, { status: 401 });
    }

    // Mark code as used and verify user in a transaction
    const user = await prisma.$transaction(async (tx) => {
      await tx.verificationCode.update({
        where: { id: verification.id },
        data: { usedAt: new Date() },
      });

      return tx.user.update({
        where: { id: userId },
        data: { emailVerified: true },
      });
    });

    const token = await createSession({
      userId: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
    });

    await setSessionCookie(token);

    // Send welcome email (fire-and-forget)
    sendWelcomeEmail(user.email, user.firstName).catch((err) =>
      console.error("[welcome-email]", err)
    );

    return NextResponse.json({ redirectTo: "/" });
  } catch (err) {
    console.error("[verify-otp]", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

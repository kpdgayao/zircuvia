import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, setSessionCookie } from "@/lib/auth";

const SIMULATED_OTP = "123456";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, code } = body as { userId?: string; code?: string };

    if (!userId || !code) {
      return NextResponse.json({ message: "userId and code are required" }, { status: 400 });
    }

    if (code !== SIMULATED_OTP) {
      return NextResponse.json({ message: "Invalid verification code" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });

    const token = await createSession({
      userId: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
    });

    await setSessionCookie(token);

    return NextResponse.json({ redirectTo: "/" });
  } catch (err) {
    console.error("[verify-otp]", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

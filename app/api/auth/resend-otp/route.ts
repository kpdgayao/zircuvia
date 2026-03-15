import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendOtpEmail, sendPasswordResetEmail } from "@/lib/email";

const schema = z.object({
  email: z.string().email("Invalid email"),
  type: z.enum(["SIGNUP", "PASSWORD_RESET"]),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, type } = schema.parse(body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Generic success to prevent enumeration
      return NextResponse.json({ message: "If an account exists, a new code has been sent.", mock: false });
    }

    // Don't issue new SIGNUP codes to already-verified users
    if (type === "SIGNUP" && user.emailVerified) {
      return NextResponse.json({ message: "Account already verified." }, { status: 400 });
    }

    // Invalidate previous unused codes
    await prisma.verificationCode.updateMany({
      where: { userId: user.id, type, usedAt: null },
      data: { usedAt: new Date() },
    });

    const code = String(randomInt(100000, 999999));
    await prisma.verificationCode.create({
      data: {
        userId: user.id,
        email: user.email,
        code,
        type,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    const result =
      type === "SIGNUP"
        ? await sendOtpEmail(user.email, code, user.firstName)
        : await sendPasswordResetEmail(user.email, code, user.firstName);

    return NextResponse.json({
      message: "A new code has been sent.",
      mock: result.mock,
      ...(result.mock ? { code } : {}),
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation failed", errors: err.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error("[resend-otp]", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

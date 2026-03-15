import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail, isEmailConfigured } from "@/lib/email";

const schema = z.object({
  email: z.string().email("Invalid email"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = schema.parse(body);

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        message: "If an account exists, a code has been sent.",
        mock: !isEmailConfigured(),
      });
    }

    // Invalidate previous unused codes
    await prisma.verificationCode.updateMany({
      where: { userId: user.id, type: "PASSWORD_RESET", usedAt: null },
      data: { usedAt: new Date() },
    });

    const code = String(randomInt(100000, 999999));
    await prisma.verificationCode.create({
      data: {
        userId: user.id,
        email: user.email,
        code,
        type: "PASSWORD_RESET",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    const result = await sendPasswordResetEmail(user.email, code, user.firstName);

    return NextResponse.json({
      message: "If an account exists, a code has been sent.",
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
    console.error("[forgot-password]", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

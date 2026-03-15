import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { emailSchema } from "@/lib/validations";
import { sendPasswordResetEmail, isEmailConfigured, createVerificationCode } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = emailSchema.parse(body);

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        message: "If an account exists, a code has been sent.",
        mock: !isEmailConfigured(),
      });
    }

    const code = await createVerificationCode(user.id, user.email, "PASSWORD_RESET", { invalidateExisting: true });

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

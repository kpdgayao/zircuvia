import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { passwordSchema } from "@/lib/validations";
import { sendPasswordChangedEmail } from "@/lib/email";

const resetSchema = z.object({
  email: z.string().email("Invalid email"),
  code: z.string().min(1, "Code is required"),
  newPassword: passwordSchema,
});

const forcedSchema = z.object({
  newPassword: passwordSchema,
  forced: z.literal(true),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // --- Forced password change (authenticated user) ---
    const forcedParse = forcedSchema.safeParse(body);
    if (forcedParse.success) {
      const session = await getSession();
      if (!session) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }

      const user = await prisma.user.findUnique({ where: { id: session.userId } });
      if (!user) {
        return NextResponse.json({ message: "User not found" }, { status: 404 });
      }

      const passwordHash = await bcrypt.hash(forcedParse.data.newPassword, 12);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, mustChangePassword: false },
      });

      // Fire-and-forget
      sendPasswordChangedEmail(user.email, user.firstName).catch((err) =>
        console.error("[password-changed-email]", err)
      );

      const redirectTo = user.role === "VERIFIER" ? "/checker-login" : "/login";
      return NextResponse.json({ message: "Password updated successfully", redirectTo });
    }

    // --- Normal password reset (with OTP code) ---
    const data = resetSchema.parse(body);

    const verification = await prisma.verificationCode.findFirst({
      where: {
        email: data.email,
        code: data.code,
        type: "PASSWORD_RESET",
        usedAt: null,
      },
      include: { user: true },
      orderBy: { createdAt: "desc" },
    });

    if (!verification) {
      return NextResponse.json({ message: "Invalid verification code" }, { status: 401 });
    }

    if (verification.expiresAt < new Date()) {
      return NextResponse.json(
        { message: "Code expired. Please request a new one." },
        { status: 410 }
      );
    }

    const user = verification.user;

    const passwordHash = await bcrypt.hash(data.newPassword, 12);

    await prisma.$transaction(async (tx) => {
      await tx.verificationCode.update({
        where: { id: verification.id },
        data: { usedAt: new Date() },
      });

      await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          ...(user.mustChangePassword ? { mustChangePassword: false } : {}),
        },
      });
    });

    // Fire-and-forget
    sendPasswordChangedEmail(user.email, user.firstName).catch((err) =>
      console.error("[password-changed-email]", err)
    );

    return NextResponse.json({ message: "Password reset successful" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation failed", errors: err.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error("[reset-password]", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

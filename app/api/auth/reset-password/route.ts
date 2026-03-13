import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { passwordSchema } from "@/lib/validations";

const SIMULATED_OTP = "123456";

const resetSchema = z.object({
  email: z.string().email("Invalid email"),
  code: z.string().min(1, "Code is required"),
  newPassword: passwordSchema,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = resetSchema.parse(body);

    if (data.code !== SIMULATED_OTP) {
      return NextResponse.json({ message: "Invalid verification code" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      return NextResponse.json({ message: "No account found with this email" }, { status: 404 });
    }

    const passwordHash = await bcrypt.hash(data.newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        ...(user.mustChangePassword ? { mustChangePassword: false } : {}),
      },
    });

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

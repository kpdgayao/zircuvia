import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations";
import { sendOtpEmail, createVerificationCode } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);

    const [existing, passwordHash] = await Promise.all([
      prisma.user.findUnique({ where: { email: data.email } }),
      bcrypt.hash(data.password, 12),
    ]);

    if (existing) {
      return NextResponse.json(
        { message: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: "TOURIST",
      },
    });

    const code = await createVerificationCode(user.id, data.email, "SIGNUP");

    const result = await sendOtpEmail(data.email, code, data.firstName);

    return NextResponse.json(
      {
        message: "Registration successful. Please verify your email.",
        userId: user.id,
        mock: result.mock,
        ...(result.mock ? { code } : {}),
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation failed", errors: err.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error("[register]", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

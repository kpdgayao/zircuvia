import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations";
import { createSession, setSessionCookie } from "@/lib/auth";

const ROLE_REDIRECTS: Record<string, string> = {
  TOURIST: "/",
  ADMIN: "/admin",
  VERIFIER: "/checker/verify",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = loginSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 });
    }

    const passwordMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!passwordMatch) {
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 });
    }

    const token = await createSession({
      userId: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
    });

    await setSessionCookie(token);

    if (user.mustChangePassword) {
      return NextResponse.json({ redirectTo: "/reset-password?forced=true" });
    }

    const redirectTo = ROLE_REDIRECTS[user.role] ?? "/";
    return NextResponse.json({ redirectTo });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation failed", errors: err.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error("[login]", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ user: null });
    }

    const baseSelect = {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      avatarUrl: true,
      emailVerified: true,
    } as const;

    if (session.role === "ADMIN") {
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: {
          ...baseSelect,
          adminAccess: true,
        },
      });
      return NextResponse.json({ user });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: baseSelect,
    });

    return NextResponse.json({ user });
  } catch (err) {
    console.error("[me]", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

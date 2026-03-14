import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSystemLog } from "@/lib/system-log";
import { z } from "zod";
import bcrypt from "bcryptjs";

const createVerifierSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  assignedLocationId: z.string().optional(),
});

// GET /api/admin/verifiers — list all verifiers
export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminAccess = await prisma.adminAccess.findUnique({
      where: { userId: session.userId },
    });
    if (!adminAccess?.settings) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const verifiers = await prisma.user.findMany({
      where: { role: "VERIFIER" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        createdAt: true,
        verifierProfile: {
          include: {
            assignedLocation: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ verifiers });
  } catch (error) {
    console.error("GET /api/admin/verifiers error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/verifiers — invite a new verifier
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminAccess = await prisma.adminAccess.findUnique({
      where: { userId: session.userId },
    });
    if (!adminAccess?.settings) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const data = createVerifierSchema.parse(body);

    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash("Welcome2026!", 12);

    const user = await prisma.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        passwordHash,
        role: "VERIFIER",
        mustChangePassword: true,
        emailVerified: true,
        verifierProfile: {
          create: {
            assignedLocationId: data.assignedLocationId ?? null,
          },
        },
      },
      include: {
        verifierProfile: {
          include: {
            assignedLocation: { select: { id: true, name: true } },
          },
        },
      },
    });

    await createSystemLog({
      action: "VERIFIER_CREATED",
      description: `Verifier "${user.firstName} ${user.lastName}" (${user.email}) created`,
      userId: session.userId,
      targetType: "User",
      targetId: user.id,
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("POST /api/admin/verifiers error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

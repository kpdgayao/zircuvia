import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSystemLog } from "@/lib/system-log";
import { z } from "zod";

const updateVerifierSchema = z.object({
  assignedLocationId: z.string().nullable(),
});

// PUT /api/admin/verifiers/[id] — update verifier assignment
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: { verifierProfile: true },
    });
    if (!user || user.role !== "VERIFIER") {
      return NextResponse.json({ error: "Verifier not found" }, { status: 404 });
    }

    const body = await request.json();
    const data = updateVerifierSchema.parse(body);

    if (user.verifierProfile) {
      await prisma.verifierProfile.update({
        where: { userId: id },
        data: {
          assignedLocationId: data.assignedLocationId,
        },
      });
    } else {
      await prisma.verifierProfile.create({
        data: {
          userId: id,
          assignedLocationId: data.assignedLocationId,
        },
      });
    }

    await createSystemLog({
      action: "VERIFIER_UPDATED",
      description: `Verifier "${user.firstName} ${user.lastName}" assignment updated`,
      userId: session.userId,
      targetType: "User",
      targetId: id,
    });

    return NextResponse.json({ message: "Verifier updated" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("PUT /api/admin/verifiers/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/verifiers/[id] — remove verifier
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: { verifierProfile: true },
    });
    if (!user || user.role !== "VERIFIER") {
      return NextResponse.json({ error: "Verifier not found" }, { status: 404 });
    }

    // Delete check-ins, then verifier profile, then user
    if (user.verifierProfile) {
      await prisma.checkIn.deleteMany({ where: { verifierId: user.verifierProfile.id } });
      await prisma.verifierProfile.delete({ where: { userId: id } });
    }
    await prisma.user.delete({ where: { id } });

    await createSystemLog({
      action: "VERIFIER_DELETED",
      description: `Verifier "${user.firstName} ${user.lastName}" (${user.email}) deleted`,
      userId: session.userId,
      targetType: "User",
      targetId: id,
    });

    return NextResponse.json({ message: "Verifier deleted" });
  } catch (error) {
    console.error("DELETE /api/admin/verifiers/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

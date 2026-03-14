import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSystemLog } from "@/lib/system-log";
import { z } from "zod";

const updatePermissionsSchema = z.object({
  permissions: z.object({
    businessManagement: z.boolean(),
    ecoBusinessProcessing: z.boolean(),
    environmentalFees: z.boolean(),
    visitorStats: z.boolean(),
    eventsAndPromos: z.boolean(),
    systemLogs: z.boolean(),
    settings: z.boolean(),
  }),
});

// PUT /api/admin/users/[id] — update admin permissions
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
      include: { adminAccess: true },
    });
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin user not found" }, { status: 404 });
    }

    const body = await request.json();
    const data = updatePermissionsSchema.parse(body);

    if (user.adminAccess) {
      await prisma.adminAccess.update({
        where: { userId: id },
        data: {
          businessManagement: data.permissions.businessManagement,
          ecoBusinessProcessing: data.permissions.ecoBusinessProcessing,
          environmentalFees: data.permissions.environmentalFees,
          visitorStats: data.permissions.visitorStats,
          eventsAndPromos: data.permissions.eventsAndPromos,
          systemLogs: data.permissions.systemLogs,
          settings: data.permissions.settings,
        },
      });
    } else {
      await prisma.adminAccess.create({
        data: {
          userId: id,
          ...data.permissions,
        },
      });
    }

    await createSystemLog({
      action: "ADMIN_PERMISSIONS_UPDATED",
      description: `Permissions updated for "${user.firstName} ${user.lastName}"`,
      userId: session.userId,
      targetType: "User",
      targetId: id,
    });

    return NextResponse.json({ message: "Permissions updated" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("PUT /api/admin/users/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[id] — remove admin user
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

    // Prevent self-deletion
    if (id === session.userId) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: { adminAccess: true },
    });
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin user not found" }, { status: 404 });
    }

    // Delete admin access first, then user
    if (user.adminAccess) {
      await prisma.adminAccess.delete({ where: { userId: id } });
    }
    await prisma.user.delete({ where: { id } });

    await createSystemLog({
      action: "ADMIN_DELETED",
      description: `Admin "${user.firstName} ${user.lastName}" (${user.email}) deleted`,
      userId: session.userId,
      targetType: "User",
      targetId: id,
    });

    return NextResponse.json({ message: "Admin deleted" });
  } catch (error) {
    console.error("DELETE /api/admin/users/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

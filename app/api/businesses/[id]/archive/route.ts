import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSystemLog } from "@/lib/system-log";

// PATCH /api/businesses/[id]/archive — toggle isArchived
export async function PATCH(
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
    if (!adminAccess?.businessManagement) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.business.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    const business = await prisma.business.update({
      where: { id },
      data: { isArchived: !existing.isArchived },
    });

    await createSystemLog({
      action: business.isArchived ? "BUSINESS_ARCHIVED" : "BUSINESS_UNARCHIVED",
      description: `Business "${business.name}" ${business.isArchived ? "archived" : "unarchived"}`,
      userId: session.userId,
      targetType: "Business",
      targetId: business.id,
    });

    return NextResponse.json({ isArchived: business.isArchived });
  } catch (error) {
    console.error("PATCH /api/businesses/[id]/archive error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

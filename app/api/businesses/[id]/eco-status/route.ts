import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSystemLog } from "@/lib/system-log";
import { z } from "zod";

const ecoStatusSchema = z.object({
  status: z.enum(["APPROVED", "REVOKED", "PENDING"]),
});

// PATCH /api/businesses/[id]/eco-status
export async function PATCH(
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
    if (!adminAccess?.ecoBusinessProcessing) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.business.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    const body = await request.json();
    const { status } = ecoStatusSchema.parse(body);

    const isEcoCertified = status === "APPROVED";

    const business = await prisma.business.update({
      where: { id },
      data: {
        ecoStatus: status,
        isEcoCertified,
      },
    });

    await createSystemLog({
      action: `ECO_STATUS_${status}`,
      description: `Eco status for "${business.name}" changed to ${status}`,
      userId: session.userId,
      targetType: "Business",
      targetId: business.id,
    });

    return NextResponse.json({ business });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("PATCH /api/businesses/[id]/eco-status error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

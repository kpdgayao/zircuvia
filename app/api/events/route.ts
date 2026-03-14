import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSystemLog } from "@/lib/system-log";
import { z } from "zod";

const eventSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  location: z.string().max(255).optional(),
  coverPhotoUrl: z.string().url().optional().or(z.literal("")),
  isPromo: z.boolean().default(false),
  businessId: z.string().optional(),
});

// GET /api/events — public, returns upcoming events
export async function GET() {
  try {
    const events = await prisma.event.findMany({
      where: {
        startDate: { gte: new Date() },
      },
      orderBy: { startDate: "asc" },
      include: {
        business: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ events });
  } catch (error) {
    console.error("GET /api/events error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/events — ADMIN with eventsAndPromos permission
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminAccess = await prisma.adminAccess.findUnique({
      where: { userId: session.userId },
    });
    if (!adminAccess?.eventsAndPromos) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const data = eventSchema.parse(body);

    const event = await prisma.event.create({
      data: {
        title: data.title,
        description: data.description ?? null,
        startDate: data.startDate,
        endDate: data.endDate ?? null,
        location: data.location ?? null,
        coverPhotoUrl: data.coverPhotoUrl || null,
        isPromo: data.isPromo,
        businessId: data.businessId ?? null,
      },
    });

    await createSystemLog({
      action: "EVENT_CREATED",
      description: `Event "${event.title}" created`,
      userId: session.userId,
      targetType: "Event",
      targetId: event.id,
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("POST /api/events error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

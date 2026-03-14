import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSystemLog } from "@/lib/system-log";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { DEFAULT_TEMP_PASSWORD } from "@/lib/business-constants";

const createAdminSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  permissions: z.object({
    businessManagement: z.boolean().default(false),
    ecoBusinessProcessing: z.boolean().default(false),
    environmentalFees: z.boolean().default(false),
    visitorStats: z.boolean().default(false),
    eventsAndPromos: z.boolean().default(false),
    systemLogs: z.boolean().default(false),
    settings: z.boolean().default(false),
  }),
});

// GET /api/admin/users — list all admin users
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

    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        createdAt: true,
        adminAccess: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ admins });
  } catch (error) {
    console.error("GET /api/admin/users error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/users — invite a new admin
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
    const data = createAdminSchema.parse(body);

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

    const passwordHash = await bcrypt.hash(DEFAULT_TEMP_PASSWORD, 12);

    const user = await prisma.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        passwordHash,
        role: "ADMIN",
        mustChangePassword: true,
        emailVerified: true,
        adminAccess: {
          create: {
            businessManagement: data.permissions.businessManagement,
            ecoBusinessProcessing: data.permissions.ecoBusinessProcessing,
            environmentalFees: data.permissions.environmentalFees,
            visitorStats: data.permissions.visitorStats,
            eventsAndPromos: data.permissions.eventsAndPromos,
            systemLogs: data.permissions.systemLogs,
            settings: data.permissions.settings,
          },
        },
      },
      include: { adminAccess: true },
    });

    await createSystemLog({
      action: "ADMIN_CREATED",
      description: `Admin "${user.firstName} ${user.lastName}" (${user.email}) created`,
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
    console.error("POST /api/admin/users error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

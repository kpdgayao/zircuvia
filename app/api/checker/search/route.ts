import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    await requireRole(["VERIFIER"]);
    const q = req.nextUrl.searchParams.get("q")?.trim();
    if (!q) return NextResponse.json({ results: [] });

    const results = await prisma.feePayment.findMany({
      where: {
        OR: [
          { referenceId: q },
          { user: { firstName: { contains: q, mode: "insensitive" } } },
          { user: { lastName: { contains: q, mode: "insensitive" } } },
        ],
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
        lines: true,
        checkIns: { select: { verifiedAt: true } },
      },
      take: 10,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Checker search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}

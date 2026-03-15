import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseDateRangeFilter } from "@/lib/utils";
import type { Prisma, Role } from "@prisma/client";

interface ResponseItem {
  questionId: string;
  questionText: string;
  type: string;
  value: string | number | string[];
}

function escapeCsv(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const exportType = searchParams.get("type") || "raw";
    const roleFilter = searchParams.get("role") as Role | null;
    const triggerPointFilter = searchParams.get("triggerPoint");
    const dateFilter = parseDateRangeFilter(
      searchParams.get("from"),
      searchParams.get("to")
    );

    const where: Prisma.SurveyResponseWhereInput = {
      ...(roleFilter && { role: roleFilter }),
      ...(triggerPointFilter && { triggerPoint: triggerPointFilter }),
      ...(dateFilter && { createdAt: dateFilter }),
    };

    const responses = await prisma.surveyResponse.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 10000,
    });

    let csvContent: string;
    const dateStr = new Date().toISOString().slice(0, 10);

    if (exportType === "summary") {
      // Summary export
      const byRole: Record<string, number> = {};
      const ratingsByTrigger: Record<string, { sum: number; count: number }> = {};
      const npsScores: number[] = [];

      for (const r of responses) {
        byRole[r.role] = (byRole[r.role] ?? 0) + 1;
        const items = r.responses as unknown as ResponseItem[];
        if (!Array.isArray(items)) continue;
        for (const item of items) {
          if ((item.type === "rating" || item.type === "likert") && typeof item.value === "number") {
            if (!ratingsByTrigger[r.triggerPoint]) ratingsByTrigger[r.triggerPoint] = { sum: 0, count: 0 };
            ratingsByTrigger[r.triggerPoint].sum += item.value;
            ratingsByTrigger[r.triggerPoint].count += 1;
          }
          if (item.questionId === "nps" && typeof item.value === "number") {
            npsScores.push(item.value);
          }
        }
      }

      const promoters = npsScores.filter((s) => s >= 9).length;
      const detractors = npsScores.filter((s) => s <= 6).length;
      const nps = npsScores.length > 0 ? Math.round(((promoters - detractors) / npsScores.length) * 100) : 0;

      const rows = [
        ["Metric", "Value"],
        ["Total Responses", String(responses.length)],
        ["NPS Score", String(nps)],
        ...Object.entries(byRole).map(([role, count]) => [`Responses (${role})`, String(count)]),
        ...Object.entries(ratingsByTrigger).map(([trigger, data]) => [
          `Avg Rating (${trigger})`,
          (data.sum / data.count).toFixed(1),
        ]),
      ];
      csvContent = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
    } else {
      // Raw export
      const headers = ["Timestamp", "Role", "Participant", "Survey Type", "Trigger Point", "Question", "Type", "Answer"];
      const rows: string[][] = [];

      for (const r of responses) {
        const items = r.responses as unknown as ResponseItem[];
        if (!Array.isArray(items)) continue;
        for (const item of items) {
          rows.push([
            new Date(r.createdAt).toISOString(),
            r.role,
            r.participantName || "",
            r.surveyType,
            r.triggerPoint,
            item.questionText,
            item.type,
            Array.isArray(item.value) ? item.value.join("; ") : String(item.value),
          ]);
        }
      }

      csvContent = [
        headers.map(escapeCsv).join(","),
        ...rows.map((row) => row.map(escapeCsv).join(",")),
      ].join("\n");
    }

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="feedback-${exportType}-${dateStr}.csv"`,
      },
    });
  } catch (error) {
    console.error("GET /api/export/feedback error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

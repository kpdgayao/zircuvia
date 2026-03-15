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

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const roleFilter = searchParams.get("role") as Role | null;
    const surveyTypeFilter = searchParams.get("surveyType");
    const triggerPointFilter = searchParams.get("triggerPoint");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const dateFilter = parseDateRangeFilter(
      searchParams.get("from"),
      searchParams.get("to")
    );

    const where: Prisma.SurveyResponseWhereInput = {
      ...(roleFilter && { role: roleFilter }),
      ...(surveyTypeFilter && { surveyType: surveyTypeFilter }),
      ...(triggerPointFilter && { triggerPoint: triggerPointFilter }),
      ...(dateFilter && { createdAt: dateFilter }),
    };

    const [totalCount, responses, allForAggregation] = await Promise.all([
      prisma.surveyResponse.count({ where }),
      prisma.surveyResponse.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.surveyResponse.findMany({
        where,
        select: { role: true, surveyType: true, triggerPoint: true, responses: true },
      }),
    ]);

    // Compute aggregations
    const byRole: Record<string, number> = {};
    const bySurveyType: Record<string, number> = {};
    const ratingsByTrigger: Record<string, { sum: number; count: number }> = {};
    const npsScores: number[] = [];

    for (const r of allForAggregation) {
      byRole[r.role] = (byRole[r.role] ?? 0) + 1;
      bySurveyType[r.surveyType] = (bySurveyType[r.surveyType] ?? 0) + 1;

      const items = r.responses as unknown as ResponseItem[];
      if (!Array.isArray(items)) continue;

      for (const item of items) {
        if (
          (item.type === "rating" || item.type === "likert") &&
          typeof item.value === "number"
        ) {
          if (!ratingsByTrigger[r.triggerPoint]) {
            ratingsByTrigger[r.triggerPoint] = { sum: 0, count: 0 };
          }
          ratingsByTrigger[r.triggerPoint].sum += item.value;
          ratingsByTrigger[r.triggerPoint].count += 1;
        }
        if (item.questionId === "nps" && typeof item.value === "number") {
          npsScores.push(item.value);
        }
      }
    }

    const averageRatings: Record<string, { avg: number; count: number }> = {};
    for (const [trigger, data] of Object.entries(ratingsByTrigger)) {
      averageRatings[trigger] = {
        avg: Math.round((data.sum / data.count) * 10) / 10,
        count: data.count,
      };
    }

    // NPS = (promoters - detractors) / total * 100
    let npsScore = 0;
    if (npsScores.length > 0) {
      const promoters = npsScores.filter((s) => s >= 9).length;
      const detractors = npsScores.filter((s) => s <= 6).length;
      npsScore = Math.round(
        ((promoters - detractors) / npsScores.length) * 100
      );
    }

    return NextResponse.json({
      summary: {
        totalResponses: totalCount,
        byRole,
        bySurveyType,
        averageRatings,
        npsScore,
      },
      responses,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/admin/feedback error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

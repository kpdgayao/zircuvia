import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { surveyFeedbackSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = surveyFeedbackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { surveyType, triggerPoint, participantName, responses } = parsed.data;

    const surveyResponse = await prisma.surveyResponse.create({
      data: {
        userId: session.userId,
        role: session.role,
        surveyType,
        triggerPoint,
        participantName: participantName || null,
        responses,
      },
    });

    return NextResponse.json({ success: true, id: surveyResponse.id });
  } catch (error) {
    console.error("POST /api/feedback error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

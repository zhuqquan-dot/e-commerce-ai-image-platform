import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/auth/api-guard";
import { PerformanceFeedbackService } from "@/intelligence/performance-feedback-service";

const service = new PerformanceFeedbackService();

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const exportPackId = searchParams.get("exportPackId");
    if (!exportPackId) {
      return NextResponse.json({ error: "exportPackId 必填" }, { status: 400 });
    }

    const result = await service.getFeedbackByExportPack(exportPackId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "获取反馈失败", message: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await service.recordFeedback(body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "记录反馈失败", message: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export const GET = requireAuth(handleGET);
export const POST = requireAuth(handlePOST);

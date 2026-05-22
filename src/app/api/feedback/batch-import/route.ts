import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/auth/api-guard";
import { PerformanceFeedbackService } from "@/intelligence/performance-feedback-service";

const service = new PerformanceFeedbackService();

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workspaceId, csvText } = body;
    if (!workspaceId || !csvText) {
      return NextResponse.json(
        { error: "workspaceId 和 csvText 必填" },
        { status: 400 },
      );
    }

    const result = await service.batchImportCsv(workspaceId, csvText);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "批量导入失败", message: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export const POST = requireAuth(handlePOST);

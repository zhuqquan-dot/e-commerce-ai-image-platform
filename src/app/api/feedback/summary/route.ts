import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/auth/api-guard";
import { PerformanceFeedbackService } from "@/intelligence/performance-feedback-service";

const service = new PerformanceFeedbackService();

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    const groupBy = searchParams.get("groupBy") as "platform" | "category" | "brand" | null;

    if (!workspaceId || !groupBy) {
      return NextResponse.json(
        { error: "workspaceId 和 groupBy 必填" },
        { status: 400 },
      );
    }

    if (!["platform", "category", "brand"].includes(groupBy)) {
      return NextResponse.json(
        { error: "groupBy 必须为 platform、category 或 brand" },
        { status: 400 },
      );
    }

    const result = await service.getAggregatedStats(workspaceId, groupBy);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "获取汇总统计失败", message: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export const GET = requireAuth(handleGET);

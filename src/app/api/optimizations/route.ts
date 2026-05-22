import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/auth/api-guard";
import { OptimizationAssistant } from "@/intelligence/optimization-assistant";

const assistant = new OptimizationAssistant();

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    if (!projectId) {
      return NextResponse.json({ error: "projectId 必填" }, { status: 400 });
    }

    const [slotOptimizations, bundleGapSuggestions, retryPriority, complianceSuggestions] =
      await Promise.all([
        assistant.getSlotOptimizations(projectId),
        assistant.getBundleGapSuggestions(projectId),
        assistant.getRetryPriority(projectId),
        assistant.getComplianceSuggestions(projectId),
      ]);

    return NextResponse.json({
      slotOptimizations,
      bundleGapSuggestions,
      retryPriority,
      complianceSuggestions,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "获取优化建议失败", message: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export const GET = requireAuth(handleGET);

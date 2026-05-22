import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/auth/api-guard";
import { StrategySuggestionEngine } from "@/intelligence/strategy-suggestion-engine";

const engine = new StrategySuggestionEngine();

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    const platformId = searchParams.get("platformId");
    const category = searchParams.get("category") ?? "";

    if (!workspaceId || !platformId) {
      return NextResponse.json(
        { error: "workspaceId 和 platformId 必填" },
        { status: 400 },
      );
    }

    const [mainImageStrategy, slotPriority] = await Promise.all([
      engine.getMainImageStrategy(workspaceId, platformId, category),
      engine.getSlotPriority(workspaceId, platformId, category),
    ]);

    return NextResponse.json({ mainImageStrategy, slotPriority });
  } catch (error) {
    return NextResponse.json(
      { error: "获取策略建议失败", message: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export const GET = requireAuth(handleGET);

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/auth/api-guard";
import { RecommendationEngine } from "@/intelligence/recommendation-engine";

const engine = new RecommendationEngine();

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId 必填" }, { status: 400 });
    }
    const platformId = searchParams.get("platformId") ?? undefined;
    const category = searchParams.get("category") ?? undefined;
    const brandId = searchParams.get("brandId") ?? undefined;

    const result = await engine.getBundleRecommendations(
      workspaceId,
      platformId,
      category,
      brandId,
    );
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "获取推荐失败", message: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export const GET = requireAuth(handleGET);

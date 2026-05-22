import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/auth/api-guard";
import { RecommendationEngine } from "@/intelligence/recommendation-engine";

const engine = new RecommendationEngine();

async function handlePOST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await engine.adoptRecommendation(id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "采纳推荐失败", message: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export const POST = requireAuth(handlePOST);

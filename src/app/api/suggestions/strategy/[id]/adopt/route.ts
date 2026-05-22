import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/auth/api-guard";
import { StrategySuggestionEngine } from "@/intelligence/strategy-suggestion-engine";

const engine = new StrategySuggestionEngine();

async function handlePOST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await engine.adoptSuggestion(id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "采纳策略建议失败", message: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export const POST = requireAuth(handlePOST);

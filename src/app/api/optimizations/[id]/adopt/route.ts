import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/auth/api-guard";
import { OptimizationAssistant } from "@/intelligence/optimization-assistant";

const assistant = new OptimizationAssistant();

async function handlePOST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await assistant.adoptSuggestion(id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "采纳优化建议失败", message: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export const POST = requireAuth(handlePOST);

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/auth/api-guard";
import { ApiKeyService } from "@/ecosystem/api-key-service";

const apiKeyService = new ApiKeyService();

async function handleDELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; keyId: string }> }
) {
  try {
    const { keyId } = await params;
    await apiKeyService.deleteApiKey(keyId);
    return NextResponse.json({ success: true, message: "API Key 已删除" });
  } catch (error) {
    return NextResponse.json(
      { error: "删除 API Key 失败", message: String(error) },
      { status: 500 }
    );
  }
}

export const DELETE = requireAuth(handleDELETE);

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/auth/api-guard";
import { ApiKeyService } from "@/ecosystem/api-key-service";

const apiKeyService = new ApiKeyService();

async function handlePUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; keyId: string }> }
) {
  try {
    const { keyId } = await params;
    const result = await apiKeyService.disableApiKey(keyId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "禁用 API Key 失败", message: String(error) },
      { status: 500 }
    );
  }
}

export const PUT = requireAuth(handlePUT);

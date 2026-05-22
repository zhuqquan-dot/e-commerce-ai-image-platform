import { NextRequest, NextResponse } from "next/server";
import { ApiKeyService } from "./api-key-service";

const apiKeyService = new ApiKeyService();

export async function authenticateApiKey(
  request: NextRequest
): Promise<{ workspaceId: string; apiKeyId: string } | NextResponse> {
  const apiKey =
    request.nextUrl.searchParams.get("apiKey") ||
    request.headers.get("x-api-key");

  if (!apiKey) {
    return NextResponse.json(
      {
        error: "MISSING_API_KEY",
        message: "请提供 API Key（查询参数 apiKey 或请求头 x-api-key）",
      },
      { status: 401 }
    );
  }

  const result = await apiKeyService.validateApiKey(apiKey);

  if (!result.valid || !result.workspaceId || !result.apiKeyId) {
    return NextResponse.json(
      { error: "INVALID_API_KEY", message: "API Key 无效或已禁用" },
      { status: 401 }
    );
  }

  return { workspaceId: result.workspaceId, apiKeyId: result.apiKeyId };
}

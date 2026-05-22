import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/ecosystem/api-auth-middleware";
import { checkRateLimit } from "@/ecosystem/api-rate-limiter";
import { logApiCall } from "@/ecosystem/api-logger";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const authResult = await authenticateApiKey(request);
  if (authResult instanceof NextResponse) return authResult;
  const { workspaceId, apiKeyId } = authResult;

  const apiKey = await prisma.apiKey.findUnique({ where: { id: apiKeyId } });
  if (!apiKey) {
    return NextResponse.json({ error: "INVALID_API_KEY" }, { status: 401 });
  }

  const rateLimitResult = checkRateLimit(apiKeyId, apiKey.rateLimit);
  if (!rateLimitResult.allowed) {
    logApiCall({
      apiKeyId,
      endpoint: request.nextUrl.pathname,
      method: "GET",
      statusCode: 429,
    });
    return NextResponse.json(
      {
        error: "RATE_LIMIT_EXCEEDED",
        message: "请求频率超过限制（100次/分钟），请稍后重试",
      },
      { status: 429 }
    );
  }

  try {
    const exports = await prisma.exportPack.findMany({
      where: { project: { workspaceId } },
      select: {
        id: true,
        projectId: true,
        status: true,
        fileCount: true,
        fileUrl: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    logApiCall({
      apiKeyId,
      endpoint: request.nextUrl.pathname,
      method: "GET",
      statusCode: 200,
    });

    return NextResponse.json({ list: exports });
  } catch (error) {
    logApiCall({
      apiKeyId,
      endpoint: request.nextUrl.pathname,
      method: "GET",
      statusCode: 500,
    });
    return NextResponse.json(
      { error: "查询导出包列表失败", message: String(error) },
      { status: 500 }
    );
  }
}

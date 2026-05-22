import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/ecosystem/api-auth-middleware";
import { checkRateLimit } from "@/ecosystem/api-rate-limiter";
import { logApiCall } from "@/ecosystem/api-logger";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params;
    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project || project.workspaceId !== workspaceId) {
      logApiCall({
        apiKeyId,
        endpoint: request.nextUrl.pathname,
        method: "GET",
        statusCode: 404,
      });
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    const tasks = await prisma.generationTask.findMany({
      where: { projectId: id },
      select: {
        id: true,
        slotCode: true,
        status: true,
        creditCost: true,
        retryCount: true,
        manualRequired: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    logApiCall({
      apiKeyId,
      endpoint: request.nextUrl.pathname,
      method: "GET",
      statusCode: 200,
    });

    return NextResponse.json({ list: tasks });
  } catch (error) {
    logApiCall({
      apiKeyId,
      endpoint: request.nextUrl.pathname,
      method: "GET",
      statusCode: 500,
    });
    return NextResponse.json(
      { error: "查询任务列表失败", message: String(error) },
      { status: 500 }
    );
  }
}

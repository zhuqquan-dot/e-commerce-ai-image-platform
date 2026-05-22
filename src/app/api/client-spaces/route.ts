import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, getSessionFromRequest } from "@/auth/api-guard";
import { QuotaEngine } from "@/commerce/quota-engine";

const clientSpaceCreateSchema = z.object({
  clientName: z.string().min(1, "客户名称必填"),
  brandName: z.string().min(1, "品牌名称必填"),
  region: z.string().optional().default(""),
  defaultLanguage: z.string().optional().default("zh-CN"),
  targetMarkets: z.array(z.string()).optional().default([]),
});

function parseClientSpace<T extends Record<string, unknown>>(record: T): T {
  const parsed = { ...record };
  const value = parsed.targetMarkets as string | undefined;
  if (typeof value === "string") {
    try {
      (parsed as Record<string, unknown>).targetMarkets = JSON.parse(value);
    } catch {
      (parsed as Record<string, unknown>).targetMarkets = [];
    }
  }
  return parsed;
}

export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId") || session?.workspaceId || "default-workspace";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10))
    );

    const where: Record<string, unknown> = { workspaceId };

    const [list, total] = await Promise.all([
      prisma.clientSpace.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.clientSpace.count({ where }),
    ]);

    return NextResponse.json({
      list: list.map(parseClientSpace),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "查询客户空间失败", message: String(error) },
      { status: 500 }
    );
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    const quotaEngine = new QuotaEngine();
    const quotaCheck = await quotaEngine.checkClientSpaceQuota(session?.workspaceId || "default-workspace");
    if (!quotaCheck.allowed) {
      return NextResponse.json({ error: quotaCheck.reason }, { status: 403 });
    }
    const body = await request.json();
    const parsed = clientSpaceCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "校验失败", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { targetMarkets, ...rest } = parsed.data;

    const clientSpace = await prisma.clientSpace.create({
      data: {
        ...rest,
        workspaceId: session?.workspaceId || "default-workspace",
        targetMarkets: JSON.stringify(targetMarkets),
      },
    });

    return NextResponse.json(parseClientSpace(clientSpace), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "创建客户空间失败", message: String(error) },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(requireRole('owner', 'admin', 'operator')(handlePOST));

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, getSessionFromRequest } from "@/auth/api-guard";
import { QuotaEngine } from "@/commerce/quota-engine";

const brandPackCreateSchema = z.object({
  clientSpaceId: z.string().min(1, "clientSpaceId 必填"),
  brandName: z.string().min(1, "品牌名称必填"),
  brandPrimaryColor: z.string().optional().default(""),
  brandSecondaryColor: z.string().optional().default(""),
  brandFontPreference: z.string().optional().default(""),
  brandTone: z.string().optional().default(""),
  brandForbiddenWords: z.array(z.string()).optional().default([]),
  brandVisualBoundary: z.string().optional().default(""),
});

function parseBrandPack<T extends Record<string, unknown>>(record: T): T {
  const parsed = { ...record };
  const value = parsed.brandForbiddenWords as string | undefined;
  if (typeof value === "string") {
    try {
      (parsed as Record<string, unknown>).brandForbiddenWords = JSON.parse(value);
    } catch {
      (parsed as Record<string, unknown>).brandForbiddenWords = [];
    }
  }
  return parsed;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientSpaceId = searchParams.get("clientSpaceId");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10))
    );

    const where: Record<string, unknown> = {};
    if (clientSpaceId) {
      where.clientSpaceId = clientSpaceId;
    }

    const [list, total] = await Promise.all([
      prisma.brandPack.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.brandPack.count({ where }),
    ]);

    return NextResponse.json({
      list: list.map(parseBrandPack),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "查询品牌包失败", message: String(error) },
      { status: 500 }
    );
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    const quotaEngine = new QuotaEngine();
    const quotaCheck = await quotaEngine.checkBrandPackQuota(session?.workspaceId ?? "");
    if (!quotaCheck.allowed) {
      return NextResponse.json({ error: quotaCheck.reason }, { status: 403 });
    }
    const body = await request.json();
    const parsed = brandPackCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "校验失败", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { brandForbiddenWords, ...rest } = parsed.data;

    const existingClientSpace = await prisma.clientSpace.findUnique({
      where: { id: rest.clientSpaceId },
    });
    if (!existingClientSpace) {
      return NextResponse.json(
        { error: "指定的客户空间不存在" },
        { status: 400 }
      );
    }

    const brandPack = await prisma.brandPack.create({
      data: {
        ...rest,
        brandForbiddenWords: JSON.stringify(brandForbiddenWords),
      },
    });

    return NextResponse.json(parseBrandPack(brandPack), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "创建品牌包失败", message: String(error) },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(requireRole('owner', 'admin', 'operator')(handlePOST));

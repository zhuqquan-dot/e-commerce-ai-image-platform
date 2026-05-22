import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, getSessionFromRequest } from "@/auth/api-guard";
import { QuotaEngine } from "@/commerce/quota-engine";

const seriesPackCreateSchema = z.object({
  clientSpaceId: z.string().min(1, "clientSpaceId 必填"),
  brandPackId: z.string().min(1, "brandPackId 必填"),
  seriesName: z.string().min(1, "系列名称必填"),
  styleLockText: z.string().optional().default(""),
  fixedPalette: z.array(z.string()).optional().default([]),
  backgroundSystem: z.string().optional().default(""),
  lightingSystem: z.string().optional().default(""),
  defaultBundleStructure: z.string().optional().default(""),
  defaultReviewThreshold: z.string().optional().default(""),
});

function parseSeriesPack<T extends Record<string, unknown>>(record: T): T {
  const parsed = { ...record };
  const value = parsed.fixedPalette as string | undefined;
  if (typeof value === "string") {
    try {
      (parsed as Record<string, unknown>).fixedPalette = JSON.parse(value);
    } catch {
      (parsed as Record<string, unknown>).fixedPalette = [];
    }
  }
  return parsed;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientSpaceId = searchParams.get("clientSpaceId");
    const brandPackId = searchParams.get("brandPackId");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10))
    );

    const where: Record<string, unknown> = {};
    if (clientSpaceId) {
      where.clientSpaceId = clientSpaceId;
    }
    if (brandPackId) {
      where.brandPackId = brandPackId;
    }

    const [list, total] = await Promise.all([
      prisma.seriesPack.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          brandPack: {
            select: { brandName: true },
          },
        },
      }),
      prisma.seriesPack.count({ where }),
    ]);

    return NextResponse.json({
      list: list.map((sp) => {
        const parsed = parseSeriesPack(
          sp as unknown as Record<string, unknown>
        ) as Record<string, unknown>;
        return {
          ...parsed,
          brandPackName: sp.brandPack?.brandName ?? null,
          brandPack: undefined,
        };
      }),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "查询系列资产包失败", message: String(error) },
      { status: 500 }
    );
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    const quotaEngine = new QuotaEngine();
    const quotaCheck = await quotaEngine.checkSeriesPackQuota(session?.workspaceId ?? "");
    if (!quotaCheck.allowed) {
      return NextResponse.json({ error: quotaCheck.reason }, { status: 403 });
    }
    const body = await request.json();
    const parsed = seriesPackCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "校验失败", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { fixedPalette, clientSpaceId, brandPackId, ...rest } = parsed.data;

    const brandPack = await prisma.brandPack.findUnique({
      where: { id: brandPackId },
    });

    if (!brandPack) {
      return NextResponse.json(
        { error: "指定的品牌包不存在" },
        { status: 400 }
      );
    }

    if (brandPack.clientSpaceId !== clientSpaceId) {
      return NextResponse.json(
        { error: "品牌包不属于指定的客户空间" },
        { status: 400 }
      );
    }

    const seriesPack = await prisma.seriesPack.create({
      data: {
        ...rest,
        clientSpaceId,
        brandPackId,
        fixedPalette: JSON.stringify(fixedPalette),
      },
    });

    return NextResponse.json(parseSeriesPack(seriesPack), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "创建系列资产包失败", message: String(error) },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(requireRole('owner', 'admin', 'operator')(handlePOST));

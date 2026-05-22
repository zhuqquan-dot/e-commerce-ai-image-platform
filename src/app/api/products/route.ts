import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  parseProductJsonFields,
  stringifyProductJsonFields,
} from "@/lib/json-fields";

const productCreateSchema = z.object({
  clientSpaceId: z.string().min(1, "clientSpaceId 必填"),
  brandPackId: z.string().optional().default(""),
  seriesPackId: z.string().optional().default(""),
  productName: z.string().min(1, "商品名称必填"),
  category: z.string().optional().default(""),
  sku: z.string().optional().default(""),
  spu: z.string().optional().default(""),
  primaryLanguage: z.string().optional().default("zh-CN"),
  marketRegion: z.string().optional().default("CN"),
  rtlRequired: z.boolean().optional().default(false),
  material: z.string().optional().default(""),
  color: z.string().optional().default(""),
  size: z.string().optional().default(""),
  weight: z.string().optional().default(""),
  capacity: z.string().optional().default(""),
  model: z.string().optional().default(""),
  compatibleModel: z.string().optional().default(""),
  packageContents: z.string().optional().default(""),
  coreSellingPoint1: z.string().optional().default(""),
  coreSellingPoint2: z.string().optional().default(""),
  coreSellingPoint3: z.string().optional().default(""),
  differentiation: z.string().optional().default(""),
  targetAudience: z.string().optional().default(""),
  useCase: z.string().optional().default(""),
  painPoint: z.string().optional().default(""),
  publicProofAssets: z.string().optional().default(""),
  forbiddenClaims: z.string().optional().default(""),
  restrictedCopy: z.string().optional().default(""),
  frontRefImage: z.string().optional().default(""),
  angle45RefImage: z.string().optional().default(""),
  sideRefImage: z.string().optional().default(""),
  backRefImage: z.string().optional().default(""),
  topRefImage: z.string().optional().default(""),
  detailRefImages: z.array(z.string()).optional().default([]),
  packagingRefImage: z.string().optional().default(""),
  accessoryRefImage: z.string().optional().default(""),
  logoRefImage: z.string().optional().default(""),
  mainColor: z.string().optional().default(""),
  secondaryColor: z.string().optional().default(""),
  shapeType: z.string().optional().default(""),
  edgeFeature: z.string().optional().default(""),
  surfaceMaterial: z.string().optional().default(""),
  textureFeature: z.string().optional().default(""),
  logoPosition: z.string().optional().default(""),
  labelPosition: z.string().optional().default(""),
  buttonPortPosition: z.string().optional().default(""),
  structurePartition: z.string().optional().default(""),
  accessoryCount: z.string().optional().default(""),
  mustNotChangeFeatures: z.array(z.string()).optional().default([]),
  mustNotDisappearFeatures: z.array(z.string()).optional().default([]),
  mustNotAddFeatures: z.array(z.string()).optional().default([]),
  allowMinorVariationFields: z.array(z.string()).optional().default([]),
  inputMode: z.string().optional().default("quick"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = productCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "校验失败", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const stringified = stringifyProductJsonFields(parsed.data);
    const product = await prisma.product.create({
      data: stringified as unknown as Parameters<typeof prisma.product.create>[0]["data"],
    });

    return NextResponse.json(parseProductJsonFields(product), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "创建商品失败", message: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientSpaceId = searchParams.get("clientSpaceId");
    const brandPackId = searchParams.get("brandPackId");
    const seriesPackId = searchParams.get("seriesPackId");
    const category = searchParams.get("category");
    const keyword = searchParams.get("keyword");
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
    if (seriesPackId) {
      where.seriesPackId = seriesPackId;
    }
    if (category) {
      where.category = category;
    }
    if (keyword) {
      where.OR = [
        { productName: { contains: keyword } },
        { sku: { contains: keyword } },
        { spu: { contains: keyword } },
        { coreSellingPoint1: { contains: keyword } },
        { coreSellingPoint2: { contains: keyword } },
        { coreSellingPoint3: { contains: keyword } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.product.count({ where }),
    ]);

    const brandPackIds = [...new Set(products.map((p) => p.brandPackId).filter(Boolean))];
    const seriesPackIds = [...new Set(products.map((p) => p.seriesPackId).filter(Boolean))];

    const [brandPacks, seriesPacks] = await Promise.all([
      brandPackIds.length > 0
        ? prisma.brandPack.findMany({ where: { id: { in: brandPackIds } } })
        : [],
      seriesPackIds.length > 0
        ? prisma.seriesPack.findMany({ where: { id: { in: seriesPackIds } } })
        : [],
    ]);

    const brandPackMap = new Map(brandPacks.map((b) => [b.id, b.brandName]));
    const seriesPackMap = new Map(seriesPacks.map((s) => [s.id, s.seriesName]));

    const parsed = products.map((p) => {
      const parsedProduct = parseProductJsonFields(p);
      return {
        ...parsedProduct,
        brandPackName: brandPackMap.get(p.brandPackId) ?? null,
        seriesPackName: seriesPackMap.get(p.seriesPackId) ?? null,
      };
    });

    return NextResponse.json({
      list: parsed,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "查询商品失败", message: String(error) },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  parseProductJsonFields,
  stringifyProductJsonFields,
} from "@/lib/json-fields";
import { requireAuth, requireRole } from "@/auth/api-guard";

const productUpdateSchema = z.object({
  clientSpaceId: z.string().optional(),
  brandPackId: z.string().optional(),
  seriesPackId: z.string().optional(),
  productName: z.string().min(1, "商品名称必填").optional(),
  category: z.string().optional(),
  sku: z.string().optional(),
  spu: z.string().optional(),
  primaryLanguage: z.string().optional(),
  marketRegion: z.string().optional(),
  rtlRequired: z.boolean().optional(),
  material: z.string().optional(),
  color: z.string().optional(),
  size: z.string().optional(),
  weight: z.string().optional(),
  capacity: z.string().optional(),
  model: z.string().optional(),
  compatibleModel: z.string().optional(),
  packageContents: z.string().optional(),
  coreSellingPoint1: z.string().optional(),
  coreSellingPoint2: z.string().optional(),
  coreSellingPoint3: z.string().optional(),
  differentiation: z.string().optional(),
  targetAudience: z.string().optional(),
  useCase: z.string().optional(),
  painPoint: z.string().optional(),
  publicProofAssets: z.string().optional(),
  forbiddenClaims: z.string().optional(),
  restrictedCopy: z.string().optional(),
  frontRefImage: z.string().optional(),
  angle45RefImage: z.string().optional(),
  sideRefImage: z.string().optional(),
  backRefImage: z.string().optional(),
  topRefImage: z.string().optional(),
  detailRefImages: z.array(z.string()).optional(),
  packagingRefImage: z.string().optional(),
  accessoryRefImage: z.string().optional(),
  logoRefImage: z.string().optional(),
  mainColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  shapeType: z.string().optional(),
  edgeFeature: z.string().optional(),
  surfaceMaterial: z.string().optional(),
  textureFeature: z.string().optional(),
  logoPosition: z.string().optional(),
  labelPosition: z.string().optional(),
  buttonPortPosition: z.string().optional(),
  structurePartition: z.string().optional(),
  accessoryCount: z.string().optional(),
  mustNotChangeFeatures: z.array(z.string()).optional(),
  mustNotDisappearFeatures: z.array(z.string()).optional(),
  mustNotAddFeatures: z.array(z.string()).optional(),
  allowMinorVariationFields: z.array(z.string()).optional(),
  inputMode: z.string().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({ where: { id } });

    if (!product) {
      return NextResponse.json({ error: "商品不存在" }, { status: 404 });
    }

    return NextResponse.json(parseProductJsonFields(product));
  } catch (error) {
    return NextResponse.json(
      { error: "查询商品失败", message: String(error) },
      { status: 500 }
    );
  }
}

async function handlePUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await prisma.product.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: "商品不存在" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = productUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "校验失败", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const updateData = { ...parsed.data };
    const stringified = stringifyProductJsonFields(updateData) as Record<
      string,
      unknown
    >;

    Object.keys(stringified).forEach((k) => {
      if (stringified[k] === undefined) {
        delete stringified[k];
      }
    });

    const product = await prisma.product.update({
      where: { id },
      data: stringified as Parameters<typeof prisma.product.update>[0]["data"],
    });

    return NextResponse.json(parseProductJsonFields(product));
  } catch (error) {
    return NextResponse.json(
      { error: "更新商品失败", message: String(error) },
      { status: 500 }
    );
  }
}

export const PUT = requireAuth(requireRole('owner', 'admin', 'operator')(handlePUT));

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await prisma.product.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: "商品不存在" }, { status: 404 });
    }

    await prisma.product.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "商品已删除" });
  } catch (error) {
    return NextResponse.json(
      { error: "删除商品失败", message: String(error) },
      { status: 500 }
    );
  }
}

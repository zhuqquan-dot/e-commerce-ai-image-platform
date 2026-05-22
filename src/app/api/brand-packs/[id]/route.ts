import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const brandPackUpdateSchema = z.object({
  clientSpaceId: z.string().optional(),
  brandName: z.string().min(1, "品牌名称必填").optional(),
  brandPrimaryColor: z.string().optional(),
  brandSecondaryColor: z.string().optional(),
  brandFontPreference: z.string().optional(),
  brandTone: z.string().optional(),
  brandForbiddenWords: z.array(z.string()).optional(),
  brandVisualBoundary: z.string().optional(),
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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const brandPack = await prisma.brandPack.findUnique({ where: { id } });

    if (!brandPack) {
      return NextResponse.json({ error: "品牌包不存在" }, { status: 404 });
    }

    return NextResponse.json(parseBrandPack(brandPack));
  } catch (error) {
    return NextResponse.json(
      { error: "查询品牌包失败", message: String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await prisma.brandPack.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: "品牌包不存在" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = brandPackUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "校验失败", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { brandForbiddenWords, ...rest } = parsed.data;
    const updateData: Record<string, unknown> = { ...rest };

    if (brandForbiddenWords !== undefined) {
      updateData.brandForbiddenWords = JSON.stringify(brandForbiddenWords);
    }

    Object.keys(updateData).forEach((k) => {
      if (updateData[k] === undefined) {
        delete updateData[k];
      }
    });

    const brandPack = await prisma.brandPack.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(parseBrandPack(brandPack));
  } catch (error) {
    return NextResponse.json(
      { error: "更新品牌包失败", message: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await prisma.brandPack.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: "品牌包不存在" }, { status: 404 });
    }

    const [seriesPacks, products] = await Promise.all([
      prisma.seriesPack.findMany({
        where: { brandPackId: id },
        select: { id: true, seriesName: true },
      }),
      prisma.product.findMany({
        where: { brandPackId: id },
        select: { id: true, productName: true },
      }),
    ]);

    if (seriesPacks.length > 0 || products.length > 0) {
      return NextResponse.json({
        blocked: true,
        references: {
          seriesPacks,
          products,
        },
      });
    }

    await prisma.brandPack.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "品牌包已删除" });
  } catch (error) {
    return NextResponse.json(
      { error: "删除品牌包失败", message: String(error) },
      { status: 500 }
    );
  }
}

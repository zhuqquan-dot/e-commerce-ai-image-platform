import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const seriesPackUpdateSchema = z.object({
  clientSpaceId: z.string().optional(),
  brandPackId: z.string().optional(),
  seriesName: z.string().min(1, "系列名称必填").optional(),
  styleLockText: z.string().optional(),
  fixedPalette: z.array(z.string()).optional(),
  backgroundSystem: z.string().optional(),
  lightingSystem: z.string().optional(),
  defaultBundleStructure: z.string().optional(),
  defaultReviewThreshold: z.string().optional(),
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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const seriesPack = await prisma.seriesPack.findUnique({
      where: { id },
      include: {
        brandPack: {
          select: { brandName: true },
        },
      },
    });

    if (!seriesPack) {
      return NextResponse.json(
        { error: "系列资产包不存在" },
        { status: 404 }
      );
    }

    const parsed = parseSeriesPack(
      seriesPack as unknown as Record<string, unknown>
    ) as Record<string, unknown>;

    return NextResponse.json({
      ...parsed,
      brandPackName: seriesPack.brandPack?.brandName ?? null,
      brandPack: undefined,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "查询系列资产包失败", message: String(error) },
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
    const existing = await prisma.seriesPack.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { error: "系列资产包不存在" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = seriesPackUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "校验失败", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { fixedPalette, ...rest } = parsed.data;
    const updateData: Record<string, unknown> = { ...rest };

    if (fixedPalette !== undefined) {
      updateData.fixedPalette = JSON.stringify(fixedPalette);
    }

    Object.keys(updateData).forEach((k) => {
      if (updateData[k] === undefined) {
        delete updateData[k];
      }
    });

    const seriesPack = await prisma.seriesPack.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(parseSeriesPack(seriesPack));
  } catch (error) {
    return NextResponse.json(
      { error: "更新系列资产包失败", message: String(error) },
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
    const existing = await prisma.seriesPack.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { error: "系列资产包不存在" },
        { status: 404 }
      );
    }

    await prisma.seriesPack.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "系列资产包已删除" });
  } catch (error) {
    return NextResponse.json(
      { error: "删除系列资产包失败", message: String(error) },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const clientSpaceUpdateSchema = z.object({
  clientName: z.string().min(1, "客户名称必填").optional(),
  brandName: z.string().min(1, "品牌名称必填").optional(),
  region: z.string().optional(),
  defaultLanguage: z.string().optional(),
  targetMarkets: z.array(z.string()).optional(),
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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const clientSpace = await prisma.clientSpace.findUnique({ where: { id } });

    if (!clientSpace) {
      return NextResponse.json({ error: "客户空间不存在" }, { status: 404 });
    }

    return NextResponse.json(parseClientSpace(clientSpace));
  } catch (error) {
    return NextResponse.json(
      { error: "查询客户空间失败", message: String(error) },
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
    const existing = await prisma.clientSpace.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: "客户空间不存在" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = clientSpaceUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "校验失败", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { targetMarkets, ...rest } = parsed.data;
    const updateData: Record<string, unknown> = { ...rest };

    if (targetMarkets !== undefined) {
      updateData.targetMarkets = JSON.stringify(targetMarkets);
    }

    Object.keys(updateData).forEach((k) => {
      if (updateData[k] === undefined) {
        delete updateData[k];
      }
    });

    const clientSpace = await prisma.clientSpace.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(parseClientSpace(clientSpace));
  } catch (error) {
    return NextResponse.json(
      { error: "更新客户空间失败", message: String(error) },
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
    const existing = await prisma.clientSpace.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: "客户空间不存在" }, { status: 404 });
    }

    await prisma.clientSpace.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "客户空间已删除" });
  } catch (error) {
    return NextResponse.json(
      { error: "删除客户空间失败", message: String(error) },
      { status: 500 }
    );
  }
}

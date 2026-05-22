import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const providerCreateSchema = z.object({
  name: z.string().min(1, "名称必填"),
  type: z.string().min(1, "类型必填"),
  apiKey: z.string().min(1, "API Key 必填"),
  baseURL: z.string().optional().nullable(),
  priority: z.number().int().min(1).optional().default(1),
  isActive: z.boolean().optional().default(false),
  config: z.string().optional().nullable(),
});

const providerBatchUpdateSchema = z.object({
  activeIds: z.array(z.string()).optional(),
});

function maskApiKey(key: string): string {
  if (key.length <= 8) {
    return "****";
  }
  return key.slice(0, 4) + "****" + key.slice(-4);
}

function serializeProvider(record: Record<string, unknown>) {
  return {
    ...record,
    apiKey: maskApiKey(record.apiKey as string),
    baseURL: record.baseURL ?? null,
    config: record.config ?? null,
  };
}

export async function GET() {
  try {
    const list = await prisma.providerConfig.findMany({
      orderBy: { priority: "asc" },
    });
    return NextResponse.json({
      list: list.map((item) => serializeProvider(item as unknown as Record<string, unknown>)),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "查询Provider配置失败", message: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = providerCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "校验失败", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const provider = await prisma.providerConfig.create({
      data: {
        name: parsed.data.name,
        type: parsed.data.type,
        apiKey: parsed.data.apiKey,
        baseURL: parsed.data.baseURL ?? null,
        priority: parsed.data.priority,
        isActive: parsed.data.isActive,
        config: parsed.data.config ?? null,
      },
    });

    return NextResponse.json(
      serializeProvider(provider as unknown as Record<string, unknown>),
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "创建Provider配置失败", message: String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = providerBatchUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "校验失败", details: parsed.error.issues },
        { status: 400 }
      );
    }

    if (parsed.data.activeIds) {
      await prisma.providerConfig.updateMany({
        data: { isActive: false },
      });
      if (parsed.data.activeIds.length > 0) {
        await prisma.providerConfig.updateMany({
          where: { id: { in: parsed.data.activeIds } },
          data: { isActive: true },
        });
      }
    }

    const list = await prisma.providerConfig.findMany({
      orderBy: { priority: "asc" },
    });

    return NextResponse.json({
      list: list.map((item) => serializeProvider(item as unknown as Record<string, unknown>)),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "批量更新Provider配置失败", message: String(error) },
      { status: 500 }
    );
  }
}

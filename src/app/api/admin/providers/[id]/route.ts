import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { OpenAIProvider } from "@/generation/providers/openai-provider";

const providerUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  apiKey: z.string().min(1).optional(),
  baseURL: z.string().optional().nullable(),
  priority: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
  config: z.string().optional().nullable(),
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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const provider = await prisma.providerConfig.findUnique({ where: { id } });

    if (!provider) {
      return NextResponse.json({ error: "Provider配置不存在" }, { status: 404 });
    }

    return NextResponse.json(
      serializeProvider(provider as unknown as Record<string, unknown>)
    );
  } catch (error) {
    return NextResponse.json(
      { error: "查询Provider配置失败", message: String(error) },
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
    const existing = await prisma.providerConfig.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: "Provider配置不存在" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = providerUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "校验失败", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    const fields = ["name", "type", "apiKey", "baseURL", "priority", "isActive", "config"] as const;
    for (const field of fields) {
      if (parsed.data[field] !== undefined) {
        updateData[field] = parsed.data[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "没有提供要更新的字段" },
        { status: 400 }
      );
    }

    const updated = await prisma.providerConfig.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(
      serializeProvider(updated as unknown as Record<string, unknown>)
    );
  } catch (error) {
    return NextResponse.json(
      { error: "更新Provider配置失败", message: String(error) },
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
    const existing = await prisma.providerConfig.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: "Provider配置不存在" }, { status: 404 });
    }

    await prisma.providerConfig.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Provider配置已删除" });
  } catch (error) {
    return NextResponse.json(
      { error: "删除Provider配置失败", message: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    if (action === "test") {
      const provider = await prisma.providerConfig.findUnique({ where: { id } });

      if (!provider) {
        return NextResponse.json({ error: "Provider配置不存在" }, { status: 404 });
      }

      const openaiProvider = new OpenAIProvider({
        apiKey: provider.apiKey,
        baseURL: provider.baseURL ?? undefined,
      });

      const health = await openaiProvider.health();

      return NextResponse.json({
        id: provider.id,
        name: provider.name,
        available: health.available,
        latency: health.latency ?? null,
      });
    }

    return NextResponse.json(
      { error: "无效操作", message: `Unknown action: ${action}` },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "测试连接失败", message: String(error) },
      { status: 500 }
    );
  }
}

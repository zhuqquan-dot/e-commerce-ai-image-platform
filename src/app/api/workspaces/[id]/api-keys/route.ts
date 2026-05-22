import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/auth/api-guard";
import { ApiKeyService } from "@/ecosystem/api-key-service";

const apiKeyService = new ApiKeyService();

const apiKeyCreateSchema = z.object({
  name: z.string().min(1, "名称必填"),
  rateLimit: z.number().int().min(1).optional(),
});

async function handleGET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const list = await apiKeyService.listApiKeys(id);
    return NextResponse.json({ list });
  } catch (error) {
    return NextResponse.json(
      { error: "查询 API Key 列表失败", message: String(error) },
      { status: 500 }
    );
  }
}

async function handlePOST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = apiKeyCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "校验失败", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const result = await apiKeyService.createApiKey(
      id,
      parsed.data.name,
      parsed.data.rateLimit
    );
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "创建 API Key 失败", message: String(error) },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(handleGET);
export const POST = requireAuth(handlePOST);

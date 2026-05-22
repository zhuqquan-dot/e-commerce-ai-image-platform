import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/auth/api-guard";
import { TemplateService } from "@/ecosystem/template-service";

const templateService = new TemplateService();

const templateCreateSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(1),
  type: z.string().min(1),
  platform: z.string().optional(),
  category: z.string().optional(),
  sourceProjectId: z.string().optional(),
  structureSnapshot: z.any().optional(),
  visibility: z.string().optional(),
});

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId 必填" },
        { status: 400 }
      );
    }

    const filters: Record<string, string> = {};
    const platform = searchParams.get("platform");
    const category = searchParams.get("category");
    const type = searchParams.get("type");
    if (platform) filters.platform = platform;
    if (category) filters.category = category;
    if (type) filters.type = type;

    const list = await templateService.listTemplates(
      workspaceId,
      Object.keys(filters).length > 0 ? filters : undefined
    );

    return NextResponse.json({ list });
  } catch (error) {
    return NextResponse.json(
      { error: "查询模板列表失败", message: String(error) },
      { status: 500 }
    );
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = templateCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "校验失败", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const template = await templateService.createTemplate(parsed.data);
    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "创建模板失败", message: String(error) },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(handleGET);
export const POST = requireAuth(handlePOST);

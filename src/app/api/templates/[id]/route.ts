import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/auth/api-guard";
import { TemplateService } from "@/ecosystem/template-service";

const templateService = new TemplateService();

const templateUpdateSchema = z.object({
  name: z.string().optional(),
  structureSnapshot: z.any().optional(),
  platform: z.string().optional(),
  category: z.string().optional(),
  visibility: z.string().optional(),
  changelog: z.string().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const template = await templateService.getTemplate(id);

    if (!template) {
      return NextResponse.json({ error: "模板不存在" }, { status: 404 });
    }

    return NextResponse.json(template);
  } catch (error) {
    return NextResponse.json(
      { error: "查询模板详情失败", message: String(error) },
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
    const body = await request.json();
    const parsed = templateUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "校验失败", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const template = await templateService.updateTemplate(id, parsed.data);
    return NextResponse.json(template);
  } catch (error) {
    const message = String(error);
    if (message.includes("不存在")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json(
      { error: "更新模板失败", message },
      { status: 500 }
    );
  }
}

export const PUT = requireAuth(handlePUT);

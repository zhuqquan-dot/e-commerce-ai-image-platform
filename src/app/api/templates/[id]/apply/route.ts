import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/auth/api-guard";
import { TemplateService } from "@/ecosystem/template-service";

const templateService = new TemplateService();

const applySchema = z.object({
  projectId: z.string().min(1),
});

async function handlePOST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = applySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "校验失败", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const result = await templateService.applyTemplate(id, parsed.data.projectId);
    return NextResponse.json(result);
  } catch (error) {
    const message = String(error);
    if (message.includes("不存在")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json(
      { error: "应用模板失败", message },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(handlePOST);

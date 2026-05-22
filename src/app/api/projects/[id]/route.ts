import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

function parseProject<T extends Record<string, unknown>>(project: T): T {
  const parsed = { ...project };
  const sp = parsed["selectedPlatforms" as keyof T];
  if (typeof sp === "string" && sp) {
    try {
      (parsed as Record<string, unknown>)["selectedPlatforms"] = JSON.parse(sp as string);
    } catch {
      (parsed as Record<string, unknown>)["selectedPlatforms"] = [];
    }
  }
  return parsed;
}

function stringifyProject<T extends Record<string, unknown>>(data: T): T {
  const result = { ...data };
  const sp = result["selectedPlatforms" as keyof T];
  if (sp !== undefined && sp !== null && typeof sp === "object") {
    (result as Record<string, unknown>)["selectedPlatforms"] = JSON.stringify(sp);
  }
  return result;
}

const projectUpdateSchema = z.object({
  productId: z.string().optional(),
  projectType: z.string().optional(),
  status: z.string().optional(),
  selectedPlatforms: z.array(z.string()).optional(),
  inputMode: z.string().optional(),
});

const VALID_PROJECT_FIELDS = new Set([
  "productId", "projectType", "status", "selectedPlatforms", "inputMode",
]);

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, name: true, email: true } },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    const { creator, ...projectData } = project;
    const parsed = parseProject(projectData as unknown as Record<string, unknown>);

    return NextResponse.json({
      ...parsed,
      creator: creator ? { id: creator.id, name: creator.name || creator.email } : null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "查询项目失败", message: String(error) },
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
    const existing = await prisma.project.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = projectUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "校验失败", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const updateData = { ...parsed.data };
    const stringified = stringifyProject(updateData as Record<string, unknown>);

    const cleanData: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(stringified)) {
      if (v !== undefined && VALID_PROJECT_FIELDS.has(k)) {
        cleanData[k] = v;
      }
    }

    const project = await prisma.project.update({
      where: { id },
      data: cleanData as Parameters<typeof prisma.project.update>[0]["data"],
    });

    return NextResponse.json(parseProject(project as unknown as Record<string, unknown>));
  } catch (error) {
    return NextResponse.json(
      { error: "更新项目失败", message: String(error) },
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
    const existing = await prisma.project.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    await prisma.project.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "项目已删除" });
  } catch (error) {
    return NextResponse.json(
      { error: "删除项目失败", message: String(error) },
      { status: 500 }
    );
  }
}

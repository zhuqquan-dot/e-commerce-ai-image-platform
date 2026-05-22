import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, getSessionFromRequest } from "@/auth/api-guard";
import { QuotaEngine } from "@/commerce/quota-engine";

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
  } else if (sp === undefined || sp === null) {
    (result as Record<string, unknown>)["selectedPlatforms"] = JSON.stringify([]);
  }
  return result;
}

const projectCreateSchema = z.object({
  projectType: z.string().optional().default("single_product_single_platform"),
  status: z.string().optional().default("draft"),
  selectedPlatforms: z.array(z.string()).optional().default([]),
  inputMode: z.string().optional().default("quick"),
});

const VALID_PROJECT_FIELDS = new Set([
  "productId", "projectType", "status", "selectedPlatforms", "inputMode",
]);

async function handlePOST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    const quotaEngine = new QuotaEngine();
    const quotaCheck = await quotaEngine.checkProjectQuota(session?.workspaceId ?? "");
    if (!quotaCheck.allowed) {
      return NextResponse.json({ error: quotaCheck.reason }, { status: 403 });
    }
    const body = await request.json();
    const parsed = projectCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "校验失败", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const stringified = stringifyProject(parsed.data as unknown as Record<string, unknown>);

    const prismaData: Record<string, unknown> = {
      productId: "pending",
    };

    if (session) {
      prismaData.workspaceId = session.workspaceId;
      prismaData.creatorId = session.userId;
    }

    for (const [k, v] of Object.entries(stringified as Record<string, unknown>)) {
      if (VALID_PROJECT_FIELDS.has(k) && v !== undefined) {
        prismaData[k] = v;
      }
    }

    const project = await prisma.project.create({
      data: prismaData as Parameters<typeof prisma.project.create>[0]["data"],
    });

    return NextResponse.json(parseProject(project as unknown as Record<string, unknown>), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "创建项目失败", message: String(error) },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(requireRole('owner', 'admin', 'operator')(handlePOST));

async function handleGET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10))
    );

    const where: Record<string, unknown> = {};

    if (status && status !== "all") {
      where.status = status;
    }

    if (session?.workspaceId) {
      where.workspaceId = session.workspaceId;
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.project.count({ where }),
    ]);

    const parsed = projects.map((p) => parseProject(p as unknown as Record<string, unknown>));

    return NextResponse.json({
      list: parsed,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "查询项目失败", message: String(error) },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(handleGET);

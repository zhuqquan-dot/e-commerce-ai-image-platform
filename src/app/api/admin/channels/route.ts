import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/auth/api-guard";

const channelCreateSchema = z.object({
  name: z.string().min(1, "渠道名称必填"),
  level: z.number().int().min(1).max(5).optional().default(1),
  discountRate: z.number().min(0).max(1).optional().default(1.0),
  status: z.enum(["active", "suspended", "terminated"]).optional().default("active"),
  contactInfo: z.string().optional().nullable(),
});

async function handleGET() {
  try {
    const list = await prisma.channelPartner.findMany({
      orderBy: { level: "desc" },
      include: { _count: { select: { workspaces: true } } },
    });
    return NextResponse.json({ list });
  } catch (error) {
    return NextResponse.json(
      { error: "查询渠道列表失败", message: String(error) },
      { status: 500 },
    );
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = channelCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "校验失败", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const channel = await prisma.channelPartner.create({
      data: {
        name: parsed.data.name,
        level: parsed.data.level,
        discountRate: parsed.data.discountRate,
        status: parsed.data.status,
        contactInfo: parsed.data.contactInfo ?? null,
      },
      include: { _count: { select: { workspaces: true } } },
    });

    return NextResponse.json(channel, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "创建渠道失败", message: String(error) },
      { status: 500 },
    );
  }
}

export const GET = requireAuth(handleGET);
export const POST = requireAuth(requireRole("owner", "admin")(handlePOST));

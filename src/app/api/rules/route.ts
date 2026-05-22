import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const platformRuleCreateSchema = z.object({
  platformName: z.string().min(1),
  platformRegion: z.string().min(1),
  platformType: z.string().optional().nullable(),
  defaultLanguage: z.string().optional().nullable(),
  status: z.string().optional(),
  maxImages: z.number().int().min(1),
  mainImageRatio: z.string().min(1),
  mainImageSize: z.string().min(1),
  allowedFormats: z.string().optional(),
  maxFileSizeMb: z.number().min(0),
  whiteBackgroundRequired: z.boolean().optional(),
  textAllowedOnMainImage: z.boolean().optional(),
  watermarkAllowed: z.boolean().optional(),
  borderAllowed: z.boolean().optional(),
  logoAllowed: z.boolean().optional(),
  maxOverlayTextLength: z.number().int().nullable().optional(),
  supportedLanguagesForPromptText: z.string().optional(),
  supportedSlots: z.string().optional(),
  forbiddenWords: z.string().optional(),
  absoluteTermsForbidden: z.boolean().optional(),
  medicalTermsForbidden: z.boolean().optional(),
  exportFileNamingRule: z.string().optional().nullable(),
});

export async function GET() {
  try {
    const rules = await prisma.platformRulePack.findMany({
      orderBy: { platformName: "asc" },
    });
    return NextResponse.json(rules);
  } catch (error) {
    return NextResponse.json(
      { error: "查询平台规则失败", message: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = platformRuleCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "校验失败", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const rule = await prisma.platformRulePack.create({
      data: parsed.data as Parameters<typeof prisma.platformRulePack.create>[0]["data"],
    });

    return NextResponse.json(rule, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "创建平台规则失败", message: String(error) },
      { status: 500 }
    );
  }
}

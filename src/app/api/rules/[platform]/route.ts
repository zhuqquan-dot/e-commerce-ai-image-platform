import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ruleRegistry } from "@/rules/platform-rule-registry";

const platformRuleUpdateSchema = z.object({
  platformRegion: z.string().min(1).optional(),
  platformType: z.string().optional().nullable(),
  defaultLanguage: z.string().optional().nullable(),
  status: z.string().optional(),
  maxImages: z.number().int().min(1).optional(),
  mainImageRatio: z.string().min(1).optional(),
  mainImageSize: z.string().min(1).optional(),
  allowedFormats: z.string().optional(),
  maxFileSizeMb: z.number().min(0).optional(),
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
  whiteBackgroundToleranceR: z.number().int().min(0).max(255).optional(),
  whiteBackgroundToleranceG: z.number().int().min(0).max(255).optional(),
  whiteBackgroundToleranceB: z.number().int().min(0).max(255).optional(),
  textConstraints: z.string().optional(),
  forbiddenElements: z.string().optional(),
  priceOverlayZone: z.string().optional(),
  exportDirectoryStructure: z.string().optional(),
  exportSortOrder: z.string().optional(),
  deliveryNotes: z.string().optional(),
  versions: z.string().optional(),
  changedBy: z.string().optional(),
  changeNote: z.string().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    const { platform } = await params;
    const rule = await ruleRegistry.getRule(platform);

    if (!rule) {
      return NextResponse.json(
        { error: "平台规则不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json(rule);
  } catch (error) {
    return NextResponse.json(
      { error: "查询平台规则失败", message: String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    const { platform } = await params;
    const body = await request.json();
    const parsed = platformRuleUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "校验失败", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = { ...parsed.data };
    Object.keys(updateData).forEach((k) => {
      if (updateData[k] === undefined) {
        delete updateData[k];
      }
    });

    const rule = await ruleRegistry.updateRule(platform, updateData);

    return NextResponse.json(rule);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("not found")) {
      return NextResponse.json(
        { error: "平台规则不存在" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "更新平台规则失败", message },
      { status: 500 }
    );
  }
}

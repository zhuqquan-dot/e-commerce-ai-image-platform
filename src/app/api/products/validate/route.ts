import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const validateSchema = z.object({
  productName: z.string().optional().default(""),
  category: z.string().optional().default(""),
  marketRegion: z.string().optional().default(""),
  frontRefImage: z.string().optional().default(""),
  coreSellingPoint1: z.string().optional().default(""),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = validateSchema.parse(body);

    const missingFields: string[] = [];
    const warnings: string[] = [];

    if (!data.productName || !data.productName.trim()) {
      missingFields.push("productName");
    }
    if (!data.category || !data.category.trim()) {
      missingFields.push("category");
    }
    if (!data.marketRegion || !data.marketRegion.trim()) {
      missingFields.push("marketRegion");
    }
    if (!data.frontRefImage || !data.frontRefImage.trim()) {
      missingFields.push("frontRefImage");
    }
    if (!data.coreSellingPoint1 || !data.coreSellingPoint1.trim()) {
      missingFields.push("coreSellingPoint1");
    }

    if (!body.sku || !(body.sku as string)?.trim()) {
      warnings.push("建议填写 SKU");
    }
    if (!body.spu || !(body.spu as string)?.trim()) {
      warnings.push("建议填写 SPU");
    }
    if (!body.mainColor || !(body.mainColor as string)?.trim()) {
      warnings.push("建议填写主色(mainColor)");
    }

    return NextResponse.json({
      valid: missingFields.length === 0,
      missingFields,
      warnings,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { valid: false, error: "数据格式错误", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { valid: false, error: "校验失败", message: String(error) },
      { status: 500 }
    );
  }
}

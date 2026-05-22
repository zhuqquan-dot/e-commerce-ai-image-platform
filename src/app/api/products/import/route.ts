import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stringifyProductJsonFields } from "@/lib/json-fields";
import * as XLSX from "xlsx";

interface ImportRow {
  rowIndex: number;
  productName?: string;
  category?: string;
  marketRegion?: string;
  sku?: string;
  spu?: string;
  coreSellingPoint1?: string;
  coreSellingPoint2?: string;
  coreSellingPoint3?: string;
  primaryLanguage?: string;
  material?: string;
  color?: string;
  size?: string;
  weight?: string;
  capacity?: string;
  model?: string;
  mainColor?: string;
  secondaryColor?: string;
  shapeType?: string;
  surfaceMaterial?: string;
  textureFeature?: string;
  logoPosition?: string;
  frontRefImage?: string;
  angle45RefImage?: string;
  sideRefImage?: string;
  [key: string]: string | number | undefined;
}

function normalizeHeader(h: string): string {
  const map: Record<string, string> = {
    商品名称: "productName",
    类目: "category",
    目标市场: "marketRegion",
    SKU: "sku",
    SPU: "spu",
    卖点1: "coreSellingPoint1",
    卖点2: "coreSellingPoint2",
    卖点3: "coreSellingPoint3",
    主要语言: "primaryLanguage",
    材质: "material",
    颜色: "color",
    尺寸: "size",
    重量: "weight",
    容量: "capacity",
    型号: "model",
    主色: "mainColor",
    辅色: "secondaryColor",
    形状类型: "shapeType",
    表面材质: "surfaceMaterial",
    纹理特征: "textureFeature",
    Logo位置: "logoPosition",
    正面参考图: "frontRefImage",
    "45度参考图": "angle45RefImage",
    侧面参考图: "sideRefImage",
    卖点4: "differentiation",
    目标用户: "targetAudience",
    使用场景: "useCase",
    用户痛点: "painPoint",
  };
  return map[h] || h;
}

function parseFile(buffer: ArrayBuffer): ImportRow[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const sheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
    defval: "",
  });

  return rawData.map((row, idx) => {
    const normalized: ImportRow = { rowIndex: idx + 2 };
    for (const [key, value] of Object.entries(row)) {
      const field = normalizeHeader(key.trim());
      normalized[field] = typeof value === "string" ? value.trim() : value;
    }
    return normalized;
  });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const clientSpaceId = formData.get("clientSpaceId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "缺少上传文件" }, { status: 400 });
    }
    if (!clientSpaceId) {
      return NextResponse.json(
        { error: "缺少 clientSpaceId" },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const rows = parseFile(buffer);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "文件为空或无法解析" },
        { status: 400 }
      );
    }

    const successRows: ImportRow[] = [];
    const failureRows: { rowIndex: number; reasons: string[] }[] = [];

    for (const row of rows) {
      const errors: string[] = [];

      if (!row.productName || !row.productName.trim()) {
        errors.push("商品名称缺失");
      }
      if (!row.category || !row.category.trim()) {
        errors.push("类目缺失");
      }
      if (!row.marketRegion || !row.marketRegion.trim()) {
        errors.push("目标平台缺失");
      }
      if (!row.coreSellingPoint1 || !row.coreSellingPoint1.trim()) {
        errors.push("至少需要 1 条卖点(coreSellingPoint1)");
      }

      if (errors.length > 0) {
        failureRows.push({ rowIndex: row.rowIndex, reasons: errors });
        continue;
      }

      try {
        const productData = {
          clientSpaceId,
          productName: row.productName!.trim(),
          category: row.category!.trim(),
          marketRegion: row.marketRegion!.trim(),
          sku: row.sku || "",
          spu: row.spu || "",
          coreSellingPoint1: row.coreSellingPoint1?.trim() || "",
          coreSellingPoint2: row.coreSellingPoint2?.trim() || "",
          coreSellingPoint3: row.coreSellingPoint3?.trim() || "",
          primaryLanguage: row.primaryLanguage || "zh-CN",
          material: row.material || "",
          color: row.color || "",
          size: row.size || "",
          weight: row.weight || "",
          capacity: row.capacity || "",
          model: row.model || "",
          mainColor: row.mainColor || "",
          secondaryColor: row.secondaryColor || "",
          shapeType: row.shapeType || "",
          surfaceMaterial: row.surfaceMaterial || "",
          textureFeature: row.textureFeature || "",
          logoPosition: row.logoPosition || "",
          frontRefImage: row.frontRefImage || "",
          angle45RefImage: row.angle45RefImage || "",
          sideRefImage: row.sideRefImage || "",
          differentiation: row.differentiation || "",
          targetAudience: row.targetAudience || "",
          useCase: row.useCase || "",
          painPoint: row.painPoint || "",
        };

        const stringified = stringifyProductJsonFields(productData);
        await prisma.product.create({
          data: stringified as Parameters<typeof prisma.product.create>[0]["data"],
        });
        successRows.push(row);
      } catch (e) {
        failureRows.push({
          rowIndex: row.rowIndex,
          reasons: [`数据库写入失败: ${String(e)}`],
        });
      }
    }

    return NextResponse.json({
      success: true,
      total: rows.length,
      successCount: successRows.length,
      failureCount: failureRows.length,
      failures: failureRows,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "导入失败", message: String(error) },
      { status: 500 }
    );
  }
}

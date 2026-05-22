import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const batchCreateSchema = z.object({
  projectName: z.string().min(1, "项目名称不能为空"),
  clientSpaceId: z.string().min(1, "客户空间ID不能为空"),
  productIds: z.array(z.string()).min(1, "至少需要1个商品"),
  platformNames: z.array(z.string()).optional().default([]),
  seriesPackId: z.string().optional(),
  inputMode: z.string().optional().default("quick"),
  bundleType: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = batchCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "校验失败", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { projectName, clientSpaceId, productIds, platformNames, seriesPackId, inputMode, bundleType } = parsed.data;

    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    const valid: typeof products = [];
    const blocked: { productId: string; productName: string; reason: string }[] = [];

    for (const pid of productIds) {
      const product = productMap.get(pid);
      if (!product) {
        blocked.push({ productId: pid, productName: "未知商品", reason: "商品不存在" });
        continue;
      }
      if (!product.productName || product.productName.trim() === "") {
        blocked.push({ productId: pid, productName: product.productName || "未命名商品", reason: "商品缺少名称" });
        continue;
      }
      if (!product.category || product.category.trim() === "") {
        blocked.push({ productId: pid, productName: product.productName, reason: "商品缺少类目" });
        continue;
      }
      valid.push(product);
    }

    const selectedPlatformsJson = JSON.stringify(platformNames);

    const result = await prisma.$transaction(async (tx) => {
      const parentProject = await tx.project.create({
        data: {
          productId: valid.length > 0 ? valid[0].id : "pending",
          projectName,
          clientSpaceId,
          projectType: "multi_product_batch",
          status: "draft",
          selectedPlatforms: selectedPlatformsJson,
          seriesPackId: seriesPackId ?? null,
          inputMode,
          bundleType: bundleType ?? null,
        },
      });

      const children: { projectId: string; productId: string; productName: string; status: string }[] = [];

      for (const product of valid) {
        const child = await tx.project.create({
          data: {
            productId: product.id,
            projectName: `${projectName} - ${product.productName}`,
            clientSpaceId,
            parentProjectId: parentProject.id,
            projectType: "single_product_single_platform",
            status: "draft",
            selectedPlatforms: selectedPlatformsJson,
            seriesPackId: seriesPackId ?? null,
            inputMode,
            bundleType: bundleType ?? null,
          },
        });

        children.push({
          projectId: child.id,
          productId: product.id,
          productName: product.productName,
          status: child.status,
        });
      }

      return { parentProject, children };
    });

    return NextResponse.json(
      {
        parentProject: {
          id: result.parentProject.id,
          projectName: result.parentProject.projectName,
          status: result.parentProject.status,
        },
        summary: {
          total: productIds.length,
          created: valid.length,
          blocked: blocked.length,
        },
        children: result.children,
        blocked,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "批量创建项目失败", message: String(error) },
      { status: 500 }
    );
  }
}

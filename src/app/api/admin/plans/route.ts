import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PlanService } from "@/commerce/plan-service";
import { requireAuth, requireRole } from "@/auth/api-guard";

const planCreateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "套餐名称必填"),
  monthlyPrice: z.number().int().min(0).optional(),
  yearlyPrice: z.number().int().min(0).optional(),
  monthlyCredits: z.number().int().min(0).optional(),
  memberLimit: z.number().int().min(1).optional(),
  clientSpaceLimit: z.number().int().min(1).optional(),
  brandPackLimit: z.number().int().min(1).optional(),
  seriesPackLimit: z.number().int().min(1).optional(),
  projectLimit: z.number().int().min(1).optional(),
  exportLimit: z.number().int().min(0).optional(),
  batchEnabled: z.boolean().optional(),
  multiPlatformEnabled: z.boolean().optional(),
  reviewEnabled: z.boolean().optional(),
  exportEnabled: z.boolean().optional(),
  yearlyDiscount: z.number().min(0).max(1).optional(),
  creditCarryOverRatio: z.number().min(0).max(1).optional(),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

const planService = new PlanService();

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = planCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "校验失败", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const plan = await planService.createOrUpdatePlan(parsed.data);

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "创建或更新套餐失败", message: String(error) },
      { status: 500 },
    );
  }
}

export const POST = requireAuth(requireRole("owner", "admin")(handlePOST));

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ReviewService } from "@/control/review-service";
import { requireAuth, requireRole, getSessionFromRequest } from "@/auth/api-guard";

const reviewService = new ReviewService();

const reviewActionSchema = z.object({
  action: z.enum(["approved", "rejected", "risk_mark"]),
  comment: z.string().optional(),
  reviewerId: z.string().optional(),
  riskTags: z.array(z.string()).optional(),
});

async function handlePOST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const task = await prisma.generationTask.findUnique({ where: { id } });
    if (!task) {
      return NextResponse.json({ error: "任务不存在" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = reviewActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "校验失败", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { action, comment, reviewerId: bodyReviewerId, riskTags } = parsed.data;
    const session = getSessionFromRequest(request);
    const reviewerId = session?.userId || bodyReviewerId || "system";

    if (action === "approved") {
      const result = await reviewService.approve(id, reviewerId, comment);
      return NextResponse.json(result);
    }

    if (action === "rejected") {
      if (!comment || comment.trim().length === 0) {
        return NextResponse.json(
          { error: "驳回操作必须填写原因" },
          { status: 400 },
        );
      }
      const result = await reviewService.reject(id, reviewerId, comment);
      return NextResponse.json(result);
    }

    if (action === "risk_mark") {
      const result = await reviewService.riskMark(
        id,
        reviewerId,
        riskTags || [],
        comment || "",
      );
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "未知操作" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: "审核操作失败", message: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export const POST = requireAuth(requireRole('owner', 'admin', 'reviewer')(handlePOST));

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const task = await prisma.generationTask.findUnique({ where: { id } });
    if (!task) {
      return NextResponse.json({ error: "任务不存在" }, { status: 404 });
    }

    const reviews = await prisma.reviewRecord.findMany({
      where: { taskId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ taskId: id, reviews });
  } catch (error) {
    return NextResponse.json(
      { error: "查询审核记录失败", message: String(error) },
      { status: 500 },
    );
  }
}

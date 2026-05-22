import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function safeJsonParse(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    const tasks = await prisma.generationTask.findMany({
      where: { projectId: id },
      include: {
        product: {
          select: { productName: true, sku: true },
        },
        platformRulePack: {
          select: { platformName: true },
        },
        reviewRecords: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        candidateAssets: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        qcResults: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        attempts: {
          orderBy: { createdAt: "desc" },
          include: {
            candidateAssets: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalTasks = tasks.length;
    const approvedTasks = tasks.filter((t) => t.status === "approved").length;
    const rejectedTasks = tasks.filter((t) => t.status === "rejected").length;
    const pendingReview = tasks.filter(
      (t) =>
        !["approved", "rejected"].includes(t.status),
    ).length;

    const taskList = tasks.map((task) => {
      const latestQc = task.qcResults[0];

      const succeededAttempt = task.attempts.find((a) => a.status === "succeeded") ?? task.attempts[0];
      const attemptAsset = succeededAttempt?.candidateAssets[0];
      const imageUrl =
        attemptAsset?.remoteUrl ??
        attemptAsset?.imageUrl ??
        attemptAsset?.localPath ??
        null;
      const thumbnailUrl =
        attemptAsset?.imageUrl ??
        attemptAsset?.remoteUrl ??
        attemptAsset?.localPath ??
        null;

      return {
        taskId: task.id,
        productName: task.product?.productName ?? "",
        platform: task.platformRulePack?.platformName ?? "",
        slotType: task.slotCode,
        status: task.status,
        imageUrl,
        thumbnailUrl,
        qcGrade: latestQc?.overallGrade ?? "N/A",
        qcReasons: safeJsonParse(latestQc?.reasons),
        qcRiskTags: safeJsonParse(latestQc?.riskTags),
        suggestedAction: latestQc?.suggestedAction ?? "review",
        latestReview: task.reviewRecords[0] ?? null,
        productId: task.productId,
        sku: task.product?.sku ?? "",
        attempts: task.attempts.map((a) => {
          const asset = a.candidateAssets[0];
          return {
            attemptId: a.id,
            status: a.status,
            thumbnailUrl:
              asset?.imageUrl ??
              asset?.remoteUrl ??
              asset?.localPath ??
              null,
          };
        }),
      };
    });

    return NextResponse.json({
      projectId: id,
      summary: {
        total: totalTasks,
        approved: approvedTasks,
        rejected: rejectedTasks,
        pending: pendingReview,
      },
      tasks: taskList,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "查询审核汇总失败", message: String(error) },
      { status: 500 },
    );
  }
}

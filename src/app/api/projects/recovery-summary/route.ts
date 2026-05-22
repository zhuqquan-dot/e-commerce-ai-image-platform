import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const FAILURE_STATUSES = ["compile_failed", "blocked", "qc_blocked", "generation_failed", "provider_timeout"];
const NON_DRAFT_STATUSES = ["planned", "generating", "qc_pending", "qc_failed", "review_pending", "review_approved", "review_rejected", "completed", "exporting", "exported"];

export async function GET(_request: NextRequest) {
  try {
    const projects = await prisma.project.findMany({
      where: { status: { in: NON_DRAFT_STATUSES } },
      orderBy: { updatedAt: "desc" },
    });

    const projectIds = projects.map((p) => p.id);

    const tasks = await prisma.generationTask.findMany({
      where: {
        projectId: { in: projectIds },
        status: { in: FAILURE_STATUSES },
      },
      select: {
        id: true,
        projectId: true,
        status: true,
        slotCode: true,
        manualRequired: true,
        updatedAt: true,
      },
    });

    const tasksByProject: Record<string, typeof tasks> = {};
    for (const t of tasks) {
      if (!tasksByProject[t.projectId]) tasksByProject[t.projectId] = [];
      tasksByProject[t.projectId].push(t);
    }

    const list = projects.map((p) => {
      const ptasks = tasksByProject[p.id] || [];
      const compileFailed = ptasks.filter((t) => t.status === "compile_failed").length;
      const providerTimeout = ptasks.filter((t) => t.status === "provider_timeout").length;
      const qcBlocked = ptasks.filter((t) => t.status === "qc_blocked").length;
      const generationFailed = ptasks.filter((t) => t.status === "generation_failed").length;
      const blocked = ptasks.filter((t) => t.status === "blocked").length;
      const failedTasks = compileFailed + providerTimeout + qcBlocked + generationFailed + blocked;
      const recoverableCount = ptasks.filter((t) => t.status !== "compile_failed").length;
      const lastFailureAt = ptasks.length > 0
        ? ptasks.reduce((max, t) => (t.updatedAt > max ? t.updatedAt : max), ptasks[0].updatedAt).toISOString()
        : null;

      let selectedPlatforms: string[] = [];
      try {
        selectedPlatforms = JSON.parse((p as Record<string, unknown>).selectedPlatforms as string || "[]");
      } catch { /* keep empty */ }

      return {
        projectId: p.id,
        projectName: (p as Record<string, unknown>).projectName || "",
        projectType: (p as Record<string, unknown>).projectType || "",
        status: p.status,
        selectedPlatforms,
        totalTasks: ptasks.length,
        failedTasks,
        compileFailed,
        providerTimeout,
        qcBlocked,
        generationFailed,
        blocked,
        recoverableCount,
        lastFailureAt,
        taskIds: ptasks.map((t) => t.id),
      };
    });

    const withFailures = list.filter((p) => p.failedTasks > 0);

    return NextResponse.json({ list: withFailures });
  } catch (error) {
    return NextResponse.json(
      { error: "获取失败项目汇总失败", message: String(error) },
      { status: 500 },
    );
  }
}

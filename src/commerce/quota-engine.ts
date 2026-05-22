import { prisma } from "@/lib/prisma";

const DEFAULT_LIMITS = {
  projectLimit: 5,
  exportLimit: 10,
  clientSpaceLimit: 1,
  brandPackLimit: 1,
  seriesPackLimit: 3,
  memberLimit: 1,
};

interface QuotaResult {
  allowed: boolean;
  reason?: string;
}

export class QuotaEngine {
  private async getWorkspaceWithPlan(workspaceId: string) {
    return prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { plan: true },
    });
  }

  async checkProjectQuota(workspaceId: string): Promise<QuotaResult> {
    const workspace = await this.getWorkspaceWithPlan(workspaceId);
    if (!workspace) {
      return { allowed: false, reason: "工作区不存在" };
    }
    const limit = workspace.plan?.projectLimit ?? DEFAULT_LIMITS.projectLimit;
    const count = await prisma.project.count({ where: { workspaceId } });
    if (count >= limit) {
      return { allowed: false, reason: `项目数量已达上限（${limit}）` };
    }
    return { allowed: true };
  }

  async checkGenerationQuota(workspaceId: string, creditCost: number): Promise<QuotaResult> {
    const workspace = await this.getWorkspaceWithPlan(workspaceId);
    if (!workspace) {
      return { allowed: false, reason: "工作区不存在" };
    }
    const totalCredits = workspace.monthlyCredits + workspace.fuelCredits;
    if (totalCredits < creditCost) {
      return { allowed: false, reason: `积分不足（需要 ${creditCost}，当前 ${totalCredits}）` };
    }
    return { allowed: true };
  }

  async checkExportQuota(workspaceId: string): Promise<QuotaResult> {
    const workspace = await this.getWorkspaceWithPlan(workspaceId);
    if (!workspace) {
      return { allowed: false, reason: "工作区不存在" };
    }
    const limit = workspace.plan?.exportLimit ?? DEFAULT_LIMITS.exportLimit;
    const count = await prisma.exportPack.count({
      where: { project: { workspaceId } },
    });
    if (count >= limit) {
      return { allowed: false, reason: `导出次数已达上限（${limit}）` };
    }
    return { allowed: true };
  }

  async checkClientSpaceQuota(workspaceId: string): Promise<QuotaResult> {
    const workspace = await this.getWorkspaceWithPlan(workspaceId);
    if (!workspace) {
      return { allowed: false, reason: "工作区不存在" };
    }
    const limit = workspace.plan?.clientSpaceLimit ?? DEFAULT_LIMITS.clientSpaceLimit;
    const count = await prisma.clientSpace.count({ where: { workspaceId } });
    if (count >= limit) {
      return { allowed: false, reason: `客户空间数量已达上限（${limit}）` };
    }
    return { allowed: true };
  }

  async checkBrandPackQuota(workspaceId: string): Promise<QuotaResult> {
    const workspace = await this.getWorkspaceWithPlan(workspaceId);
    if (!workspace) {
      return { allowed: false, reason: "工作区不存在" };
    }
    const limit = workspace.plan?.brandPackLimit ?? DEFAULT_LIMITS.brandPackLimit;
    const count = await prisma.brandPack.count({
      where: { clientSpace: { workspaceId } },
    });
    if (count >= limit) {
      return { allowed: false, reason: `品牌包数量已达上限（${limit}）` };
    }
    return { allowed: true };
  }

  async checkSeriesPackQuota(workspaceId: string): Promise<QuotaResult> {
    const workspace = await this.getWorkspaceWithPlan(workspaceId);
    if (!workspace) {
      return { allowed: false, reason: "工作区不存在" };
    }
    const limit = workspace.plan?.seriesPackLimit ?? DEFAULT_LIMITS.seriesPackLimit;
    const count = await prisma.seriesPack.count({
      where: { clientSpace: { workspaceId } },
    });
    if (count >= limit) {
      return { allowed: false, reason: `系列资产包数量已达上限（${limit}）` };
    }
    return { allowed: true };
  }

  async checkMemberQuota(workspaceId: string): Promise<QuotaResult> {
    const workspace = await this.getWorkspaceWithPlan(workspaceId);
    if (!workspace) {
      return { allowed: false, reason: "工作区不存在" };
    }
    const limit = workspace.plan?.memberLimit ?? DEFAULT_LIMITS.memberLimit;
    const count = await prisma.member.count({
      where: { workspaceId, status: { in: ["active", "invited"] } },
    });
    if (count >= limit) {
      return { allowed: false, reason: `成员数量已达上限（${limit}）` };
    }
    return { allowed: true };
  }
}

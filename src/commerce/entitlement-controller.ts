import { prisma } from '@/lib/prisma'

export interface FeatureFlags {
  batchEnabled: boolean
  multiPlatformEnabled: boolean
  reviewEnabled: boolean
  exportEnabled: boolean
}

export interface Quotas {
  memberLimit: number
  clientSpaceLimit: number
  brandPackLimit: number
  seriesPackLimit: number
  projectLimit: number
  exportLimit: number
  monthlyCredits: number
}

export interface WorkspaceEntitlements {
  featureFlags: FeatureFlags
  quotas: Quotas
}

const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  batchEnabled: false,
  multiPlatformEnabled: false,
  reviewEnabled: true,
  exportEnabled: true,
}

const DEFAULT_QUOTAS: Quotas = {
  memberLimit: 0,
  clientSpaceLimit: 0,
  brandPackLimit: 0,
  seriesPackLimit: 0,
  projectLimit: 0,
  exportLimit: 0,
  monthlyCredits: 0,
}

const FLAG_KEYS: (keyof FeatureFlags)[] = [
  'batchEnabled',
  'multiPlatformEnabled',
  'reviewEnabled',
  'exportEnabled',
]

export class EntitlementController {
  async getWorkspaceEntitlements(workspaceId: string): Promise<WorkspaceEntitlements> {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { plan: true },
    })

    if (!workspace) {
      return { featureFlags: { ...DEFAULT_FEATURE_FLAGS }, quotas: { ...DEFAULT_QUOTAS } }
    }

    if (!workspace.plan) {
      return { featureFlags: { ...DEFAULT_FEATURE_FLAGS }, quotas: { ...DEFAULT_QUOTAS } }
    }

    const plan = workspace.plan

    return {
      featureFlags: {
        batchEnabled: plan.batchEnabled,
        multiPlatformEnabled: plan.multiPlatformEnabled,
        reviewEnabled: plan.reviewEnabled,
        exportEnabled: plan.exportEnabled,
      },
      quotas: {
        memberLimit: plan.memberLimit,
        clientSpaceLimit: plan.clientSpaceLimit,
        brandPackLimit: plan.brandPackLimit,
        seriesPackLimit: plan.seriesPackLimit,
        projectLimit: plan.projectLimit,
        exportLimit: plan.exportLimit,
        monthlyCredits: plan.monthlyCredits,
      },
    }
  }

  async getFeatureFlag(workspaceId: string, flagName: keyof FeatureFlags): Promise<boolean> {
    if (!FLAG_KEYS.includes(flagName)) {
      return false
    }

    const entitlements = await this.getWorkspaceEntitlements(workspaceId)
    return entitlements.featureFlags[flagName]
  }
}

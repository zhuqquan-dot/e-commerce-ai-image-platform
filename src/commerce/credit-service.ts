import { prisma } from '@/lib/prisma'

export interface CreditBalance {
  monthlyCredits: number
  fuelCredits: number
  totalCredits: number
}

export interface ConsumeResult {
  success: boolean
  balanceAfter: CreditBalance
}

export class CreditService {
  async grantMonthlyCredits(workspaceId: string, amount: number): Promise<CreditBalance> {
    return prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.findUnique({ where: { id: workspaceId } })
      if (!workspace) throw new Error(`Workspace not found: ${workspaceId}`)

      const updated = await tx.workspace.update({
        where: { id: workspaceId },
        data: { monthlyCredits: workspace.monthlyCredits + amount },
      })

      const balanceAfter = updated.monthlyCredits + updated.fuelCredits

      await tx.creditRecord.create({
        data: {
          workspaceId,
          amount,
          balanceAfter,
          reason: 'monthly_grant',
        },
      })

      return {
        monthlyCredits: updated.monthlyCredits,
        fuelCredits: updated.fuelCredits,
        totalCredits: balanceAfter,
      }
    })
  }

  async consumeCredits(
    workspaceId: string,
    amount: number,
    reason: string,
    taskId?: string,
  ): Promise<ConsumeResult> {
    return prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.findUnique({ where: { id: workspaceId } })
      if (!workspace) throw new Error(`Workspace not found: ${workspaceId}`)

      let remaining = amount
      let monthlyUsed = 0
      let fuelUsed = 0

      if (workspace.monthlyCredits >= remaining) {
        monthlyUsed = remaining
        remaining = 0
      } else {
        monthlyUsed = workspace.monthlyCredits
        remaining -= workspace.monthlyCredits
        fuelUsed = Math.min(remaining, workspace.fuelCredits)
      }

      const totalUsed = monthlyUsed + fuelUsed
      if (totalUsed < amount) {
        return {
          success: false,
          balanceAfter: {
            monthlyCredits: workspace.monthlyCredits,
            fuelCredits: workspace.fuelCredits,
            totalCredits: workspace.monthlyCredits + workspace.fuelCredits,
          },
        }
      }

      const updated = await tx.workspace.update({
        where: { id: workspaceId },
        data: {
          monthlyCredits: workspace.monthlyCredits - monthlyUsed,
          fuelCredits: workspace.fuelCredits - fuelUsed,
        },
      })

      const balanceAfter = updated.monthlyCredits + updated.fuelCredits

      await tx.creditRecord.create({
        data: {
          workspaceId,
          taskId: taskId ?? null,
          amount: -amount,
          balanceAfter,
          reason,
        },
      })

      return {
        success: true,
        balanceAfter: {
          monthlyCredits: updated.monthlyCredits,
          fuelCredits: updated.fuelCredits,
          totalCredits: balanceAfter,
        },
      }
    })
  }

  async purchaseFuelPack(workspaceId: string, fuelPackId: string): Promise<CreditBalance> {
    return prisma.$transaction(async (tx) => {
      const fuelPack = await tx.fuelPack.findUnique({ where: { id: fuelPackId } })
      if (!fuelPack) throw new Error(`FuelPack not found: ${fuelPackId}`)
      if (!fuelPack.isActive) throw new Error(`FuelPack is not active: ${fuelPackId}`)

      const workspace = await tx.workspace.findUnique({ where: { id: workspaceId } })
      if (!workspace) throw new Error(`Workspace not found: ${workspaceId}`)

      const updated = await tx.workspace.update({
        where: { id: workspaceId },
        data: { fuelCredits: workspace.fuelCredits + fuelPack.credits },
      })

      const balanceAfter = updated.monthlyCredits + updated.fuelCredits

      await tx.creditRecord.create({
        data: {
          workspaceId,
          amount: fuelPack.credits,
          balanceAfter,
          reason: 'fuel_pack_purchase',
        },
      })

      return {
        monthlyCredits: updated.monthlyCredits,
        fuelCredits: updated.fuelCredits,
        totalCredits: balanceAfter,
      }
    })
  }

  async getCreditBalance(workspaceId: string): Promise<CreditBalance> {
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } })
    if (!workspace) throw new Error(`Workspace not found: ${workspaceId}`)

    return {
      monthlyCredits: workspace.monthlyCredits,
      fuelCredits: workspace.fuelCredits,
      totalCredits: workspace.monthlyCredits + workspace.fuelCredits,
    }
  }

  async getCreditHistory(workspaceId: string) {
    return prisma.creditRecord.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    })
  }
}

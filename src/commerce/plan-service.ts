import { prisma } from "@/lib/prisma";

export class PlanService {
  async getActivePlans() {
    return prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
    });
  }

  async getPlanById(id: string) {
    return prisma.plan.findUnique({ where: { id } });
  }

  async createOrUpdatePlan(data: {
    id?: string;
    name: string;
    monthlyPrice?: number;
    yearlyPrice?: number;
    monthlyCredits?: number;
    memberLimit?: number;
    clientSpaceLimit?: number;
    brandPackLimit?: number;
    seriesPackLimit?: number;
    projectLimit?: number;
    exportLimit?: number;
    batchEnabled?: boolean;
    multiPlatformEnabled?: boolean;
    reviewEnabled?: boolean;
    exportEnabled?: boolean;
    yearlyDiscount?: number;
    creditCarryOverRatio?: number;
    displayOrder?: number;
    isActive?: boolean;
  }) {
    if (data.id) {
      const existing = await prisma.plan.findUnique({ where: { id: data.id } });
      if (existing) {
        return prisma.plan.update({
          where: { id: data.id },
          data: {
            name: data.name,
            monthlyPrice: data.monthlyPrice,
            yearlyPrice: data.yearlyPrice,
            monthlyCredits: data.monthlyCredits,
            memberLimit: data.memberLimit,
            clientSpaceLimit: data.clientSpaceLimit,
            brandPackLimit: data.brandPackLimit,
            seriesPackLimit: data.seriesPackLimit,
            projectLimit: data.projectLimit,
            exportLimit: data.exportLimit,
            batchEnabled: data.batchEnabled,
            multiPlatformEnabled: data.multiPlatformEnabled,
            reviewEnabled: data.reviewEnabled,
            exportEnabled: data.exportEnabled,
            yearlyDiscount: data.yearlyDiscount,
            creditCarryOverRatio: data.creditCarryOverRatio,
            displayOrder: data.displayOrder,
            isActive: data.isActive,
          },
        });
      }
    }

    return prisma.plan.create({
      data: {
        name: data.name,
        monthlyPrice: data.monthlyPrice ?? 0,
        yearlyPrice: data.yearlyPrice ?? 0,
        monthlyCredits: data.monthlyCredits ?? 0,
        memberLimit: data.memberLimit ?? 1,
        clientSpaceLimit: data.clientSpaceLimit ?? 1,
        brandPackLimit: data.brandPackLimit ?? 1,
        seriesPackLimit: data.seriesPackLimit ?? 3,
        projectLimit: data.projectLimit ?? 5,
        exportLimit: data.exportLimit ?? 10,
        batchEnabled: data.batchEnabled ?? false,
        multiPlatformEnabled: data.multiPlatformEnabled ?? false,
        reviewEnabled: data.reviewEnabled ?? true,
        exportEnabled: data.exportEnabled ?? true,
        yearlyDiscount: data.yearlyDiscount ?? 0.0,
        creditCarryOverRatio: data.creditCarryOverRatio ?? 0.0,
        displayOrder: data.displayOrder ?? 0,
        isActive: data.isActive ?? true,
      },
    });
  }
}

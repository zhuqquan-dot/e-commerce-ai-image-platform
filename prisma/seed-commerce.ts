import { createPrismaClient } from "../src/lib/prisma";

const prisma = createPrismaClient();

async function main() {
  const plans = [
    {
      id: "plan-1",
      name: "个人版",
      monthlyPrice: 99,
      yearlyPrice: 990,
      monthlyCredits: 3000,
      memberLimit: 1,
      clientSpaceLimit: 1,
      brandPackLimit: 1,
      seriesPackLimit: 3,
      projectLimit: 5,
      exportLimit: 10,
      batchEnabled: false,
      multiPlatformEnabled: false,
      reviewEnabled: true,
      exportEnabled: true,
      yearlyDiscount: 0.17,
      creditCarryOverRatio: 0.0,
      displayOrder: 1,
      isActive: true,
    },
    {
      id: "plan-2",
      name: "团队版",
      monthlyPrice: 399,
      yearlyPrice: 3990,
      monthlyCredits: 15000,
      memberLimit: 10,
      clientSpaceLimit: 5,
      brandPackLimit: 3,
      seriesPackLimit: 10,
      projectLimit: 30,
      exportLimit: 50,
      batchEnabled: true,
      multiPlatformEnabled: true,
      reviewEnabled: true,
      exportEnabled: true,
      yearlyDiscount: 0.17,
      creditCarryOverRatio: 0.1,
      displayOrder: 2,
      isActive: true,
    },
    {
      id: "plan-3",
      name: "运营公司版",
      monthlyPrice: 1299,
      yearlyPrice: 12990,
      monthlyCredits: 60000,
      memberLimit: 30,
      clientSpaceLimit: 20,
      brandPackLimit: 10,
      seriesPackLimit: 50,
      projectLimit: 100,
      exportLimit: 200,
      batchEnabled: true,
      multiPlatformEnabled: true,
      reviewEnabled: true,
      exportEnabled: true,
      yearlyDiscount: 0.17,
      creditCarryOverRatio: 0.2,
      displayOrder: 3,
      isActive: true,
    },
    {
      id: "plan-4",
      name: "企业版",
      monthlyPrice: 2000,
      yearlyPrice: 20000,
      monthlyCredits: 200000,
      memberLimit: 999,
      clientSpaceLimit: 999,
      brandPackLimit: 999,
      seriesPackLimit: 999,
      projectLimit: 999,
      exportLimit: 999,
      batchEnabled: true,
      multiPlatformEnabled: true,
      reviewEnabled: true,
      exportEnabled: true,
      yearlyDiscount: 0.17,
      creditCarryOverRatio: 0.3,
      displayOrder: 4,
      isActive: true,
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { id: plan.id },
      update: plan,
      create: plan,
    });
  }

  const fuelPacks = [
    { id: "fuelpack-1", name: "小加油包", credits: 5000, price: 60, validityDays: 30, displayOrder: 1, isActive: true },
    { id: "fuelpack-2", name: "中加油包", credits: 20000, price: 200, validityDays: 60, displayOrder: 2, isActive: true },
    { id: "fuelpack-3", name: "大加油包", credits: 50000, price: 450, validityDays: 90, displayOrder: 3, isActive: true },
  ];

  for (const fp of fuelPacks) {
    await prisma.fuelPack.upsert({
      where: { id: fp.id },
      update: fp,
      create: fp,
    });
  }

  console.log("Seed data created: 4 plans + 3 fuel packs");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

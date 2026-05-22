import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { BatchOrchestrator } from './batch-orchestrator';

const TEST_PREFIX = 'batch-orch';
const TEST_PARENT_ID = `${TEST_PREFIX}-parent`;
const TEST_CHILD_A_ID = `${TEST_PREFIX}-child-a`;
const TEST_CHILD_B_ID = `${TEST_PREFIX}-child-b`;
const TEST_CHILD_C_ID = `${TEST_PREFIX}-child-c`;
const TEST_PRODUCT_ID = `${TEST_PREFIX}-product`;
const TEST_PLATFORM = 'AMAZON';

beforeAll(async () => {
  await prisma.product.upsert({
    where: { id: TEST_PRODUCT_ID },
    update: { productName: '测试商品', category: '电子', mainColor: '黑' },
    create: { id: TEST_PRODUCT_ID, productName: '测试商品', category: '电子', mainColor: '黑' },
  });

  await prisma.platformRulePack.upsert({
    where: { platformName: TEST_PLATFORM },
    update: {},
    create: {
      platformName: TEST_PLATFORM,
      platformRegion: 'US',
      maxImages: 7,
      mainImageRatio: '1:1',
      mainImageSize: '2000x2000',
      maxFileSizeMb: 10,
      supportedSlots: JSON.stringify(['main_white', 'main_text', 'feature', 'scene']),
    },
  });

  await prisma.project.upsert({
    where: { id: TEST_PARENT_ID },
    update: { projectType: 'multi_product_batch', status: 'draft' },
    create: {
      id: TEST_PARENT_ID,
      productId: TEST_PRODUCT_ID,
      projectName: '批量编排测试父项目',
      projectType: 'multi_product_batch',
      status: 'draft',
      selectedPlatforms: JSON.stringify([TEST_PLATFORM]),
    },
  });

  for (const childId of [TEST_CHILD_A_ID, TEST_CHILD_B_ID, TEST_CHILD_C_ID]) {
    await prisma.project.upsert({
      where: { id: childId },
      update: { status: 'planned' },
      create: {
        id: childId,
        productId: TEST_PRODUCT_ID,
        parentProjectId: TEST_PARENT_ID,
        projectName: `子项目 ${childId.slice(-1)}`,
        projectType: 'single_product_single_platform',
        status: 'planned',
        selectedPlatforms: JSON.stringify([TEST_PLATFORM]),
      },
    });
  }

  const createBundlePlan = async (projectId: string, planId: string, status: string) => {
    await prisma.bundlePlan.upsert({
      where: { id: planId },
      update: { status },
      create: { id: planId, projectId, platform: TEST_PLATFORM, status },
    });
  };

  await createBundlePlan(TEST_CHILD_A_ID, `${TEST_PREFIX}-plan-a`, 'planned');
  await createBundlePlan(TEST_CHILD_B_ID, `${TEST_PREFIX}-plan-b`, 'planned');
  await createBundlePlan(TEST_CHILD_C_ID, `${TEST_PREFIX}-plan-c`, 'planned');

  const createSlot = async (slotId: string, planId: string, slotType: string, isAnchor: boolean, seq: number) => {
    await prisma.bundleSlot.upsert({
      where: { id: slotId },
      update: { slotType, isAnchor, sequenceOrder: seq },
      create: { id: slotId, bundlePlanId: planId, slotType, isAnchor, isRequired: true, sequenceOrder: seq },
    });
  };

  await createSlot(`${TEST_PREFIX}-slot-a1`, `${TEST_PREFIX}-plan-a`, 'main_white', true, 0);
  await createSlot(`${TEST_PREFIX}-slot-a2`, `${TEST_PREFIX}-plan-a`, 'main_text', false, 1);
  await createSlot(`${TEST_PREFIX}-slot-a3`, `${TEST_PREFIX}-plan-a`, 'feature', false, 2);

  await createSlot(`${TEST_PREFIX}-slot-b1`, `${TEST_PREFIX}-plan-b`, 'main_white', true, 0);
  await createSlot(`${TEST_PREFIX}-slot-b2`, `${TEST_PREFIX}-plan-b`, 'scene', false, 1);

  await createSlot(`${TEST_PREFIX}-slot-c1`, `${TEST_PREFIX}-plan-c`, 'feature', false, 0);
  await createSlot(`${TEST_PREFIX}-slot-c2`, `${TEST_PREFIX}-plan-c`, 'scene', false, 1);
});

afterAll(async () => {
  const slotIds = [
    `${TEST_PREFIX}-slot-a1`, `${TEST_PREFIX}-slot-a2`, `${TEST_PREFIX}-slot-a3`,
    `${TEST_PREFIX}-slot-b1`, `${TEST_PREFIX}-slot-b2`,
    `${TEST_PREFIX}-slot-c1`, `${TEST_PREFIX}-slot-c2`,
  ];
  const planIds = [`${TEST_PREFIX}-plan-a`, `${TEST_PREFIX}-plan-b`, `${TEST_PREFIX}-plan-c`];
  const childIds = [TEST_CHILD_A_ID, TEST_CHILD_B_ID, TEST_CHILD_C_ID];

  await prisma.generationTask.deleteMany({ where: { projectId: { in: childIds } } });
  await prisma.bundleSlot.deleteMany({ where: { id: { in: slotIds } } });
  await prisma.bundlePlan.deleteMany({ where: { id: { in: planIds } } });
  await prisma.project.deleteMany({ where: { id: { in: [TEST_PARENT_ID, ...childIds] } } });
  await prisma.platformRulePack.deleteMany({ where: { platformName: TEST_PLATFORM } });
  await prisma.product.deleteMany({ where: { id: TEST_PRODUCT_ID } });
});

describe('BatchOrchestrator', () => {
  const orchestrator = new BatchOrchestrator();

  describe('orchestrateBatch', () => {
    it('正常批量编排：创建所有子项目的任务并按锚点优先级排列', async () => {
      const result = await orchestrator.orchestrateBatch(TEST_PARENT_ID);

      expect(result.parentProjectId).toBe(TEST_PARENT_ID);
      expect(result.summary.totalTasks).toBe(7);
      expect(result.summary.anchorTasks).toBe(2);
      expect(result.summary.created).toBe(7);
      expect(result.summary.failed).toBe(0);
      expect(result.summary.blocked).toBe(0);
      expect(result.subProjects).toHaveLength(3);

      const created = result.subProjects.filter((s) => s.status === 'created');
      expect(created).toHaveLength(3);

      const childA = result.subProjects.find((s) => s.projectId === TEST_CHILD_A_ID);
      expect(childA).toBeDefined();
      expect(childA!.status).toBe('created');
      expect(childA!.taskCount).toBe(3);
      expect(childA!.anchorDone).toBe(1);

      const childC = result.subProjects.find((s) => s.projectId === TEST_CHILD_C_ID);
      expect(childC).toBeDefined();
      expect(childC!.status).toBe('created');
      expect(childC!.taskCount).toBe(2);
      expect(childC!.anchorDone).toBe(0);

      const tasks = await prisma.generationTask.findMany({
        where: { projectId: { in: [TEST_CHILD_A_ID, TEST_CHILD_B_ID, TEST_CHILD_C_ID] } },
        include: { bundleSlot: true },
      });

      const anchorTasks = tasks.filter((t) => t.bundleSlot.isAnchor);
      expect(anchorTasks).toHaveLength(2);
      anchorTasks.forEach((t) => {
        expect(t.creditCost).toBe(2);
        expect(t.status).toBe('pending');
      });

      const normalTasks = tasks.filter((t) => !t.bundleSlot.isAnchor);
      expect(normalTasks).toHaveLength(5);
      normalTasks.forEach((t) => {
        expect(t.creditCost).toBe(1);
      });
    });

    it('不存在的父项目抛出错误', async () => {
      await expect(orchestrator.orchestrateBatch('non-existent-id')).rejects.toThrow('Parent project not found');
    });

    it('没有子项目时抛出错误', async () => {
      const emptyParentId = `${TEST_PREFIX}-empty-parent`;

      await prisma.project.create({
        data: {
          id: emptyParentId,
          productId: TEST_PRODUCT_ID,
          projectName: '空父项目',
          projectType: 'multi_product_batch',
          status: 'draft',
          selectedPlatforms: JSON.stringify([TEST_PLATFORM]),
        },
      });

      try {
        await expect(orchestrator.orchestrateBatch(emptyParentId)).rejects.toThrow('No child projects found');
      } finally {
        await prisma.project.delete({ where: { id: emptyParentId } });
      }
    });

    it('锚点失败隔离：子项目未规划时该子项目被标记为锚点失败，其他不受影响', async () => {
      const failChildId = `${TEST_PREFIX}-child-fail`;
      const failPlanId = `${TEST_PREFIX}-plan-fail`;

      await prisma.project.create({
        data: {
          id: failChildId,
          productId: TEST_PRODUCT_ID,
          parentProjectId: TEST_PARENT_ID,
          projectName: '失败子项目',
          projectType: 'single_product_single_platform',
          status: 'draft',
          selectedPlatforms: JSON.stringify([TEST_PLATFORM]),
        },
      });

      await prisma.bundlePlan.create({
        data: {
          id: failPlanId,
          projectId: failChildId,
          platform: TEST_PLATFORM,
          status: 'draft',
        },
      });

      await prisma.bundleSlot.create({
        data: {
          id: `${TEST_PREFIX}-slot-fail1`,
          bundlePlanId: failPlanId,
          slotType: 'main_white',
          isAnchor: true,
          isRequired: true,
          sequenceOrder: 0,
        },
      });

      await prisma.bundleSlot.create({
        data: {
          id: `${TEST_PREFIX}-slot-fail2`,
          bundlePlanId: failPlanId,
          slotType: 'feature',
          isAnchor: false,
          isRequired: true,
          sequenceOrder: 1,
        },
      });

      try {
        const result = await orchestrator.orchestrateBatch(TEST_PARENT_ID);

        expect(result.subProjects).toHaveLength(4);
        expect(result.summary.totalTasks).toBe(9);
        expect(result.summary.anchorTasks).toBe(3);
        expect(result.summary.failed).toBe(1);
        expect(result.summary.blocked).toBe(2);
        expect(result.summary.created).toBe(7);

        const failedProject = result.subProjects.find((s) => s.projectId === failChildId);
        expect(failedProject).toBeDefined();
        expect(failedProject!.status).toBe('anchor_failed');
        expect(failedProject!.taskCount).toBe(2);
        expect(failedProject!.anchorDone).toBe(0);

        const createdProjects = result.subProjects.filter((s) => s.status === 'created');
        expect(createdProjects).toHaveLength(3);

        const failedTasks = await prisma.generationTask.findMany({
          where: { projectId: failChildId },
        });
        expect(failedTasks).toHaveLength(0);
      } finally {
        await prisma.generationTask.deleteMany({ where: { projectId: failChildId } });
        await prisma.bundleSlot.deleteMany({ where: { id: { in: [`${TEST_PREFIX}-slot-fail1`, `${TEST_PREFIX}-slot-fail2`] } } });
        await prisma.bundlePlan.deleteMany({ where: { id: failPlanId } });
        await prisma.project.delete({ where: { id: failChildId } });
      }
    });

    it('重复调用不会创建重复任务', async () => {
      const firstResult = await orchestrator.orchestrateBatch(TEST_PARENT_ID);
      expect(firstResult.summary.created).toBeGreaterThan(0);

      const secondResult = await orchestrator.orchestrateBatch(TEST_PARENT_ID);

      expect(secondResult.summary.created).toBe(firstResult.summary.created);
      expect(secondResult.summary.failed).toBe(0);
    });
  });
});

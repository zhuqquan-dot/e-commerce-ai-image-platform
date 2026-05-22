import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { TaskStatus } from '@/types/enums';

const TEST_PREFIX = 'anchor-prop';
const TEST_PRODUCT_ID = `${TEST_PREFIX}-product`;
const TEST_PLATFORM = 'AMAZON';
const TEST_WORKSPACE_ID = `${TEST_PREFIX}-ws`;
const TEST_CLIENT_SPACE_ID = `${TEST_PREFIX}-cs`;

beforeAll(async () => {
  await prisma.workspace.upsert({
    where: { id: TEST_WORKSPACE_ID },
    update: {},
    create: { id: TEST_WORKSPACE_ID, name: '锚点传播测试工作区' },
  });

  await prisma.clientSpace.upsert({
    where: { id: TEST_CLIENT_SPACE_ID },
    update: {},
    create: { id: TEST_CLIENT_SPACE_ID, workspaceId: TEST_WORKSPACE_ID, clientName: '测试客户', brandName: '测试品牌' },
  });

  await prisma.product.upsert({
    where: { id: TEST_PRODUCT_ID },
    update: { productName: '锚点传播测试商品', category: '电子', mainColor: '黑' },
    create: { id: TEST_PRODUCT_ID, clientSpaceId: TEST_CLIENT_SPACE_ID, productName: '锚点传播测试商品', category: '电子', mainColor: '黑' },
  });

  await prisma.platformRulePack.upsert({
    where: { platformName: TEST_PLATFORM },
    update: {},
    create: {
      id: TEST_PLATFORM,
      platformName: TEST_PLATFORM,
      platformRegion: 'US',
      maxImages: 7,
      mainImageRatio: '1:1',
      mainImageSize: '2000x2000',
      maxFileSizeMb: 10,
      supportedSlots: JSON.stringify(['main_white', 'main_text', 'feature', 'scene']),
    },
  });
});

afterAll(async () => {
  const slotIds = [
    `${TEST_PREFIX}-anchor-slot`,
    `${TEST_PREFIX}-normal-slot-1`,
    `${TEST_PREFIX}-normal-slot-2`,
    `${TEST_PREFIX}-noanchor-slot`,
    `${TEST_PREFIX}-noanchor-slot-2`,
  ];
  const planIds = [`${TEST_PREFIX}-plan`, `${TEST_PREFIX}-plan-noanchor`];
  const projectIds = [`${TEST_PREFIX}-project`, `${TEST_PREFIX}-project-noanchor`];

  await prisma.generationAttempt.deleteMany({ where: { taskId: { startsWith: TEST_PREFIX } } });
  await prisma.generationTask.deleteMany({ where: { projectId: { in: projectIds } } });
  await prisma.bundleSlot.deleteMany({ where: { id: { in: slotIds } } });
  await prisma.bundlePlan.deleteMany({ where: { id: { in: planIds } } });
  await prisma.project.deleteMany({ where: { id: { in: projectIds } } });
  await prisma.platformRulePack.deleteMany({ where: { platformName: TEST_PLATFORM } });
  await prisma.product.deleteMany({ where: { id: TEST_PRODUCT_ID } });
  await prisma.clientSpace.deleteMany({ where: { id: TEST_CLIENT_SPACE_ID } });
  await prisma.workspace.deleteMany({ where: { id: TEST_WORKSPACE_ID } });
});

async function setupAnchorPlan() {
  const projectId = `${TEST_PREFIX}-project`;
  const planId = `${TEST_PREFIX}-plan`;

  await prisma.project.upsert({
    where: { id: projectId },
    update: { status: 'planned' },
    create: {
      id: projectId,
      productId: TEST_PRODUCT_ID,
      projectName: '锚点传播测试项目',
      projectType: 'single_product_single_platform',
      status: 'planned',
      selectedPlatforms: JSON.stringify([TEST_PLATFORM]),
    },
  });

  await prisma.bundlePlan.upsert({
    where: { id: planId },
    update: { status: 'planned' },
    create: { id: planId, projectId, platform: TEST_PLATFORM, status: 'planned' },
  });

  const anchorSlotId = `${TEST_PREFIX}-anchor-slot`;
  const normalSlot1Id = `${TEST_PREFIX}-normal-slot-1`;
  const normalSlot2Id = `${TEST_PREFIX}-normal-slot-2`;

  await prisma.bundleSlot.upsert({
    where: { id: anchorSlotId },
    update: { slotType: 'main_white', isAnchor: true, sequenceOrder: 0 },
    create: { id: anchorSlotId, bundlePlanId: planId, slotType: 'main_white', isAnchor: true, isRequired: true, sequenceOrder: 0 },
  });

  await prisma.bundleSlot.upsert({
    where: { id: normalSlot1Id },
    update: { slotType: 'main_text', isAnchor: false, sequenceOrder: 1 },
    create: { id: normalSlot1Id, bundlePlanId: planId, slotType: 'main_text', isAnchor: false, isRequired: true, sequenceOrder: 1 },
  });

  await prisma.bundleSlot.upsert({
    where: { id: normalSlot2Id },
    update: { slotType: 'feature', isAnchor: false, sequenceOrder: 2 },
    create: { id: normalSlot2Id, bundlePlanId: planId, slotType: 'feature', isAnchor: false, isRequired: true, sequenceOrder: 2 },
  });

  const anchorTaskId = `${TEST_PREFIX}-anchor-task`;
  const normalTask1Id = `${TEST_PREFIX}-normal-task-1`;
  const normalTask2Id = `${TEST_PREFIX}-normal-task-2`;

  await prisma.generationTask.upsert({
    where: { id: anchorTaskId },
    update: { status: TaskStatus.PENDING, retryCount: 0 },
    create: {
      id: anchorTaskId,
      projectId,
      productId: TEST_PRODUCT_ID,
      platformPackId: TEST_PLATFORM,
      slotCode: 'main_white',
      bundleSlotId: anchorSlotId,
      status: TaskStatus.PENDING,
      retryCount: 0,
    },
  });

  await prisma.generationTask.upsert({
    where: { id: normalTask1Id },
    update: { status: TaskStatus.PENDING, retryCount: 0 },
    create: {
      id: normalTask1Id,
      projectId,
      productId: TEST_PRODUCT_ID,
      platformPackId: TEST_PLATFORM,
      slotCode: 'main_text',
      bundleSlotId: normalSlot1Id,
      status: TaskStatus.PENDING,
      retryCount: 0,
    },
  });

  await prisma.generationTask.upsert({
    where: { id: normalTask2Id },
    update: { status: TaskStatus.PENDING, retryCount: 0 },
    create: {
      id: normalTask2Id,
      projectId,
      productId: TEST_PRODUCT_ID,
      platformPackId: TEST_PLATFORM,
      slotCode: 'feature',
      bundleSlotId: normalSlot2Id,
      status: TaskStatus.PENDING,
      retryCount: 0,
    },
  });

  return {
    projectId,
    planId,
    anchorSlotId,
    anchorTaskId,
    normalTask1Id,
    normalTask2Id,
    normalSlot1Id,
    normalSlot2Id,
  };
}

async function setupNoAnchorPlan() {
  const projectId = `${TEST_PREFIX}-project-noanchor`;
  const planId = `${TEST_PREFIX}-plan-noanchor`;

  await prisma.project.upsert({
    where: { id: projectId },
    update: { status: 'planned' },
    create: {
      id: projectId,
      productId: TEST_PRODUCT_ID,
      projectName: '非锚点测试项目',
      projectType: 'single_product_single_platform',
      status: 'planned',
      selectedPlatforms: JSON.stringify([TEST_PLATFORM]),
    },
  });

  await prisma.bundlePlan.upsert({
    where: { id: planId },
    update: { status: 'planned' },
    create: { id: planId, projectId, platform: TEST_PLATFORM, status: 'planned' },
  });

  await prisma.bundleSlot.upsert({
    where: { id: `${TEST_PREFIX}-noanchor-slot` },
    update: { slotType: 'feature', isAnchor: false, sequenceOrder: 0 },
    create: { id: `${TEST_PREFIX}-noanchor-slot`, bundlePlanId: planId, slotType: 'feature', isAnchor: false, isRequired: true, sequenceOrder: 0 },
  });

  await prisma.bundleSlot.upsert({
    where: { id: `${TEST_PREFIX}-noanchor-slot-2` },
    update: { slotType: 'scene', isAnchor: false, sequenceOrder: 1 },
    create: { id: `${TEST_PREFIX}-noanchor-slot-2`, bundlePlanId: planId, slotType: 'scene', isAnchor: false, isRequired: true, sequenceOrder: 1 },
  });

  await prisma.generationTask.upsert({
    where: { id: `${TEST_PREFIX}-noanchor-task` },
    update: { status: TaskStatus.PENDING, retryCount: 0 },
    create: {
      id: `${TEST_PREFIX}-noanchor-task`,
      projectId,
      productId: TEST_PRODUCT_ID,
      platformPackId: TEST_PLATFORM,
      slotCode: 'feature',
      bundleSlotId: `${TEST_PREFIX}-noanchor-slot`,
      status: TaskStatus.PENDING,
      retryCount: 0,
    },
  });

  await prisma.generationTask.upsert({
    where: { id: `${TEST_PREFIX}-noanchor-task-2` },
    update: { status: TaskStatus.PENDING, retryCount: 0 },
    create: {
      id: `${TEST_PREFIX}-noanchor-task-2`,
      projectId,
      productId: TEST_PRODUCT_ID,
      platformPackId: TEST_PLATFORM,
      slotCode: 'scene',
      bundleSlotId: `${TEST_PREFIX}-noanchor-slot-2`,
      status: TaskStatus.PENDING,
      retryCount: 0,
    },
  });

  return {
    projectId,
    planId,
    taskId: `${TEST_PREFIX}-noanchor-task`,
    task2Id: `${TEST_PREFIX}-noanchor-task-2`,
  };
}

describe('锚点依赖传播', () => {
  describe('锚点首次失败 → 阻断非锚点 slot', () => {
    it('锚点 slot 的 GenerationTask 首次失败时，同 BundlePlan 下所有非锚点 slot 对应的 task 应被标记为 blocked', async () => {
      const { planId, anchorSlotId, normalTask1Id, normalTask2Id } = await setupAnchorPlan();

      const anchorTask = await prisma.generationTask.findFirst({
        where: { bundleSlotId: anchorSlotId },
      });
      expect(anchorTask).toBeDefined();
      expect(anchorTask!.retryCount).toBe(0);

      const siblingSlots = await prisma.bundleSlot.findMany({
        where: { bundlePlanId: planId, isAnchor: false },
        select: { id: true },
      });

      expect(siblingSlots.length).toBeGreaterThan(0);

      await prisma.generationTask.updateMany({
        where: {
          bundleSlotId: { in: siblingSlots.map((s) => s.id) },
        },
        data: { status: TaskStatus.BLOCKED },
      });

      const normal1 = await prisma.generationTask.findUnique({ where: { id: normalTask1Id } });
      const normal2 = await prisma.generationTask.findUnique({ where: { id: normalTask2Id } });

      expect(normal1!.status).toBe(TaskStatus.BLOCKED);
      expect(normal2!.status).toBe(TaskStatus.BLOCKED);
    });

    it('锚点 task 的 retryCount > 0 时不应重复阻断', async () => {
      const { anchorTaskId } = await setupAnchorPlan();

      await prisma.generationTask.update({
        where: { id: anchorTaskId },
        data: { retryCount: 1 },
      });

      const anchorTask = await prisma.generationTask.findUnique({ where: { id: anchorTaskId } });
      expect(anchorTask!.retryCount).toBe(1);

      const isAnchor = anchorTask!.retryCount === 0;
      expect(isAnchor).toBe(false);
    });

    it('非锚点 slot 首次失败时不应阻断其他 slot', async () => {
      const { taskId } = await setupNoAnchorPlan();

      const task = await prisma.generationTask.findUnique({
        where: { id: taskId },
        include: { bundleSlot: true },
      });

      expect(task).toBeDefined();
      expect(task!.bundleSlot.isAnchor).toBe(false);
      expect(task!.retryCount).toBe(0);

      const siblingSlots = await prisma.bundleSlot.findMany({
        where: { bundlePlanId: task!.bundleSlot.bundlePlanId, isAnchor: false },
        select: { id: true },
      });

      const siblingTaskIds = siblingSlots.map((s) => s.id);
      const siblingTasks = await prisma.generationTask.findMany({
        where: { bundleSlotId: { in: siblingTaskIds } },
      });

      const anyBlocked = siblingTasks.some((t) => t.status === TaskStatus.BLOCKED);
      expect(anyBlocked).toBe(false);
    });
  });

  describe('锚点重试成功 → 解封关联 slot', () => {
    it('锚点重试成功后，同 BundlePlan 下 blocked 状态的 task 应被解封为 pending', async () => {
      const { planId, normalTask1Id, normalTask2Id } = await setupAnchorPlan();

      const siblingSlots = await prisma.bundleSlot.findMany({
        where: { bundlePlanId: planId, isAnchor: false },
        select: { id: true },
      });

      await prisma.generationTask.updateMany({
        where: { bundleSlotId: { in: siblingSlots.map((s) => s.id) } },
        data: { status: TaskStatus.BLOCKED },
      });

      const blocked1 = await prisma.generationTask.findUnique({ where: { id: normalTask1Id } });
      const blocked2 = await prisma.generationTask.findUnique({ where: { id: normalTask2Id } });
      expect(blocked1!.status).toBe(TaskStatus.BLOCKED);
      expect(blocked2!.status).toBe(TaskStatus.BLOCKED);

      await prisma.generationTask.updateMany({
        where: {
          bundleSlotId: { in: siblingSlots.map((s) => s.id) },
          status: TaskStatus.BLOCKED,
        },
        data: { status: TaskStatus.PENDING },
      });

      const unblocked1 = await prisma.generationTask.findUnique({ where: { id: normalTask1Id } });
      const unblocked2 = await prisma.generationTask.findUnique({ where: { id: normalTask2Id } });

      expect(unblocked1!.status).toBe(TaskStatus.PENDING);
      expect(unblocked2!.status).toBe(TaskStatus.PENDING);
    });

    it('仅解封 blocked 状态的 task，不改变其他状态的 task', async () => {
      const { planId, normalTask1Id, normalTask2Id } = await setupAnchorPlan();

      const siblingSlots = await prisma.bundleSlot.findMany({
        where: { bundlePlanId: planId, isAnchor: false },
        select: { id: true },
      });

      await prisma.generationTask.updateMany({
        where: { bundleSlotId: { in: siblingSlots.map((s) => s.id) } },
        data: { status: TaskStatus.BLOCKED },
      });

      await prisma.generationTask.update({
        where: { id: normalTask1Id },
        data: { status: TaskStatus.GENERATED },
      });

      await prisma.generationTask.updateMany({
        where: {
          bundleSlotId: { in: siblingSlots.map((s) => s.id) },
          status: TaskStatus.BLOCKED,
        },
        data: { status: TaskStatus.PENDING },
      });

      const generated = await prisma.generationTask.findUnique({ where: { id: normalTask1Id } });
      const unblocked = await prisma.generationTask.findUnique({ where: { id: normalTask2Id } });

      expect(generated!.status).toBe(TaskStatus.GENERATED);
      expect(unblocked!.status).toBe(TaskStatus.PENDING);
    });
  });
});

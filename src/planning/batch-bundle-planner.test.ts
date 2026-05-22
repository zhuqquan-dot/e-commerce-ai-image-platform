import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockBundlePlannerPlan = vi.fn();
const mockFindMany = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    project: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}));

vi.mock('./bundle-planner', () => ({
  BundlePlanner: vi.fn().mockImplementation(() => ({
    plan: (...args: unknown[]) => mockBundlePlannerPlan(...args),
  })),
}));

import { BatchBundlePlanner, type BatchPlanResult } from './batch-bundle-planner';

function makePlanResult(platform: string, slotCount: number, anchorCount: number, warnings: string[]) {
  const slots = [];
  for (let i = 0; i < slotCount; i++) {
    slots.push({
      slotType: i < anchorCount ? ('main_white' as const) : ('feature' as const),
      isAnchor: i < anchorCount,
      isRequired: true,
      sequenceOrder: i,
      exportNameSuggestion: `export_${i}.jpg`,
      ruleRefs: ['rule:allowedFormats'],
      warnings,
      maxCount: 1,
      minCount: 1,
    });
  }
  return [{ platform, slots }];
}

function makeChildProject(id: string, selectedPlatforms: string) {
  return {
    id,
    productId: `product-${id}`,
    projectName: `child-${id}`,
    clientSpaceId: 'space-1',
    parentProjectId: 'parent-1',
    projectType: 'single_product_single_platform',
    status: 'draft',
    selectedPlatforms,
    seriesPackId: null,
    inputMode: 'quick',
    bundleType: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('BatchBundlePlanner', () => {
  let planner: BatchBundlePlanner;

  beforeEach(() => {
    planner = new BatchBundlePlanner();
    mockFindMany.mockReset();
    mockBundlePlannerPlan.mockReset();
  });

  it('planBatch 正常批量规划', async () => {
    mockFindMany.mockResolvedValue([
      makeChildProject('child-1', JSON.stringify(['AMAZON'])),
      makeChildProject('child-2', JSON.stringify(['AMAZON', 'JD'])),
    ]);

    mockBundlePlannerPlan
      .mockResolvedValueOnce(makePlanResult('AMAZON', 6, 1, ['必须纯白背景 RGB(255,255,255)']))
      .mockResolvedValueOnce(makePlanResult('AMAZON', 6, 1, ['必须纯白背景 RGB(255,255,255)']));

    const result = await planner.planBatch('parent-1');

    expect(result.parentProjectId).toBe('parent-1');
    expect(result.summary.total).toBe(2);
    expect(result.summary.succeeded).toBe(2);
    expect(result.summary.failed).toBe(0);
    expect(result.summary.totalSlots).toBe(12);
    expect(result.summary.anchorSlots).toBe(2);
    expect(result.subProjects).toHaveLength(2);
    expect(result.subProjects[0].status).toBe('succeeded');
    expect(result.subProjects[0].slotCount).toBe(6);
    expect(result.subProjects[0].platforms).toEqual(['AMAZON']);
    expect(result.subProjects[1].status).toBe('succeeded');
    expect(result.warnings.length).toBe(1);
    expect(result.warnings[0].count).toBe(2);
  });

  it('planBatch 部分子项目失败', async () => {
    mockFindMany.mockResolvedValue([
      makeChildProject('child-1', JSON.stringify(['AMAZON'])),
      makeChildProject('child-2', JSON.stringify(['AMAZON'])),
      makeChildProject('child-3', JSON.stringify(['AMAZON'])),
    ]);

    mockBundlePlannerPlan
      .mockResolvedValueOnce(makePlanResult('AMAZON', 6, 1, ['警告A']))
      .mockRejectedValueOnce(new Error('Product not found'))
      .mockResolvedValueOnce(makePlanResult('AMAZON', 6, 1, ['警告A']));

    const result = await planner.planBatch('parent-1');

    expect(result.summary.total).toBe(3);
    expect(result.summary.succeeded).toBe(2);
    expect(result.summary.failed).toBe(1);
    expect(result.summary.totalSlots).toBe(12);
    expect(result.summary.anchorSlots).toBe(2);

    expect(result.subProjects[0].status).toBe('succeeded');
    expect(result.subProjects[1].status).toBe('failed');
    expect(result.subProjects[1].reason).toBe('Product not found');
    expect(result.subProjects[2].status).toBe('succeeded');
  });

  it('planBatch 无子项目时返回空结果', async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await planner.planBatch('empty-parent');

    expect(result.parentProjectId).toBe('empty-parent');
    expect(result.summary.total).toBe(0);
    expect(result.summary.succeeded).toBe(0);
    expect(result.summary.failed).toBe(0);
    expect(result.summary.totalSlots).toBe(0);
    expect(result.summary.anchorSlots).toBe(0);
    expect(result.subProjects).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('planBatch 全部子项目失败', async () => {
    mockFindMany.mockResolvedValue([
      makeChildProject('child-1', JSON.stringify(['AMAZON'])),
      makeChildProject('child-2', JSON.stringify(['AMAZON'])),
    ]);

    mockBundlePlannerPlan
      .mockRejectedValueOnce(new Error('Platform rule pack not found'))
      .mockRejectedValueOnce(new Error('No slot mappings'));

    const result = await planner.planBatch('parent-1');

    expect(result.summary.succeeded).toBe(0);
    expect(result.summary.failed).toBe(2);
    expect(result.summary.totalSlots).toBe(0);
    expect(result.summary.anchorSlots).toBe(0);
    expect(result.subProjects[0].status).toBe('failed');
    expect(result.subProjects[1].status).toBe('failed');
    expect(result.warnings).toHaveLength(0);
  });
});

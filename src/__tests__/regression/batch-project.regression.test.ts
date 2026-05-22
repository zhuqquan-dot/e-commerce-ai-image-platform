import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/projects/batch/route';
import { prisma } from '@/lib/prisma';

const TEST_CLIENT_SPACE_ID = 'batch-test-cs';
const TEST_PRODUCT_PREFIX = 'batch-test-p';

const testProducts = [
  { id: `${TEST_PRODUCT_PREFIX}-1`, productName: '测试商品A', category: '电子产品', mainColor: '黑色' },
  { id: `${TEST_PRODUCT_PREFIX}-2`, productName: '测试商品B', category: '家居用品', mainColor: '白色' },
  { id: `${TEST_PRODUCT_PREFIX}-3`, productName: '测试商品C', category: '服装', mainColor: '' },
  { id: `${TEST_PRODUCT_PREFIX}-4`, productName: '', category: '食品', mainColor: '红色' },
  { id: `${TEST_PRODUCT_PREFIX}-5`, productName: '测试商品E', category: '', mainColor: '蓝色' },
] as const;

beforeAll(async () => {
  for (const p of testProducts) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: { productName: p.productName, category: p.category, mainColor: p.mainColor, clientSpaceId: TEST_CLIENT_SPACE_ID },
      create: { id: p.id, productName: p.productName, category: p.category, mainColor: p.mainColor, clientSpaceId: TEST_CLIENT_SPACE_ID },
    });
  }
});

afterAll(async () => {
  const ids = testProducts.map((p) => p.id);
  await prisma.project.deleteMany({ where: { clientSpaceId: TEST_CLIENT_SPACE_ID } });
  await prisma.product.deleteMany({ where: { id: { in: ids } } });
});

function buildRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/projects/batch', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('批量项目创建 API', () => {
  it('正常批量创建：5个商品中3个有效2个被拦截', async () => {
    const req = buildRequest({
      projectName: '批量测试项目',
      clientSpaceId: TEST_CLIENT_SPACE_ID,
      productIds: testProducts.map((p) => p.id),
      platformNames: ['AMAZON', 'TAOBAO_TMALL'],
      inputMode: 'quick',
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.parentProject.projectName).toBe('批量测试项目');
    expect(body.parentProject.status).toBe('draft');
    expect(body.summary.total).toBe(5);
    expect(body.summary.created).toBe(3);
    expect(body.summary.blocked).toBe(2);
    expect(body.children).toHaveLength(3);
    expect(body.blocked).toHaveLength(2);

    const blockedReasons = body.blocked.map((b: { reason: string }) => b.reason);
    expect(blockedReasons).toContain('商品缺少名称');
    expect(blockedReasons).toContain('商品缺少类目');
  });

  it('父项目下子项目数量正确且 parentProjectId 关联正确', async () => {
    const req = buildRequest({
      projectName: '子项目数量测试',
      clientSpaceId: TEST_CLIENT_SPACE_ID,
      productIds: [testProducts[0].id, testProducts[1].id, testProducts[2].id],
      platformNames: ['AMAZON'],
      inputMode: 'quick',
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.summary.total).toBe(3);
    expect(body.summary.created).toBe(3);
    expect(body.children).toHaveLength(3);

    const parentId = body.parentProject.id;
    const childProjects = await prisma.project.findMany({
      where: { parentProjectId: parentId },
    });

    expect(childProjects).toHaveLength(3);

    for (const child of childProjects) {
      expect(child.parentProjectId).toBe(parentId);
      expect(child.projectType).toBe('single_product_single_platform');
      expect(child.status).toBe('draft');
    }
  });

  it('所有商品不可生成时只创建父项目无子项目', async () => {
    const req = buildRequest({
      projectName: '全部不可用测试',
      clientSpaceId: TEST_CLIENT_SPACE_ID,
      productIds: [testProducts[3].id, testProducts[4].id],
      platformNames: [],
      inputMode: 'quick',
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.summary.total).toBe(2);
    expect(body.summary.created).toBe(0);
    expect(body.summary.blocked).toBe(2);
    expect(body.children).toHaveLength(0);
    expect(body.blocked).toHaveLength(2);
    expect(body.parentProject.status).toBe('draft');
  });

  it('请求体校验：缺少必填字段返回400', async () => {
    const req = buildRequest({});
    const res = await POST(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBe('校验失败');
    expect(body.details).toBeDefined();
  });

  it('子项目继承父项目的 platformNames / seriesPackId / inputMode / bundleType', async () => {
    const req = buildRequest({
      projectName: '继承测试',
      clientSpaceId: TEST_CLIENT_SPACE_ID,
      productIds: [testProducts[0].id],
      platformNames: ['SHOPIFY'],
      seriesPackId: 'sp-inherit-test',
      inputMode: 'batch',
      bundleType: 'standard_5',
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.children).toHaveLength(1);

    const childId = body.children[0].projectId;
    const child = await prisma.project.findUnique({ where: { id: childId } });

    expect(child).not.toBeNull();
    expect(child!.selectedPlatforms).toBe(JSON.stringify(['SHOPIFY']));
    expect(child!.seriesPackId).toBe('sp-inherit-test');
    expect(child!.inputMode).toBe('batch');
    expect(child!.bundleType).toBe('standard_5');
  });
});

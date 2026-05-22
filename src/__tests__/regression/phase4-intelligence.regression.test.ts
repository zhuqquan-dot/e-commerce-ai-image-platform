import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: { findMany: vi.fn(), findUnique: vi.fn() },
    bundlePlan: { findMany: vi.fn() },
    bundleSlot: { findMany: vi.fn() },
    platformRulePack: { findUnique: vi.fn(), findMany: vi.fn(), findFirst: vi.fn() },
    reviewRecord: { findMany: vi.fn() },
    performanceFeedback: { findMany: vi.fn(), create: vi.fn(), createMany: vi.fn(), count: vi.fn() },
    qcResult: { findMany: vi.fn() },
    generationTask: { findMany: vi.fn() },
    recommendation: { create: vi.fn(), update: vi.fn() },
    strategySuggestion: { create: vi.fn(), update: vi.fn() },
    optimizationSuggestion: { create: vi.fn(), update: vi.fn(), findMany: vi.fn() },
    exportPack: { findMany: vi.fn(), count: vi.fn() },
  },
}));

import { RecommendationEngine } from "@/intelligence/recommendation-engine";
import { StrategySuggestionEngine } from "@/intelligence/strategy-suggestion-engine";
import { OptimizationAssistant } from "@/intelligence/optimization-assistant";
import { PerformanceFeedbackService } from "@/intelligence/performance-feedback-service";
import { prisma } from "@/lib/prisma";

const mockProjectFindMany = vi.mocked(prisma.project.findMany);
const mockProjectFindUnique = vi.mocked(prisma.project.findUnique);
const mockPlatformRulePackFindUnique = vi.mocked(prisma.platformRulePack.findUnique);
const mockPlatformRulePackFindFirst = vi.mocked(prisma.platformRulePack.findFirst);
const mockPerformanceFeedbackFindMany = vi.mocked(prisma.performanceFeedback.findMany);
const mockPerformanceFeedbackCreate = vi.mocked(prisma.performanceFeedback.create);
const mockGenerationTaskFindMany = vi.mocked(prisma.generationTask.findMany);
const mockRecommendationCreate = vi.mocked(prisma.recommendation.create);
const mockRecommendationUpdate = vi.mocked(prisma.recommendation.update);
const mockStrategySuggestionCreate = vi.mocked(prisma.strategySuggestion.create);
const mockStrategySuggestionUpdate = vi.mocked(prisma.strategySuggestion.update);
const mockOptimizationSuggestionCreate = vi.mocked(prisma.optimizationSuggestion.create);
const mockOptimizationSuggestionUpdate = vi.mocked(prisma.optimizationSuggestion.update);

describe("Phase 4 — RecommendationEngine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getBundleRecommendations returns recommendations based on historical data", async () => {
    mockProjectFindMany.mockResolvedValue([
      {
        id: "proj-1",
        workspaceId: "ws-1",
        status: "exported",
        productId: "prod-1",
        bundlePlans: [
          {
            id: "bp-1",
            platform: "taobao",
            bundleSlots: [
              { slotType: "main_white" },
              { slotType: "scene" },
              { slotType: "feature" },
            ],
          },
        ],
        generationTasks: [
          { id: "task-1", reviewRecords: [{ action: "approve" }] },
        ],
      },
      {
        id: "proj-2",
        workspaceId: "ws-1",
        status: "exported",
        productId: "prod-2",
        bundlePlans: [
          {
            id: "bp-2",
            platform: "taobao",
            bundleSlots: [
              { slotType: "main_white" },
              { slotType: "scene" },
              { slotType: "feature" },
            ],
          },
        ],
        generationTasks: [
          { id: "task-2", reviewRecords: [{ action: "approve" }] },
        ],
      },
    ] as any);

    mockRecommendationCreate.mockResolvedValue({
      id: "rec-1",
      workspaceId: "ws-1",
      type: "bundle",
      context: "{}",
      content: "{}",
      basis: "",
    });

    const engine = new RecommendationEngine();
    const result = await engine.getBundleRecommendations("ws-1");

    expect(result.length).toBeGreaterThan(0);
    expect(result[0].slotTypes).toBeDefined();
    expect(result[0].slotTypes).toContain("main_white");
    expect(result[0].basis).toContain("历史项目");
    expect(result[0].frequency).toBeGreaterThan(0);
  });

  it("getBundleRecommendations falls back to platform rules when no history", async () => {
    mockProjectFindMany.mockResolvedValue([]);
    mockPlatformRulePackFindUnique.mockResolvedValue({
      id: "plat-1",
      platformName: "taobao",
      supportedSlots: JSON.stringify(["main_white", "scene", "feature"]),
    } as any);
    mockRecommendationCreate.mockResolvedValue({
      id: "rec-fb",
      workspaceId: "ws-1",
      type: "bundle",
      context: "{}",
      content: "{}",
      basis: "基于平台规则推荐",
    });

    const engine = new RecommendationEngine();
    const result = await engine.getBundleRecommendations("ws-1", "plat-1");

    expect(result).toHaveLength(1);
    expect(result[0].basis).toBe("基于平台规则推荐");
    expect(result[0].slotTypes).toContain("main_white");
    expect(result[0].frequency).toBe(0);
  });

  it("adoptRecommendation marks as adopted", async () => {
    mockRecommendationUpdate.mockResolvedValue({
      id: "rec-1",
      isAdopted: true,
      adoptedAt: new Date(),
    } as any);

    const engine = new RecommendationEngine();
    await engine.adoptRecommendation("rec-1");

    expect(mockRecommendationUpdate).toHaveBeenCalledWith({
      where: { id: "rec-1" },
      data: { isAdopted: true, adoptedAt: expect.any(Date) },
    });
  });
});

describe("Phase 4 — StrategySuggestionEngine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getMainImageStrategy returns proportions from feedback data", async () => {
    mockPerformanceFeedbackFindMany.mockResolvedValue([
      { id: "fb-1", workspaceId: "ws-1", platformId: "plat-1", rating: 5, projectId: "proj-1" },
      { id: "fb-2", workspaceId: "ws-1", platformId: "plat-1", rating: 4, projectId: "proj-1" },
    ] as any);
    mockGenerationTaskFindMany.mockResolvedValue([
      { id: "task-1", projectId: "proj-1", bundleSlot: { slotType: "main_white" } },
      { id: "task-2", projectId: "proj-1", bundleSlot: { slotType: "main_white" } },
      { id: "task-3", projectId: "proj-1", bundleSlot: { slotType: "main_text" } },
    ] as any);
    mockStrategySuggestionCreate.mockResolvedValue({
      id: "sg-1",
      workspaceId: "ws-1",
      platformId: "plat-1",
      category: "electronics",
      suggestionType: "main_image_strategy",
      content: "{}",
      basis: "",
    });

    const engine = new StrategySuggestionEngine();
    const result = await engine.getMainImageStrategy("ws-1", "plat-1", "electronics");

    expect(result.slotTypeProportions).toBeDefined();
    expect(result.slotTypeProportions.main_white).toBeGreaterThan(0);
    expect(result.slotTypeProportions.main_text).toBeGreaterThan(0);
    expect(result.basis).toContain("高评分项目");
  });

  it("getMainImageStrategy falls back to static proportions", async () => {
    mockPerformanceFeedbackFindMany.mockResolvedValue([]);
    mockStrategySuggestionCreate.mockResolvedValue({
      id: "sg-fb",
      workspaceId: "ws-1",
      platformId: "plat-1",
      category: "electronics",
      suggestionType: "main_image_strategy",
      content: "{}",
      basis: "基于平台规则，暂无历史数据优化",
    });

    const engine = new StrategySuggestionEngine();
    const result = await engine.getMainImageStrategy("ws-1", "plat-1", "electronics");

    expect(result.slotTypeProportions).toEqual({
      main_white: 0.7,
      main_text: 0.2,
      main_scene: 0.1,
    });
    expect(result.basis).toContain("暂无历史数据");
  });

  it("getSlotPriority returns sorted slot list", async () => {
    mockPlatformRulePackFindUnique.mockResolvedValue({
      id: "plat-1",
      platformName: "taobao",
    } as any);
    mockGenerationTaskFindMany.mockResolvedValue([
      {
        id: "task-1",
        platformPackId: "plat-1",
        bundleSlot: { slotType: "main_white" },
        product: { category: "electronics" },
        qcResults: [{ overallGrade: "A" }],
      },
      {
        id: "task-2",
        platformPackId: "plat-1",
        bundleSlot: { slotType: "scene" },
        product: { category: "electronics" },
        qcResults: [{ overallGrade: "C" }],
      },
    ] as any);
    mockStrategySuggestionCreate.mockResolvedValue({
      id: "sg-pri",
      workspaceId: "ws-1",
      platformId: "plat-1",
      category: "electronics",
      suggestionType: "slot_priority",
      content: "{}",
      basis: "",
    });

    const engine = new StrategySuggestionEngine();
    const result = await engine.getSlotPriority("ws-1", "plat-1", "electronics");

    expect(result.priorities.length).toBeGreaterThan(0);
    expect(result.priorities[0].avgGrade).toBeGreaterThanOrEqual(
      result.priorities[result.priorities.length - 1].avgGrade,
    );
    expect(result.priorities[0].slotType).toBe("main_white");
  });

  it("adoptSuggestion marks as adopted", async () => {
    mockStrategySuggestionUpdate.mockResolvedValue({
      id: "sg-1",
      isAdopted: true,
    } as any);

    const engine = new StrategySuggestionEngine();
    await engine.adoptSuggestion("sg-1");

    expect(mockStrategySuggestionUpdate).toHaveBeenCalledWith({
      where: { id: "sg-1" },
      data: { isAdopted: true },
    });
  });
});

describe("Phase 4 — PerformanceFeedbackService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("recordFeedback creates a record", async () => {
    mockPerformanceFeedbackCreate.mockResolvedValue({
      id: "fb-1",
      workspaceId: "ws-1",
      exportPackId: null,
      projectId: null,
      platformId: null,
      impressions: 1000,
      clicks: 50,
      conversions: 5,
      rating: 4,
      source: "manual",
      notes: "test feedback",
      createdAt: new Date(),
    } as any);

    const service = new PerformanceFeedbackService();
    await service.recordFeedback({
      workspaceId: "ws-1",
      impressions: 1000,
      clicks: 50,
      conversions: 5,
      rating: 4,
      notes: "test feedback",
    });

    expect(mockPerformanceFeedbackCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workspaceId: "ws-1",
        impressions: 1000,
        clicks: 50,
        conversions: 5,
        rating: 4,
        source: "manual",
        notes: "test feedback",
      }),
    });
  });

  it("batchImportCsv parses and imports records", async () => {
    mockPerformanceFeedbackCreate.mockResolvedValue({ id: "fb-new" } as any);

    const csv = "exportPackId,impressions,clicks,conversions,rating\nep-1,1000,50,5,4\nep-2,2000,100,10,5";

    const service = new PerformanceFeedbackService();
    const result = await service.batchImportCsv("ws-1", csv);

    expect(result.success).toBe(2);
    expect(result.failed).toBe(0);
    expect(mockPerformanceFeedbackCreate).toHaveBeenCalledTimes(2);
  });

  it("batchImportCsv handles invalid rows", async () => {
    mockPerformanceFeedbackCreate
      .mockResolvedValueOnce({ id: "fb-ok-1" } as any)
      .mockRejectedValueOnce(new Error("DB error"))
      .mockResolvedValueOnce({ id: "fb-ok-2" } as any);

    const csv = "exportPackId,impressions,clicks,conversions,rating\nep-1,1000,50,5,4\nep-2,2000,100,10,5\nep-3,3000,150,15,3";

    const service = new PerformanceFeedbackService();
    const result = await service.batchImportCsv("ws-1", csv);

    expect(result.success).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toContain("第 3 行");
  });
});

describe("Phase 4 — OptimizationAssistant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getSlotOptimizations identifies low-score tasks", async () => {
    mockGenerationTaskFindMany.mockResolvedValue([
      {
        id: "task-1",
        projectId: "proj-1",
        bundleSlot: { slotType: "main_white" },
        qcResults: [{ overallGrade: "D", consistencyScore: 30 }],
      },
      {
        id: "task-2",
        projectId: "proj-1",
        bundleSlot: { slotType: "scene" },
        qcResults: [{ overallGrade: "B", consistencyScore: 80 }],
      },
    ] as any);
    mockProjectFindUnique.mockResolvedValue({ workspaceId: "ws-1" } as any);
    mockOptimizationSuggestionCreate.mockResolvedValue({
      id: "opt-1",
      workspaceId: "ws-1",
      projectId: "proj-1",
      taskId: "task-1",
      suggestionType: "slot_optimization",
      content: "{}",
      priority: "high",
    });

    const assistant = new OptimizationAssistant();
    const result = await assistant.getSlotOptimizations("proj-1");

    expect(result).toHaveLength(1);
    expect(result[0].taskId).toBe("task-1");
    expect(result[0].priority).toBe("high");
    expect(result[0].currentScore).toBe(30);
    expect(result[0].slotType).toBe("main_white");
    expect(result[0].suggestions.length).toBeGreaterThan(0);
  });

  it("getBundleGapSuggestions detects missing slots", async () => {
    mockProjectFindUnique.mockResolvedValue({
      id: "proj-1",
      workspaceId: "ws-1",
      bundlePlans: [
        {
          id: "bp-1",
          platform: "taobao",
          bundleSlots: [
            { slotType: "main_white" },
            { slotType: "scene" },
          ],
        },
      ],
    } as any);
    mockPlatformRulePackFindFirst.mockResolvedValue({
      id: "plat-1",
      platformName: "taobao",
      supportedSlots: JSON.stringify(["main_white", "scene", "feature", "spec"]),
    } as any);
    mockOptimizationSuggestionCreate.mockImplementation((async (args: any) => ({
      id: `opt-gap-${args.data.content}`,
      workspaceId: args.data.workspaceId,
      projectId: args.data.projectId,
      suggestionType: "bundle_gap",
      content: args.data.content,
      priority: "medium",
    })) as any);

    const assistant = new OptimizationAssistant();
    const result = await assistant.getBundleGapSuggestions("proj-1");

    expect(result).toHaveLength(2);
    const missingTypes = result.map((r) => r.missingSlotType);
    expect(missingTypes).toContain("feature");
    expect(missingTypes).toContain("spec");
    expect(result[0].suggestion).toContain("缺少");
  });

  it("getRetryPriority sorts by importance and score", async () => {
    mockGenerationTaskFindMany.mockResolvedValue([
      {
        id: "task-1",
        projectId: "proj-1",
        status: "qc_failed",
        bundleSlot: { slotType: "main_white" },
        slotCode: "main_white",
        qcResults: [{ overallGrade: "D", consistencyScore: 30 }],
      },
      {
        id: "task-2",
        projectId: "proj-1",
        status: "qc_failed",
        bundleSlot: { slotType: "scene" },
        slotCode: "scene",
        qcResults: [{ overallGrade: "C", consistencyScore: 55 }],
      },
      {
        id: "task-3",
        projectId: "proj-1",
        status: "qc_failed",
        bundleSlot: { slotType: "main_text" },
        slotCode: "main_text",
        qcResults: [{ overallGrade: "D", consistencyScore: 45 }],
      },
    ] as any);
    mockProjectFindUnique.mockResolvedValue({ workspaceId: "ws-1" } as any);
    mockOptimizationSuggestionCreate.mockImplementation((async (args: any) => ({
      id: `opt-${args.data.taskId}`,
    })) as any);

    const assistant = new OptimizationAssistant();
    const result = await assistant.getRetryPriority("proj-1");

    expect(result).toHaveLength(3);
    expect(result[0].slotType).toBe("main_white");
    expect(result[0].weight).toBe(10);
    expect(result[1].slotType).toBe("main_text");
    expect(result[1].weight).toBe(9);
    expect(result[2].slotType).toBe("scene");
    expect(result[2].weight).toBe(7);
  });

  it("adoptSuggestion marks as adopted", async () => {
    mockOptimizationSuggestionUpdate.mockResolvedValue({
      id: "opt-1",
      isAdopted: true,
      adoptedAt: new Date(),
    } as any);

    const assistant = new OptimizationAssistant();
    await assistant.adoptSuggestion("opt-1");

    expect(mockOptimizationSuggestionUpdate).toHaveBeenCalledWith({
      where: { id: "opt-1" },
      data: { isAdopted: true, adoptedAt: expect.any(Date) },
    });
  });
});

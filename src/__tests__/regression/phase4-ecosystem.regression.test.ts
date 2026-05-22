import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    template: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    templateVersion: { create: vi.fn(), findMany: vi.fn(), aggregate: vi.fn() },
    apiKey: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), delete: vi.fn() },
    apiCallLog: { create: vi.fn() },
    pluginRegistry: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    project: { findUnique: vi.fn() },
    bundlePlan: { create: vi.fn() },
    bundleSlot: { create: vi.fn(), createMany: vi.fn() },
  },
}));

import { TemplateService } from "@/ecosystem/template-service";
import { ApiKeyService } from "@/ecosystem/api-key-service";
import { checkRateLimit } from "@/ecosystem/api-rate-limiter";
import { PluginRegistryService } from "@/ecosystem/plugin-registry-service";
import { checkPluginPermission } from "@/ecosystem/plugin-security-guard";
import { prisma } from "@/lib/prisma";

const mockTemplateCreate = vi.mocked(prisma.template.create);
const mockTemplateFindMany = vi.mocked(prisma.template.findMany);
const mockTemplateFindUnique = vi.mocked(prisma.template.findUnique);
const mockTemplateUpdate = vi.mocked(prisma.template.update);
const mockTemplateVersionCreate = vi.mocked(prisma.templateVersion.create);
const mockApiKeyCreate = vi.mocked(prisma.apiKey.create);
const mockApiKeyFindFirst = vi.mocked(prisma.apiKey.findFirst);
const mockApiKeyUpdate = vi.mocked(prisma.apiKey.update);
const mockApiKeyDelete = vi.mocked(prisma.apiKey.delete);
const mockPluginRegistryCreate = vi.mocked(prisma.pluginRegistry.create);
const mockPluginRegistryUpdate = vi.mocked(prisma.pluginRegistry.update);
const mockPluginRegistryDelete = vi.mocked(prisma.pluginRegistry.delete);
const mockProjectFindUnique = vi.mocked(prisma.project.findUnique);
const mockBundlePlanCreate = vi.mocked(prisma.bundlePlan.create);
const mockBundleSlotCreate = vi.mocked(prisma.bundleSlot.create);

describe("Phase 4 — TemplateService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createTemplate creates template with initial version", async () => {
    mockTemplateCreate.mockResolvedValue({
      id: "tpl-1",
      workspaceId: "ws-1",
      name: "test-template",
      type: "bundle",
      platform: "",
      category: "",
      sourceProjectId: null,
      structureSnapshot: "{}",
      visibility: "workspace",
      usageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    mockTemplateVersionCreate.mockResolvedValue({
      id: "tv-1",
      templateId: "tpl-1",
      version: 1,
      structureSnapshot: "{}",
      changelog: "",
      createdAt: new Date(),
    } as any);

    const service = new TemplateService();
    const result = await service.createTemplate({
      workspaceId: "ws-1",
      name: "test-template",
      type: "bundle",
    });

    expect(result.id).toBe("tpl-1");
    expect(mockTemplateCreate).toHaveBeenCalled();
    expect(mockTemplateVersionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          templateId: "tpl-1",
          version: 1,
        }),
      }),
    );
  });

  it("createFromProject builds snapshot from project", async () => {
    mockProjectFindUnique.mockResolvedValue({
      id: "proj-1",
      seriesPackId: "series-1",
      bundlePlans: [
        {
          id: "bp-1",
          platform: "taobao",
          bundleSlots: [
            { slotType: "main_white", isAnchor: true, isRequired: true, sequenceOrder: 1 },
            { slotType: "scene", isAnchor: false, isRequired: true, sequenceOrder: 2 },
          ],
        },
      ],
    } as any);
    mockTemplateCreate.mockResolvedValue({
      id: "tpl-1",
      workspaceId: "ws-1",
      name: "from-project",
      type: "bundle",
      platform: "",
      category: "",
      sourceProjectId: "proj-1",
      structureSnapshot: "{}",
      visibility: "workspace",
      usageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    mockTemplateVersionCreate.mockResolvedValue({
      id: "tv-1",
      templateId: "tpl-1",
      version: 1,
      structureSnapshot: "{}",
      changelog: "",
      createdAt: new Date(),
    } as any);

    const service = new TemplateService();
    await service.createFromProject("proj-1", "from-project", "ws-1");

    expect(mockProjectFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "proj-1" } }),
    );
    const createCall = mockTemplateCreate.mock.calls[0][0] as any;
    expect(createCall.data.sourceProjectId).toBe("proj-1");
    expect(createCall.data.type).toBe("bundle");
    const snapshot = JSON.parse(createCall.data.structureSnapshot);
    expect(snapshot.bundlePlans).toHaveLength(1);
    expect(snapshot.bundlePlans[0].slots).toHaveLength(2);
    expect(snapshot.bundlePlans[0].slots[0].slotType).toBe("main_white");
  });

  it("listTemplates filters by workspace and type", async () => {
    mockTemplateFindMany.mockResolvedValue([
      { id: "tpl-1", workspaceId: "ws-1", type: "bundle" },
    ] as any);

    const service = new TemplateService();
    await service.listTemplates("ws-1", { type: "bundle" });

    expect(mockTemplateFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          workspaceId: "ws-1",
          type: "bundle",
        }),
      }),
    );
  });

  it("updateTemplate creates new version when structure changes", async () => {
    mockTemplateFindUnique.mockResolvedValue({
      id: "tpl-1",
      structureSnapshot: '{"old":true}',
      versions: [{ version: 1, structureSnapshot: '{"old":true}' }],
    } as any);
    mockTemplateVersionCreate.mockResolvedValue({
      id: "tv-2",
      templateId: "tpl-1",
      version: 2,
      structureSnapshot: '{"new":true}',
      changelog: "",
      createdAt: new Date(),
    } as any);
    mockTemplateUpdate.mockResolvedValue({
      id: "tpl-1",
      structureSnapshot: '{"new":true}',
    } as any);

    const service = new TemplateService();
    await service.updateTemplate("tpl-1", {
      structureSnapshot: { new: true },
    });

    expect(mockTemplateVersionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ version: 2 }),
      }),
    );
    expect(mockTemplateUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "tpl-1" },
      }),
    );
  });

  it("applyTemplate creates bundle plans from snapshot", async () => {
    const snapshot = {
      bundlePlans: [
        {
          platform: "taobao",
          slots: [
            { slotType: "main_white", isAnchor: true, isRequired: true, sequenceOrder: 1 },
          ],
        },
      ],
    };

    mockTemplateFindUnique.mockResolvedValue({
      id: "tpl-1",
      type: "bundle",
      structureSnapshot: JSON.stringify(snapshot),
      versions: [{ structureSnapshot: JSON.stringify(snapshot) }],
    } as any);
    mockBundlePlanCreate.mockResolvedValue({ id: "bp-new", projectId: "proj-1", platform: "taobao" } as any);
    mockBundleSlotCreate.mockResolvedValue({ id: "slot-new" } as any);
    mockTemplateUpdate.mockResolvedValue({ id: "tpl-1", usageCount: 1 } as any);

    const service = new TemplateService();
    const result = await service.applyTemplate("tpl-1", "proj-1");

    expect(result.applied).toBe(true);
    expect(result.templateId).toBe("tpl-1");
    expect(result.projectId).toBe("proj-1");
    expect(mockBundlePlanCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: "proj-1",
          platform: "taobao",
        }),
      }),
    );
    expect(mockBundleSlotCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          bundlePlanId: "bp-new",
          slotType: "main_white",
        }),
      }),
    );
  });
});

describe("Phase 4 — ApiKeyService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createApiKey generates mircioo_ prefixed key", async () => {
    mockApiKeyCreate.mockResolvedValue({
      id: "key-1",
      name: "test-key",
      keyPrefix: "mircioo_",
      status: "active",
      rateLimit: 100,
    } as any);

    const service = new ApiKeyService();
    const result = await service.createApiKey("ws-1", "test-key");

    expect(result.key.startsWith("mircioo_")).toBe(true);
    expect(mockApiKeyCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          workspaceId: "ws-1",
          name: "test-key",
          keyHash: expect.stringMatching(/^[a-f0-9]{64}$/),
          keyPrefix: expect.stringMatching(/^mircioo_/),
          rateLimit: 100,
        }),
      }),
    );
  });

  it("validateApiKey returns valid for active key", async () => {
    mockApiKeyFindFirst.mockResolvedValue({
      id: "key-1",
      workspaceId: "ws-1",
      status: "active",
      expiresAt: null,
    } as any);
    mockApiKeyUpdate.mockResolvedValue({ id: "key-1" } as any);

    const service = new ApiKeyService();
    const result = await service.validateApiKey("mircioo_testkey123");

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.workspaceId).toBe("ws-1");
      expect(result.apiKeyId).toBe("key-1");
    }
  });

  it("validateApiKey rejects disabled key", async () => {
    mockApiKeyFindFirst.mockResolvedValue(null);

    const service = new ApiKeyService();
    const result = await service.validateApiKey("mircioo_disabled_key");

    expect(result.valid).toBe(false);
  });

  it("disableApiKey updates status", async () => {
    mockApiKeyUpdate.mockResolvedValue({
      id: "key-1",
      status: "disabled",
    } as any);

    const service = new ApiKeyService();
    await service.disableApiKey("key-1");

    expect(mockApiKeyUpdate).toHaveBeenCalledWith({
      where: { id: "key-1" },
      data: { status: "disabled" },
    });
  });

  it("deleteApiKey removes record", async () => {
    mockApiKeyDelete.mockResolvedValue({ id: "key-1" } as any);

    const service = new ApiKeyService();
    await service.deleteApiKey("key-1");

    expect(mockApiKeyDelete).toHaveBeenCalledWith({ where: { id: "key-1" } });
  });
});

describe("Phase 4 — Rate Limiter", () => {
  it("checkRateLimit allows under limit", () => {
    const key = `rate-allow-${Date.now()}`;
    const limit = 5;

    const r1 = checkRateLimit(key, limit);
    const r2 = checkRateLimit(key, limit);
    const r3 = checkRateLimit(key, limit);

    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(limit - 3);
  });

  it("checkRateLimit blocks over limit", () => {
    const key = `rate-block-${Date.now()}`;
    const limit = 3;

    const results = [];
    for (let i = 0; i < 4; i++) {
      results.push(checkRateLimit(key, limit));
    }

    expect(results[0].allowed).toBe(true);
    expect(results[1].allowed).toBe(true);
    expect(results[2].allowed).toBe(true);
    expect(results[3].allowed).toBe(false);
    expect(results[3].remaining).toBe(0);
  });
});

describe("Phase 4 — PluginRegistryService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registerPlugin creates with inactive status", async () => {
    mockPluginRegistryCreate.mockResolvedValue({
      id: "plug-1",
      name: "test-plugin",
      description: "",
      entryRoute: "",
      lifecycleHooks: "[]",
      requiredPermissions: "[]",
      status: "inactive",
      version: "1.0.0",
      createdAt: new Date(),
    } as any);

    const service = new PluginRegistryService();
    const result = await service.registerPlugin({
      name: "test-plugin",
      requiredPermissions: ["bundle:read"],
    });

    expect(mockPluginRegistryCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "inactive",
          requiredPermissions: JSON.stringify(["bundle:read"]),
        }),
      }),
    );
  });

  it("enablePlugin updates to active", async () => {
    mockPluginRegistryUpdate.mockResolvedValue({
      id: "plug-1",
      status: "active",
    } as any);

    const service = new PluginRegistryService();
    await service.enablePlugin("plug-1");

    expect(mockPluginRegistryUpdate).toHaveBeenCalledWith({
      where: { id: "plug-1" },
      data: { status: "active" },
    });
  });

  it("disablePlugin updates to inactive", async () => {
    mockPluginRegistryUpdate.mockResolvedValue({
      id: "plug-1",
      status: "inactive",
    } as any);

    const service = new PluginRegistryService();
    await service.disablePlugin("plug-1");

    expect(mockPluginRegistryUpdate).toHaveBeenCalledWith({
      where: { id: "plug-1" },
      data: { status: "inactive" },
    });
  });

  it("removePlugin deletes record", async () => {
    mockPluginRegistryDelete.mockResolvedValue({ id: "plug-1" } as any);

    const service = new PluginRegistryService();
    await service.removePlugin("plug-1");

    expect(mockPluginRegistryDelete).toHaveBeenCalledWith({ where: { id: "plug-1" } });
  });
});

describe("Phase 4 — Plugin Security Guard", () => {
  it("checkPluginPermission allows matching permission", () => {
    const plugin = { requiredPermissions: JSON.stringify(["bundle:read"]) };

    expect(checkPluginPermission(plugin, "bundle:read")).toBe(true);
    expect(checkPluginPermission(plugin, "bundle:write")).toBe(true);
  });

  it("checkPluginPermission blocks non-matching permission", () => {
    const plugin = { requiredPermissions: JSON.stringify(["bundle:read"]) };

    expect(checkPluginPermission(plugin, "project:read")).toBe(false);
  });
});

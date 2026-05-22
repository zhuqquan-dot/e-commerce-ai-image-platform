"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ToastProvider, useToast } from "@/components/toast";
import { BatchProductSelector } from "@/components/batch-product-selector";
import { useEntitlements } from "@/hooks/use-entitlements";

interface ClientSpace {
  id: string;
  clientName: string;
  brandName: string;
}

interface SeriesPack {
  id: string;
  seriesName: string;
  clientSpaceId: string;
}

const TASK_TYPES = [
  { value: "single_product_single_platform", label: "单商品 × 单平台", icon: "\u{1F4F1}", desc: "为一个商品在一个平台上生成图包" },
  { value: "single_product_multi_platform", label: "单商品 × 多平台", icon: "\u{1F310}", desc: "为一个商品在多个平台上生成图包" },
  { value: "multi_product_batch", label: "多商品 × 批量", icon: "\u{1F4E6}", desc: "为多个商品批量生成跨平台图包" },
];

const INPUT_MODES = [
  { value: "quick", label: "Quick 快速模式", icon: "\u26A1", desc: "仅填写核心字段，AI 自动补全其余信息" },
  { value: "standard", label: "Standard 标准生产", icon: "\u{1F527}", desc: "完整填写商品字段，精细控制生成参数" },
  { value: "high_consistency", label: "High Consistency 高一致性", icon: "\u{1F3AF}", desc: "锁定 Style Lock + 色板 + 背景，确保跨图一致性" },
];

const DOMESTIC_PLATFORMS = [
  { value: "JD", label: "\u{1F1E8}\u{1F1F3} 京东" },
  { value: "Tmall", label: "\u{1F1E8}\u{1F1F3} 天猫" },
  { value: "Taobao", label: "\u{1F1E8}\u{1F1F3} 淘宝" },
  { value: "Pinduoduo", label: "\u{1F1E8}\u{1F1F3} 拼多多" },
];

const OVERSEAS_PLATFORMS = [
  { value: "Amazon_US", label: "\u{1F1FA}\u{1F1F8} Amazon US" },
  { value: "Amazon_JP", label: "\u{1F1EF}\u{1F1F5} Amazon JP" },
  { value: "Amazon_UK", label: "\u{1F1EC}\u{1F1E7} Amazon UK" },
  { value: "Amazon_DE", label: "\u{1F1E9}\u{1F1EA} Amazon DE" },
  { value: "Shopee_MY", label: "\u{1F1F2}\u{1F1FE} Shopee MY" },
  { value: "Lazada_SG", label: "\u{1F1F8}\u{1F1EC} Lazada SG" },
];

const BUNDLE_TYPES = [
  { value: "product_static", label: "商品静态图", icon: "\u{1F5BC}\uFE0F", desc: "仅生成主图 + 辅图等静态商品图" },
  { value: "product_static_plus_marketing", label: "商品静态图 + 简单营销图", icon: "\u{1F4F8}", desc: "包含静态图 + A+ 图文 / 品牌故事等营销物料" },
];

const BASE_STEPS = [
  { num: 1, label: "客户空间", icon: "\u{1F3E2}" },
  { num: 2, label: "任务类型", icon: "\u{1F4CB}" },
  { num: 3, label: "输入模式", icon: "\u2699\uFE0F" },
  { num: 4, label: "系列资产包", icon: "\u{1F4C2}" },
  { num: 5, label: "目标平台", icon: "\u{1F30D}" },
  { num: 6, label: "图包类型", icon: "\u{1F5BC}" },
];

function getSteps(isBatch: boolean) {
  if (isBatch) {
    return [...BASE_STEPS, { num: 7, label: "选择商品", icon: "\u{1F4E6}" }];
  }
  return BASE_STEPS;
}

export default function ProjectNewPage() {
  return (
    <ToastProvider>
      <ProjectNewPageContent />
    </ToastProvider>
  );
}

function ProjectNewPageContent() {
  const router = useRouter();
  const { toast } = useToast();

  const [clientSpaces, setClientSpaces] = useState<ClientSpace[]>([]);
  const [seriesPacks, setSeriesPacks] = useState<SeriesPack[]>([]);
  const [loadingClientSpaces, setLoadingClientSpaces] = useState(true);
  const [loadingSeriesPacks, setLoadingSeriesPacks] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [projectName, setProjectName] = useState("");
  const [clientSpaceId, setClientSpaceId] = useState("");
  const [taskType, setTaskType] = useState("single_product_single_platform");
  const [inputMode, setInputMode] = useState("quick");
  const [seriesPackId, setSeriesPackId] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [bundleType, setBundleType] = useState("product_static");
  const [showBatchStep, setShowBatchStep] = useState(false);

  const [recommendation, setRecommendation] = useState<{
    slotTypes: string[];
    basis: string;
  } | null>(null);
  const [loadingRecommendation, setLoadingRecommendation] = useState(false);
  const [adoptedRecommendation, setAdoptedRecommendation] = useState(false);

  const [entitlementWorkspaceId, setEntitlementWorkspaceId] = useState<string>("");
  const { featureFlags } = useEntitlements(entitlementWorkspaceId || undefined);

  useEffect(() => {
    try {
      const match = document.cookie.match(/(?:^|;\s*)mircioo_session=([^;]*)/);
      if (match) {
        const session = JSON.parse(decodeURIComponent(match[1]));
        if (session?.workspaceId) setEntitlementWorkspaceId(session.workspaceId);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!entitlementWorkspaceId || selectedPlatforms.length === 0 || !bundleType) {
      setRecommendation(null);
      setAdoptedRecommendation(false);
      return;
    }
    const fetchRecommendation = async () => {
      setLoadingRecommendation(true);
      try {
        const params = new URLSearchParams({
          workspaceId: entitlementWorkspaceId,
          platformId: selectedPlatforms[0],
          category: bundleType,
        });
        const res = await fetch(`/api/recommendations/bundle?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.recommendations?.length > 0) {
            setRecommendation(data.recommendations[0]);
          }
        }
      } catch {
        setRecommendation(null);
      } finally {
        setLoadingRecommendation(false);
      }
    };
    fetchRecommendation();
  }, [entitlementWorkspaceId, selectedPlatforms, bundleType]);

  const isBatch = taskType === "multi_product_batch";
  const steps = getSteps(isBatch);

  const fetchClientSpaces = useCallback(async () => {
    try {
      const res = await fetch("/api/client-spaces?pageSize=100");
      if (!res.ok) throw new Error("加载客户空间失败");
      const data = await res.json();
      setClientSpaces(data.list || []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoadingClientSpaces(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchClientSpaces();
  }, [fetchClientSpaces]);

  useEffect(() => {
    if (!clientSpaceId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSeriesPacks([]);
      return;
    }
    const fetchSeriesPacks = async () => {
      setLoadingSeriesPacks(true);
      setSeriesPackId("");
      try {
        const res = await fetch(`/api/series-packs?clientSpaceId=${clientSpaceId}&pageSize=100`);
        if (!res.ok) throw new Error("加载系列包失败");
        const data = await res.json();
        setSeriesPacks(data.list || []);
      } catch {
        // ignore
      } finally {
        setLoadingSeriesPacks(false);
      }
    };
    fetchSeriesPacks();
  }, [clientSpaceId]);

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        return clientSpaceId !== "";
      case 2:
        return taskType !== "";
      case 3:
        return inputMode !== "";
      case 4:
        return true;
      case 5:
        return selectedPlatforms.length > 0;
      case 6:
        return bundleType !== "";
      case 7:
        return showBatchStep;
      default:
        return true;
    }
  };

  const allStepsValid =
    clientSpaceId !== "" &&
    taskType !== "" &&
    inputMode !== "" &&
    selectedPlatforms.length > 0 &&
    bundleType !== "";

  const handleSubmit = async () => {
    if (!allStepsValid) {
      toast("请完成所有必填项", "error");
      return;
    }
    if (!projectName.trim()) {
      toast("请输入项目名称", "error");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const body = {
        name: projectName.trim(),
        clientSpaceId,
        projectType: taskType,
        inputMode,
        selectedPlatforms,
        bundleType,
        seriesPackId: seriesPackId || undefined,
      };

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "创建项目失败");
      }

      const project = await res.json();
      toast("项目创建成功", "success");
      router.push(`/projects/${project.id}/products`);
    } catch (e) {
      const msg = String(e);
      setError(msg);
      toast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const clientSpaceOptions = [
    { value: "", label: "请选择客户空间" },
    ...clientSpaces.map((cs) => ({
      value: cs.id,
      label: `${cs.clientName} - ${cs.brandName}`,
    })),
  ];

  const seriesPackOptions = [
    { value: "", label: "不使用系列包（可选）" },
    ...seriesPacks.map((sp) => ({
      value: sp.id,
      label: sp.seriesName,
    })),
  ];

  const handleBatchComplete = (result: {
    parentProject: { id: string };
    summary: { created: number; blocked: number };
  }) => {
    const { created, blocked } = result.summary;
    toast(
      `批量创建完成: ${created} 成功, ${blocked} 失败`,
      blocked > 0 ? "error" : "success"
    );
    router.push(`/projects/${result.parentProject.id}`);
  };

  return (
    <div>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground/70 mb-1">
              <Link href="/projects" className="hover:text-muted-foreground">项目列表</Link> &gt; 新建项目
            </div>
            <h1 className="text-2xl font-bold text-foreground">创建项目</h1>
          </div>
          <Link href="/projects">
            <Button variant="ghost" size="sm">取消</Button>
          </Link>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {steps.map((step, i) => {
            const valid = isStepValid(step.num);
            const isLast = i === steps.length - 1;
            return (
              <div key={step.num} className="flex items-center shrink-0">
                <div
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    valid
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "bg-card text-muted-foreground border border-border"
                  }`}
                >
                  <span>{step.icon}</span>
                  <span className="hidden sm:inline">{step.num}. {step.label}</span>
                  <span className="sm:hidden">{step.num}</span>
                </div>
                {!isLast && (
                  <span className="text-muted-foreground/70 mx-1 shrink-0">\u2192</span>
                )}
              </div>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>🏢 Step 1 - 客户空间</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingClientSpaces ? (
              <Skeleton className="h-9 w-full" />
            ) : (
              <Select
                label="选择客户空间"
                required
                value={clientSpaceId}
                onChange={(e) => setClientSpaceId(e.target.value)}
                options={clientSpaceOptions}
                hint="选择该项目所属的客户空间。关联品牌包、系列资产包和目标市场设定。"
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>📋 Step 2 - 任务类型</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {TASK_TYPES.map((tt) => {
                const isBatchOption = tt.value === "multi_product_batch";
                const disabled = isBatchOption && !featureFlags.batchEnabled;
                return (
                  <div key={tt.value} className="relative">
                    <button
                      onClick={() => {
                        if (disabled) return;
                        setTaskType(tt.value);
                        setShowBatchStep(false);
                      }}
                      disabled={disabled}
                      className={`w-full text-left p-4 rounded-lg border transition-all duration-200 ${
                        disabled
                          ? "border-border bg-secondary/50 cursor-not-allowed opacity-60"
                          : taskType === tt.value
                            ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20 cursor-pointer"
                            : "border-border bg-card hover:border-primary/30 hover:bg-secondary cursor-pointer"
                      }`}
                    >
                      <div className="text-xl mb-1">{tt.icon}</div>
                      <div className="text-sm font-semibold text-foreground">{tt.label}</div>
                      <div className="text-xs text-muted-foreground mt-1">{tt.desc}</div>
                    </button>
                    {disabled && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Link href="/plans">
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full hover:bg-primary/20 transition-colors cursor-pointer">
                            升级套餐解锁批量能力
                          </span>
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>\u2699\uFE0F Step 3 - 输入模式</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {INPUT_MODES.map((im) => (
                <button
                  key={im.value}
                  onClick={() => setInputMode(im.value)}
                  className={`text-left p-4 rounded-lg border transition-all duration-200 cursor-pointer ${
                    inputMode === im.value
                      ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                      : "border-border bg-card hover:border-primary/30 hover:bg-secondary"
                  }`}
                >
                  <div className="text-xl mb-1">{im.icon}</div>
                  <div className="text-sm font-semibold text-foreground">{im.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{im.desc}</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>📂 Step 4 - 系列资产包 (可选)</CardTitle>
          </CardHeader>
          <CardContent>
            {!clientSpaceId ? (
              <p className="text-sm text-muted-foreground/70">
                请先在 Step 1 中选择客户空间，然后可在此选择对应的系列资产包。
              </p>
            ) : loadingSeriesPacks ? (
              <Skeleton className="h-9 w-full" />
            ) : (
              <Select
                label="选择系列资产包"
                value={seriesPackId}
                onChange={(e) => setSeriesPackId(e.target.value)}
                options={seriesPackOptions}
                hint="选择预设的 Style Lock、色板、背景/光照系统，确保跨图一致性。不选则使用默认设定。"
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>🌍 Step 5 - 目标平台</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                国内平台
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DOMESTIC_PLATFORMS.map((p) => {
                  const checked = selectedPlatforms.includes(p.value);
                  return (
                    <label
                      key={p.value}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-all duration-200 ${
                        checked
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border bg-card text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePlatform(p.value)}
                        className="sr-only"
                      />
                      <span
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center text-xs transition-colors ${
                          checked
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/30"
                        }`}
                      >
                        {checked ? "\u2713" : ""}
                      </span>
                      <span className="text-sm">{p.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                海外平台
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {OVERSEAS_PLATFORMS.map((p) => {
                  const checked = selectedPlatforms.includes(p.value);
                  return (
                    <label
                      key={p.value}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-all duration-200 ${
                        checked
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border bg-card text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePlatform(p.value)}
                        className="sr-only"
                      />
                      <span
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center text-xs transition-colors ${
                          checked
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/30"
                        }`}
                      >
                        {checked ? "\u2713" : ""}
                      </span>
                      <span className="text-sm">{p.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            {selectedPlatforms.length > 0 && (
              <div className="flex gap-1.5 flex-wrap pt-2">
                <span className="text-xs text-muted-foreground/70">已选:</span>
                {selectedPlatforms.map((p) => (
                  <button
                    key={p}
                    onClick={() => togglePlatform(p)}
                    className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full hover:bg-primary/20 transition-colors cursor-pointer"
                  >
                    {p} \u00D7
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>🖼 Step 6 - 图包类型</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {BUNDLE_TYPES.map((bt) => (
                <button
                  key={bt.value}
                  onClick={() => setBundleType(bt.value)}
                  className={`text-left p-4 rounded-lg border transition-all duration-200 cursor-pointer ${
                    bundleType === bt.value
                      ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                      : "border-border bg-card hover:border-primary/30 hover:bg-secondary"
                  }`}
                >
                  <div className="text-xl mb-1">{bt.icon}</div>
                  <div className="text-sm font-semibold text-foreground">{bt.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{bt.desc}</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {selectedPlatforms.length > 0 && bundleType && (
          <Card>
            <CardHeader>
              <CardTitle>💡 推荐图包</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingRecommendation ? (
                <Skeleton className="h-16 w-full" />
              ) : recommendation && !adoptedRecommendation ? (
                <div className="space-y-3">
                  <div className="bg-secondary rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">推荐图位:</span>
                      <div className="flex flex-wrap gap-1">
                        {recommendation.slotTypes.map((st) => (
                          <span key={st} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            {st}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      推荐依据: {recommendation.basis}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAdoptedRecommendation(true);
                      toast("已采纳推荐图包方案", "success");
                    }}
                  >
                    采纳推荐
                  </Button>
                </div>
              ) : adoptedRecommendation ? (
                <div className="text-sm text-primary font-medium">✓ 已采纳推荐方案</div>
              ) : (
                <p className="text-sm text-muted-foreground">暂无推荐数据</p>
              )}
            </CardContent>
          </Card>
        )}

        {!isBatch && (
          <Card>
            <CardHeader>
              <CardTitle>📝 项目信息确认</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="项目名称"
                required
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="输入项目名称，例如：2025春季新品-京东天猫图包"
                hint="项目名称用于快速识别和检索"
              />

              <div className="bg-secondary rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">客户空间</span>
                  <span className="text-foreground font-medium">
                    {clientSpaceId
                      ? clientSpaces.find((c) => c.id === clientSpaceId)
                        ?.clientName || clientSpaceId
                      : "\u2014"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">任务类型</span>
                  <span className="text-foreground">
                    {TASK_TYPES.find((t) => t.value === taskType)?.label || taskType}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">输入模式</span>
                  <span className="text-foreground">
                    {INPUT_MODES.find((m) => m.value === inputMode)?.label || inputMode}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">系列资产包</span>
                  <span className="text-foreground">
                    {seriesPackId
                      ? seriesPacks.find((s) => s.id === seriesPackId)?.seriesName || seriesPackId
                      : "不使用"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">目标平台</span>
                  <span className="text-foreground">
                    {selectedPlatforms.length > 0
                      ? selectedPlatforms.join(" / ")
                      : "\u2014"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">图包类型</span>
                  <span className="text-foreground">
                    {BUNDLE_TYPES.find((b) => b.value === bundleType)?.label || bundleType}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <Link href="/projects">
                  <Button variant="ghost" type="button">取消</Button>
                </Link>
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  loading={submitting}
                  disabled={!allStepsValid || !projectName.trim()}
                >
                  创建项目并配置商品
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isBatch && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>📝 项目信息确认</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="项目名称"
                  required
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="输入项目名称，例如：2025春季新品-批量图包"
                  hint="项目名称用于快速识别和检索"
                />

                <div className="bg-secondary rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">客户空间</span>
                    <span className="text-foreground font-medium">
                      {clientSpaceId
                        ? clientSpaces.find((c) => c.id === clientSpaceId)
                          ?.clientName || clientSpaceId
                        : "\u2014"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">任务类型</span>
                    <span className="text-foreground">
                      {TASK_TYPES.find((t) => t.value === taskType)?.label || taskType}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">输入模式</span>
                    <span className="text-foreground">
                      {INPUT_MODES.find((m) => m.value === inputMode)?.label || inputMode}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">系列资产包</span>
                    <span className="text-foreground">
                      {seriesPackId
                        ? seriesPacks.find((s) => s.id === seriesPackId)?.seriesName || seriesPackId
                        : "不使用"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">目标平台</span>
                    <span className="text-foreground">
                      {selectedPlatforms.length > 0
                        ? selectedPlatforms.join(" / ")
                        : "\u2014"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">图包类型</span>
                    <span className="text-foreground">
                      {BUNDLE_TYPES.find((b) => b.value === bundleType)?.label || bundleType}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <Link href="/projects">
                    <Button variant="ghost" type="button">取消</Button>
                  </Link>
                  <Button
                    variant="primary"
                    onClick={() => setShowBatchStep(true)}
                    disabled={!allStepsValid || !projectName.trim()}
                  >
                    下一步：选择商品
                  </Button>
                </div>
              </CardContent>
            </Card>

            {showBatchStep && clientSpaceId && (
              <BatchProductSelector
                clientSpaceId={clientSpaceId}
                seriesPackId={seriesPackId || undefined}
                projectName={projectName}
                selectedPlatforms={selectedPlatforms}
                inputMode={inputMode}
                bundleType={bundleType}
                onBack={() => setShowBatchStep(false)}
                onComplete={handleBatchComplete}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

interface SlotPlan {
  slotType: string;
  nativeName?: string;
  maxCount?: number;
  isAnchor: boolean;
  isRequired: boolean;
  sequenceOrder: number;
  exportNameSuggestion: string;
  ruleRefs: string[];
  warnings: string[];
}

const SLOT_TYPE_MAP: Record<string, { nativeName: string; maxCount: number }> = {
  MAIN: { nativeName: "主图(白底)", maxCount: 1 },
  MAIN_TEXT: { nativeName: "主图(带文案)", maxCount: 1 },
  FEATURE: { nativeName: "功能卖点图", maxCount: 3 },
  SCENE: { nativeName: "场景图", maxCount: 5 },
  SPEC: { nativeName: "规格图", maxCount: 3 },
  COMPARE: { nativeName: "对比图", maxCount: 2 },
  TRUST: { nativeName: "信任背书图", maxCount: 2 },
  DETAIL: { nativeName: "详情图", maxCount: 10 },
  VIDEO: { nativeName: "视频封面", maxCount: 1 },
};

interface BundlePlanData {
  platform: string;
  slots: SlotPlan[];
}

const PLATFORM_LABELS: Record<string, string> = {
  TAOBAO_TMALL: "淘宝/天猫",
  JD: "京东",
  PINDUODUO: "拼多多",
  DOUYIN: "抖音",
  AMAZON: "Amazon",
  EBAY: "eBay",
  ETSY: "Etsy",
  SHOPIFY: "Shopify",
  TIKTOK_SHOP: "TikTok Shop",
  ALIEXPRESS: "AliExpress",
};

const SLOT_LABELS: Record<string, string> = {
  main_white: "首图白底",
  main_text: "首图",
  feature: "功能卖点",
  scene: "场景图",
  spec: "规格图",
  compare: "对比图",
  trust: "信任背书图",
};

const REQUIRED_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const ANCHOR_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
  </svg>
);

const WARN_ICON = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const PLAN_ICON = (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
    <path d="M14 2v6h6" />
    <path d="M16 13H8" />
    <path d="M16 17H8" />
    <path d="M10 9H8" />
  </svg>
);

export default function PlanPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [plans, setPlans] = useState<BundlePlanData[]>([]);
  const [loading, setLoading] = useState(true);
  const [planning, setPlanning] = useState(false);
  const [error, setError] = useState("");

  const [recommendation, setRecommendation] = useState<{
    slotTypes: string[];
    basis: string;
  } | null>(null);
  const [loadingRecommendation, setLoadingRecommendation] = useState(false);
  const [adoptingRecommendation, setAdoptingRecommendation] = useState(false);

  const fetchPlan = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/plan`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || data.error || "加载失败");
      }
      const data = await res.json();
      setPlans(data.plan || data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPlan();
  }, [fetchPlan]);

  async function handleGeneratePlan() {
    setPlanning(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/plan`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || data.error || "规划失败");
      }
      const data = await res.json();
      setPlans(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setPlanning(false);
    }
  }

  async function handleLoadRecommendation() {
    setLoadingRecommendation(true);
    setRecommendation(null);
    try {
      const params = new URLSearchParams({ platformId: "default", workspaceId: "default" });
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
  }

  async function handleAdoptRecommendation() {
    setAdoptingRecommendation(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "recommendation", recommendation }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || data.error || "采纳推荐失败");
      }
      const data = await res.json();
      setPlans(data);
      setRecommendation(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setAdoptingRecommendation(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" className="mx-auto mb-4" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  const hasPlan = plans.length > 0;

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-primary transition-colors">
            首页
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">
            图包规划
          </span>
        </nav>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">图包规划</h1>
            <p className="text-sm text-muted-foreground mt-1">
              项目 ID: {projectId}
            </p>
          </div>
          {hasPlan && (
            <Button
              variant="accent"
              onClick={() => router.push(`/projects/${projectId}/generate`)}
            >
              确认并进入生成
            </Button>
          )}
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {!hasPlan && !error ? (
          <div className="space-y-4">
            <EmptyState
              icon={PLAN_ICON}
              title="暂无图包规划"
              description="点击下方按钮，系统将根据项目选择的平台自动生成图位规划清单"
              action={
                <div className="flex gap-3">
                  <Button
                    variant="primary"
                    loading={planning}
                    onClick={handleGeneratePlan}
                  >
                    生成图包规划
                  </Button>
                  <Button
                    variant="outline"
                    loading={loadingRecommendation}
                    onClick={handleLoadRecommendation}
                  >
                    从推荐加载
                  </Button>
                </div>
              }
            />
            {recommendation && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">💡 推荐方案</CardTitle>
                </CardHeader>
                <CardContent>
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
                  <div className="mt-3">
                    <Button
                      variant="primary"
                      size="sm"
                      loading={adoptingRecommendation}
                      onClick={handleAdoptRecommendation}
                    >
                      采纳
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {plans.map((plan) => (
              <Card key={plan.platform}>
                <div className="px-6 py-4 bg-secondary border-b border-border">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold text-foreground">
                      {PLATFORM_LABELS[plan.platform] || plan.platform}
                    </h2>
                    <Badge variant="primary" className="font-mono">
                      {plan.platform}
                    </Badge>
                    <Badge variant="outline">
                      {plan.slots.length} 个图位
                    </Badge>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-secondary border-b border-border">
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground w-12">
                          #
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          图位名称
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          SlotType
                        </th>
                        <th className="text-center px-4 py-3 font-medium text-muted-foreground w-16">
                          必选
                        </th>
                        <th className="text-center px-4 py-3 font-medium text-muted-foreground w-16">
                          锚点
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          导出文件名建议
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          风险提醒
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan.slots.map((slot, idx) => (
                        <tr
                          key={idx}
                          className={
                            slot.isAnchor
                              ? "bg-primary/5 border-b border-primary/20"
                              : "border-b border-border hover:bg-secondary"
                          }
                        >
                          <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                            {slot.sequenceOrder.toString().padStart(2, "0")}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">
                                {slot.nativeName || SLOT_TYPE_MAP[slot.slotType]?.nativeName || SLOT_LABELS[slot.slotType] || slot.slotType}
                              </span>
                              <span className="text-xs text-muted-foreground/60 font-mono">
                                ×{slot.maxCount ?? SLOT_TYPE_MAP[slot.slotType]?.maxCount ?? 1}张
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <code className="text-xs bg-secondary text-muted-foreground px-1.5 py-0.5 rounded font-mono">
                              {slot.slotType}
                            </code>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {slot.isRequired ? (
                              <span className="text-destructive font-bold inline-flex items-center justify-center">
                                {REQUIRED_ICON}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">&mdash;</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {slot.isAnchor ? (
                              <span className="text-primary inline-flex items-center justify-center" title="首图锚点">
                                {ANCHOR_ICON}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">&mdash;</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <code className="text-xs bg-secondary text-muted-foreground px-1.5 py-0.5 rounded font-mono break-all">
                              {slot.exportNameSuggestion}
                            </code>
                          </td>
                          <td className="px-4 py-3 max-w-[280px]">
                            {slot.warnings.length > 0 ? (
                              <ul className="space-y-0.5">
                                {slot.warnings.map((w, wi) => (
                                  <li
                                    key={wi}
                                    className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded flex items-start gap-1"
                                  >
                                    {WARN_ICON}
                                    <span>{w}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <span className="text-xs text-muted-foreground">无</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {plan.slots.some((s) => s.ruleRefs.length > 0) && (
                  <div className="px-6 py-3 border-t border-border">
                    <details className="text-xs text-muted-foreground">
                      <summary className="cursor-pointer hover:text-foreground font-medium">
                        规则引用 ({plan.slots.reduce((sum, s) => sum + s.ruleRefs.length, 0)} 条)
                      </summary>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {Array.from(
                          new Set(
                            plan.slots.flatMap((s) => s.ruleRefs)
                          )
                        ).map((ref, ri) => (
                          <code
                            key={ri}
                            className="bg-secondary border border-border text-muted-foreground px-1.5 py-0.5 rounded text-xs"
                          >
                            {ref}
                          </code>
                        ))}
                      </div>
                    </details>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

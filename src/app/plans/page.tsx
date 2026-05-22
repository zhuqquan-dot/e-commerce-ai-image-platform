"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Plan {
  id: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  monthlyCredits: number;
  memberLimit: number;
  clientSpaceLimit: number;
  brandPackLimit: number;
  seriesPackLimit: number;
  projectLimit: number;
  exportLimit: number;
  batchEnabled: boolean;
  multiPlatformEnabled: boolean;
  reviewEnabled: boolean;
  exportEnabled: boolean;
  displayOrder: number;
  isActive: boolean;
}

const FEATURE_LABELS: Record<string, string> = {
  batchEnabled: "批量生成",
  multiPlatformEnabled: "多平台",
  reviewEnabled: "审核流程",
  exportEnabled: "导出交付",
};

export default function PlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const [plansRes, meRes] = await Promise.all([
        fetch("/api/plans"),
        fetch("/api/auth/me"),
      ]);
      if (!plansRes.ok) throw new Error("加载套餐失败");
      const data: Plan[] = await plansRes.json();
      setPlans(data);
      if (meRes.ok) {
        const me = await meRes.json();
        if (me.currentWorkspace?.id) setWorkspaceId(me.currentWorkspace.id);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-6 space-y-4">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">选择套餐</h1>
      <p className="text-muted-foreground">选择适合您团队的套餐，随时可升级</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan) => {
          const isRecommended = plan.id === "plan-2";
          return (
            <Card
              key={plan.id}
              className={`relative flex flex-col ${isRecommended ? "border-primary shadow-md" : ""}`}
            >
              {isRecommended && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                  <Badge variant="primary" size="md">推荐</Badge>
                </div>
              )}
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{plan.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 gap-4">
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-foreground">
                    ¥{plan.monthlyPrice}<span className="text-sm font-normal text-muted-foreground">/月</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    ¥{plan.yearlyPrice}<span className="text-muted-foreground">/年</span>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground flex-1">
                  <div>月度积分：<span className="text-foreground font-medium">{plan.monthlyCredits}</span></div>
                  <div>成员上限：<span className="text-foreground font-medium">{plan.memberLimit}</span></div>
                  <div>客户空间：<span className="text-foreground font-medium">{plan.clientSpaceLimit}</span></div>
                  <div className="pt-2 border-t border-border space-y-1.5">
                    {Object.entries(FEATURE_LABELS).map(([key, label]) => {
                      const enabled = plan[key as keyof Plan];
                      return (
                        <div key={key} className="flex items-center gap-1.5">
                          <span className={enabled ? "text-emerald-600" : "text-muted-foreground/40"}>
                            {enabled ? "✓" : "✗"}
                          </span>
                          <span className={enabled ? "text-foreground" : "text-muted-foreground/60"}>
                            {label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Button
                  variant={isRecommended ? "primary" : "outline"}
                  className="w-full"
                  onClick={() => {
                    if (workspaceId) {
                      router.push(`/workspaces/${workspaceId}/subscription?planId=${plan.id}`);
                    } else {
                      router.push(`/workspaces`);
                    }
                  }}
                >
                  立即订阅
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

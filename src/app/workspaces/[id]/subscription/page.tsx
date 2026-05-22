"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface SubscriptionInfo {
  id: string;
  workspaceId: string;
  planId: string;
  period: string;
  status: string;
  startAt: string;
  endAt: string;
  autoRenew: boolean;
  plan: {
    id: string;
    name: string;
    monthlyPrice: number;
    yearlyPrice: number;
    monthlyCredits: number;
  };
}

interface WorkspaceInfo {
  planId: string | null;
  monthlyCredits: number;
  fuelCredits: number;
  subscriptionStatus: string;
  quotaResetAt: string | null;
}

interface Plan {
  id: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  monthlyCredits: number;
  memberLimit: number;
  clientSpaceLimit: number;
  displayOrder: number;
  isActive: boolean;
}

const STATUS_MAP: Record<string, { label: string; variant: "success" | "destructive" | "warning" }> = {
  active: { label: "生效中", variant: "success" },
  expired: { label: "已过期", variant: "destructive" },
  trial: { label: "试用中", variant: "warning" },
  cancelled: { label: "已取消", variant: "destructive" },
};

const PERIOD_LABELS: Record<string, string> = {
  monthly: "月付",
  yearly: "年付",
};

export default function SubscriptionPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const workspaceId = params.id;
  const preselectedPlanId = searchParams.get("planId");

  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [subRes, plansRes] = await Promise.all([
        fetch(`/api/workspaces/${workspaceId}/subscription`),
        fetch("/api/plans"),
      ]);
      if (!subRes.ok) throw new Error("加载订阅信息失败");
      if (!plansRes.ok) throw new Error("加载套餐列表失败");

      const subData = await subRes.json();
      const plansData = await plansRes.json();

      setSubscription(subData.subscription);
      setWorkspace(subData.workspace);
      setPlans(plansData);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleChange = async (action: "upgrade" | "downgrade" | "renew", planId?: string) => {
    setActionLoading(true);
    setError("");
    try {
      const body: Record<string, string> = { action };
      if (planId) body.planId = planId;

      const res = await fetch(`/api/workspaces/${workspaceId}/subscription`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "操作失败");
      }
      await fetchData();
    } catch (e) {
      setError(String(e));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !subscription) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm mb-4">
          {error}
        </div>
        <Button variant="ghost" size="sm" onClick={() => router.push("/workspaces")}>
          ← 返回工作空间列表
        </Button>
      </div>
    );
  }

  const currentStatus = workspace?.subscriptionStatus || "trial";
  const statusInfo = STATUS_MAP[currentStatus] || { label: currentStatus, variant: "outline" as const };

  const currentPlanId = subscription?.planId || workspace?.planId;
  const currentPlanPrice = subscription?.plan?.monthlyPrice || 0;

  const upgradablePlans = plans.filter(
    (p) => p.id !== currentPlanId && p.monthlyPrice > currentPlanPrice
  );
  const downgradablePlans = plans.filter(
    (p) => p.id !== currentPlanId && p.monthlyPrice < currentPlanPrice
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href={`/workspaces/${workspaceId}/settings`} className="hover:text-foreground transition-colors">
          工作空间设置
        </Link>
        <span>/</span>
        <span className="text-foreground">订阅管理</span>
      </div>

      <h1 className="text-2xl font-bold text-foreground">订阅管理</h1>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
          {error}
          <button className="ml-2 underline" onClick={() => setError("")}>×</button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>当前订阅</CardTitle>
          <CardDescription>查看当前套餐信息与状态</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-foreground">套餐名称</span>
            <span className="text-muted-foreground">{subscription?.plan?.name || "免费版"}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-foreground">计费周期</span>
            <span className="text-muted-foreground">
              {subscription ? PERIOD_LABELS[subscription.period] || subscription.period : "—"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-foreground">状态</span>
            <Badge variant={statusInfo.variant} size="md">{statusInfo.label}</Badge>
          </div>
          {subscription && (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-foreground">到期时间</span>
              <span className="text-muted-foreground">
                {new Date(subscription.endAt).toLocaleDateString("zh-CN", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-foreground">月度积分</span>
            <span className="text-muted-foreground">{workspace?.monthlyCredits ?? 0}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-foreground">加油包积分</span>
            <span className="text-muted-foreground">{workspace?.fuelCredits ?? 0}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>变更套餐</CardTitle>
          <CardDescription>升级、降级或续费您的订阅</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {upgradablePlans.length > 0 && (
            <div className="space-y-2">
              <span className="text-sm font-medium text-foreground">升级到</span>
              <div className="flex flex-wrap gap-2">
                {upgradablePlans.map((p) => (
                  <Button
                    key={p.id}
                    variant="primary"
                    size="sm"
                    loading={actionLoading}
                    onClick={() => handleChange("upgrade", p.id)}
                  >
                    {p.name} ¥{p.monthlyPrice}/月
                  </Button>
                ))}
              </div>
            </div>
          )}
          {downgradablePlans.length > 0 && (
            <div className="space-y-2">
              <span className="text-sm font-medium text-foreground">降级到</span>
              <div className="flex flex-wrap gap-2">
                {downgradablePlans.map((p) => (
                  <Button
                    key={p.id}
                    variant="outline"
                    size="sm"
                    loading={actionLoading}
                    onClick={() => handleChange("downgrade", p.id)}
                  >
                    {p.name} ¥{p.monthlyPrice}/月
                  </Button>
                ))}
              </div>
            </div>
          )}
          {subscription && (
            <div className="space-y-2">
              <span className="text-sm font-medium text-foreground">续费</span>
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  loading={actionLoading}
                  onClick={() => handleChange("renew")}
                >
                  续费当前套餐
                </Button>
              </div>
            </div>
          )}
          {!subscription && plans.length > 0 && (
            <div className="space-y-2">
              <span className="text-sm font-medium text-foreground">选择套餐</span>
              <div className="flex flex-wrap gap-2">
                {plans.map((p) => (
                  <Button
                    key={p.id}
                    variant={p.id === preselectedPlanId ? "primary" : "outline"}
                    size="sm"
                    loading={actionLoading}
                    onClick={() => handleChange("upgrade", p.id)}
                  >
                    {p.name} ¥{p.monthlyPrice}/月
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Link href={`/workspaces/${workspaceId}/settings`}>
          <Button variant="ghost" size="sm">← 返回设置</Button>
        </Link>
        <Link href={`/workspaces/${workspaceId}/billing`}>
          <Button variant="outline" size="sm">查看账单</Button>
        </Link>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface BillingRecord {
  id: string;
  workspaceId: string;
  taskId: string | null;
  amount: number;
  balanceAfter: number;
  reason: string;
  createdAt: string;
}

interface CreditRecord {
  id: string;
  workspaceId: string;
  taskId: string | null;
  amount: number;
  balanceAfter: number;
  reason: string;
  createdAt: string;
}

interface WorkspaceCredits {
  monthlyCredits: number;
  fuelCredits: number;
}

const REASON_LABELS: Record<string, string> = {
  subscription_purchase: "套餐购买",
  fuel_pack_purchase: "加油包购买",
  generation: "图片生成",
  batch_generation: "批量生成",
  retry: "重试生成",
  export: "导出交付",
  monthly_reset: "月度重置",
  credit_grant: "积分发放",
};

type TabKey = "billing" | "credits";

export default function BillingPage() {
  const params = useParams<{ id: string }>();
  const workspaceId = params.id;

  const [billingHistory, setBillingHistory] = useState<BillingRecord[]>([]);
  const [creditHistory, setCreditHistory] = useState<CreditRecord[]>([]);
  const [credits, setCredits] = useState<WorkspaceCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("billing");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [billingRes, creditRes, subRes] = await Promise.all([
        fetch(`/api/billing?workspaceId=${workspaceId}`),
        fetch(`/api/billing/credit-history?workspaceId=${workspaceId}`),
        fetch(`/api/workspaces/${workspaceId}/subscription`),
      ]);

      if (!billingRes.ok) throw new Error("加载购买记录失败");
      if (!creditRes.ok) throw new Error("加载积分消耗记录失败");

      const billingData = await billingRes.json();
      const creditData = await creditRes.json();

      setBillingHistory(billingData);
      setCreditHistory(creditData);

      if (subRes.ok) {
        const subData = await subRes.json();
        if (subData.workspace) {
          setCredits({
            monthlyCredits: subData.workspace.monthlyCredits,
            fuelCredits: subData.workspace.fuelCredits,
          });
        }
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatAmount = (amount: number) => {
    if (amount >= 0) return `+${amount}`;
    return String(amount);
  };

  const formatReason = (reason: string) => REASON_LABELS[reason] || reason;

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && billingHistory.length === 0 && creditHistory.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm mb-4">
          {error}
        </div>
        <Link href={`/workspaces/${workspaceId}/settings`}>
          <Button variant="ghost" size="sm">← 返回设置</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href={`/workspaces/${workspaceId}/settings`} className="hover:text-foreground transition-colors">
          工作空间设置
        </Link>
        <span>/</span>
        <span className="text-foreground">账单</span>
      </div>

      <h1 className="text-2xl font-bold text-foreground">账单</h1>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
          {error}
          <button className="ml-2 underline" onClick={() => setError("")}>×</button>
        </div>
      )}

      {credits && (
        <Card>
          <CardHeader>
            <CardTitle>积分余额</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-8">
              <div>
                <span className="text-sm text-muted-foreground">月度积分</span>
                <div className="text-2xl font-bold text-foreground">{credits.monthlyCredits}</div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">加油包积分</span>
                <div className="text-2xl font-bold text-foreground">{credits.fuelCredits}</div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">总余额</span>
                <div className="text-2xl font-bold text-primary">
                  {credits.monthlyCredits + credits.fuelCredits}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex gap-1 border-b border-border -mb-1">
            <button
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "billing"
                  ? "text-foreground border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("billing")}
            >
              购买记录
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "credits"
                  ? "text-foreground border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("credits")}
            >
              积分消耗
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {activeTab === "billing" && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left py-3 px-2 font-medium">日期</th>
                    <th className="text-left py-3 px-2 font-medium">类型</th>
                    <th className="text-right py-3 px-2 font-medium">金额</th>
                    <th className="text-right py-3 px-2 font-medium">余额</th>
                  </tr>
                </thead>
                <tbody>
                  {billingHistory.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-muted-foreground">
                        暂无购买记录
                      </td>
                    </tr>
                  ) : (
                    billingHistory.map((record) => (
                      <tr key={record.id} className="border-b border-border/50 hover:bg-secondary/30">
                        <td className="py-3 px-2 text-muted-foreground">{formatDate(record.createdAt)}</td>
                        <td className="py-3 px-2">
                          <Badge variant="outline" size="sm">{formatReason(record.reason)}</Badge>
                        </td>
                        <td className="py-3 px-2 text-right font-medium text-foreground">
                          {formatAmount(record.amount)}
                        </td>
                        <td className="py-3 px-2 text-right text-muted-foreground">{record.balanceAfter}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "credits" && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left py-3 px-2 font-medium">日期</th>
                    <th className="text-left py-3 px-2 font-medium">任务</th>
                    <th className="text-right py-3 px-2 font-medium">消耗</th>
                    <th className="text-right py-3 px-2 font-medium">余额</th>
                  </tr>
                </thead>
                <tbody>
                  {creditHistory.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-muted-foreground">
                        暂无消耗记录
                      </td>
                    </tr>
                  ) : (
                    creditHistory.map((record) => (
                      <tr key={record.id} className="border-b border-border/50 hover:bg-secondary/30">
                        <td className="py-3 px-2 text-muted-foreground">{formatDate(record.createdAt)}</td>
                        <td className="py-3 px-2">
                          <Badge variant="outline" size="sm">{formatReason(record.reason)}</Badge>
                        </td>
                        <td className="py-3 px-2 text-right font-medium text-destructive">
                          {record.amount}
                        </td>
                        <td className="py-3 px-2 text-right text-muted-foreground">{record.balanceAfter}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Link href={`/workspaces/${workspaceId}/settings`}>
          <Button variant="ghost" size="sm">← 返回设置</Button>
        </Link>
        <Link href={`/workspaces/${workspaceId}/quota`}>
          <Button variant="outline" size="sm">查看额度用量</Button>
        </Link>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Entitlements {
  featureFlags: {
    batchEnabled: boolean;
    multiPlatformEnabled: boolean;
    reviewEnabled: boolean;
    exportEnabled: boolean;
  };
  quotas: {
    memberLimit: number;
    clientSpaceLimit: number;
    brandPackLimit: number;
    seriesPackLimit: number;
    projectLimit: number;
    exportLimit: number;
    monthlyCredits: number;
  };
}

interface UsageCounts {
  projects: number;
  members: number;
  clientSpaces: number;
  brandPacks: number;
  seriesPacks: number;
  exports: number;
}

interface QuotaItem {
  key: string;
  label: string;
  current: number;
  limit: number;
}

function ProgressBar({ current, limit }: { current: number; limit: number }) {
  if (limit === 0) {
    return (
      <div className="space-y-1">
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div className="h-full rounded-full bg-primary" style={{ width: "0%" }} />
        </div>
      </div>
    );
  }

  const pct = Math.min((current / limit) * 100, 100);
  const color =
    pct > 95 ? "bg-red-500" : pct > 80 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="space-y-1">
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function QuotaPage() {
  const params = useParams<{ id: string }>();
  const workspaceId = params.id;

  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const [usage, setUsage] = useState<UsageCounts>({
    projects: 0,
    members: 0,
    clientSpaces: 0,
    brandPacks: 0,
    seriesPacks: 0,
    exports: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const entRes = await fetch(`/api/workspaces/${workspaceId}/entitlements`);
      if (!entRes.ok) throw new Error("加载额度信息失败");
      const entData: Entitlements = await entRes.json();
      setEntitlements(entData);

      const [membersRes, projectsRes, clientSpacesRes, brandPacksRes, seriesPacksRes] =
        await Promise.all([
          fetch(`/api/workspaces/${workspaceId}/members`).catch(() => null),
          fetch(`/api/projects?workspaceId=${workspaceId}`).catch(() => null),
          fetch(`/api/client-spaces?workspaceId=${workspaceId}`).catch(() => null),
          fetch(`/api/brand-packs?workspaceId=${workspaceId}`).catch(() => null),
          fetch(`/api/series-packs?workspaceId=${workspaceId}`).catch(() => null),
        ]);

      const counts: UsageCounts = {
        projects: 0,
        members: 0,
        clientSpaces: 0,
        brandPacks: 0,
        seriesPacks: 0,
        exports: 0,
      };

      if (membersRes?.ok) {
        const data = await membersRes.json();
        counts.members = Array.isArray(data) ? data.length : (data.members?.length ?? 0);
      }
      if (projectsRes?.ok) {
        const data = await projectsRes.json();
        counts.projects = Array.isArray(data) ? data.length : (data.total ?? 0);
      }
      if (clientSpacesRes?.ok) {
        const data = await clientSpacesRes.json();
        counts.clientSpaces = Array.isArray(data) ? data.length : (data.total ?? 0);
      }
      if (brandPacksRes?.ok) {
        const data = await brandPacksRes.json();
        counts.brandPacks = Array.isArray(data) ? data.length : (data.total ?? 0);
      }
      if (seriesPacksRes?.ok) {
        const data = await seriesPacksRes.json();
        counts.seriesPacks = Array.isArray(data) ? data.length : (data.total ?? 0);
      }

      setUsage(counts);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="p-6 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !entitlements) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm mb-4">
          {error}
        </div>
        <Link href={`/workspaces/${workspaceId}/settings`}>
          <Button variant="ghost" size="sm">← 返回设置</Button>
        </Link>
      </div>
    );
  }

  const quotas = entitlements?.quotas;

  const quotaItems: QuotaItem[] = [
    { key: "projects", label: "项目数", current: usage.projects, limit: quotas?.projectLimit ?? 0 },
    { key: "members", label: "成员数", current: usage.members, limit: quotas?.memberLimit ?? 0 },
    { key: "clientSpaces", label: "客户空间", current: usage.clientSpaces, limit: quotas?.clientSpaceLimit ?? 0 },
    { key: "brandPacks", label: "品牌包", current: usage.brandPacks, limit: quotas?.brandPackLimit ?? 0 },
    { key: "seriesPacks", label: "系列包", current: usage.seriesPacks, limit: quotas?.seriesPackLimit ?? 0 },
    { key: "exports", label: "导出", current: usage.exports, limit: quotas?.exportLimit ?? 0 },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href={`/workspaces/${workspaceId}/settings`} className="hover:text-foreground transition-colors">
          工作空间设置
        </Link>
        <span>/</span>
        <span className="text-foreground">额度用量</span>
      </div>

      <h1 className="text-2xl font-bold text-foreground">额度用量</h1>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
          {error}
          <button className="ml-2 underline" onClick={() => setError("")}>×</button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>配额使用情况</CardTitle>
          <CardDescription>当前工作空间各维度的额度使用情况</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {quotaItems.map((item) => {
            const pct = item.limit > 0 ? Math.round((item.current / item.limit) * 100) : 0;
            const colorClass =
              pct > 95 ? "text-red-600" : pct > 80 ? "text-amber-600" : "text-emerald-600";

            return (
              <div key={item.key} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{item.label}</span>
                  <span className="text-muted-foreground">
                    <span className={colorClass}>{item.current}</span>
                    {" / "}
                    {item.limit}
                    {item.limit > 0 && (
                      <span className="ml-1.5 text-xs">({pct}%)</span>
                    )}
                  </span>
                </div>
                <ProgressBar current={item.current} limit={item.limit} />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {entitlements && (
        <Card>
          <CardHeader>
            <CardTitle>功能权限</CardTitle>
            <CardDescription>当前套餐支持的功能</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  ["batchEnabled", "批量生成"],
                  ["multiPlatformEnabled", "多平台"],
                  ["reviewEnabled", "审核流程"],
                  ["exportEnabled", "导出交付"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2 text-sm">
                  <span className={entitlements.featureFlags[key] ? "text-emerald-600" : "text-muted-foreground/40"}>
                    {entitlements.featureFlags[key] ? "✓" : "✗"}
                  </span>
                  <span className={entitlements.featureFlags[key] ? "text-foreground" : "text-muted-foreground/60"}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Link href={`/workspaces/${workspaceId}/settings`}>
          <Button variant="ghost" size="sm">← 返回设置</Button>
        </Link>
        <Link href={`/workspaces/${workspaceId}/subscription`}>
          <Button variant="outline" size="sm">升级套餐</Button>
        </Link>
      </div>
    </div>
  );
}

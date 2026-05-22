"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface WorkspaceDetail {
  id: string;
  name: string;
  type: string;
  owner: { id: string; name: string; email: string | null };
  role: string;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

interface EntitlementInfo {
  monthlyCredits: number;
  fuelCredits: number;
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
}

const ENTERPRISE_FEATURES = [
  { key: "batchEnabled", label: "批量生成" },
  { key: "multiPlatformEnabled", label: "多平台支持" },
  { key: "reviewEnabled", label: "审核流程" },
  { key: "exportEnabled", label: "导出功能" },
];

export default function EnterprisePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
  const [entitlements, setEntitlements] = useState<EntitlementInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const wsRes = await fetch(`/api/workspaces/${id}`);
      if (!wsRes.ok) {
        if (wsRes.status === 401) throw new Error("请先登录");
        if (wsRes.status === 403) throw new Error("无权访问该工作空间");
        if (wsRes.status === 404) throw new Error("工作空间不存在");
        throw new Error("加载失败");
      }
      const wsData: WorkspaceDetail = await wsRes.json();
      setWorkspace(wsData);

      const entRes = await fetch(`/api/workspaces/${id}/entitlements`);
      if (entRes.ok) {
        const entData = await entRes.json();
        setEntitlements(entData);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  if (error) {
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

  if (!workspace) return null;

  const isEnterprise = workspace.type === "enterprise";

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/workspaces" className="hover:text-foreground transition-colors">
          工作空间
        </Link>
        <span>/</span>
        <Link href={`/workspaces/${id}/settings`} className="hover:text-foreground transition-colors">
          {workspace.name}
        </Link>
        <span>/</span>
        <span className="text-foreground">企业权益</span>
      </div>

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-foreground">企业权益</h1>
        {isEnterprise && (
          <Badge variant="primary" size="md">企业版</Badge>
        )}
      </div>

      {isEnterprise ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>企业专属权益</CardTitle>
              <CardDescription>当前工作空间的企业级功能与配额</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {entitlements && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-secondary rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">月度额度</p>
                    <p className="text-lg font-semibold text-foreground">{entitlements.monthlyCredits}</p>
                  </div>
                  <div className="bg-secondary rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">燃油额度</p>
                    <p className="text-lg font-semibold text-foreground">{entitlements.fuelCredits}</p>
                  </div>
                  <div className="bg-secondary rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">成员上限</p>
                    <p className="text-lg font-semibold text-foreground">{entitlements.memberLimit}</p>
                  </div>
                  <div className="bg-secondary rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">项目上限</p>
                    <p className="text-lg font-semibold text-foreground">{entitlements.projectLimit}</p>
                  </div>
                </div>
              )}

              <div className="space-y-2 pt-2">
                <p className="text-sm font-medium text-foreground">功能权限</p>
                <div className="flex flex-wrap gap-2">
                  {ENTERPRISE_FEATURES.map((f) => (
                    <Badge
                      key={f.key}
                      variant={entitlements?.[f.key as keyof EntitlementInfo] ? "success" : "outline"}
                      size="md"
                    >
                      {entitlements?.[f.key as keyof EntitlementInfo] ? "✓ " : "○ "}
                      {f.label}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>企业服务</CardTitle>
              <CardDescription>专属服务与交付能力</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-foreground">专属客户经理</span>
                <Badge variant="primary" size="md">已开通</Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-foreground">优先交付通道</span>
                <Badge variant="primary" size="md">已开通</Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-foreground">定制化规则配置</span>
                <Badge variant="primary" size="md">已开通</Badge>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-foreground">SLA 保障</span>
                <Badge variant="primary" size="md">99.9%</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>服务联系</CardTitle>
              <CardDescription>企业专属服务对接</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                如需调整配额、开通定制功能或有任何服务需求，请联系您的专属客户经理。
              </p>
              <p className="text-sm text-foreground">
                企业服务热线：400-888-0000
              </p>
              <p className="text-sm text-foreground">
                企业服务邮箱：enterprise@mircioo.com
              </p>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>升级到企业版</CardTitle>
            <CardDescription>解锁更多专属功能与配额</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              当前工作空间为标准版。升级到企业版可享受：
            </p>
            <ul className="space-y-2 text-sm text-foreground">
              <li className="flex items-center gap-2">
                <Badge variant="success" size="sm">✓</Badge>
                自定义配额与功能权限
              </li>
              <li className="flex items-center gap-2">
                <Badge variant="success" size="sm">✓</Badge>
                专属客户经理与优先交付
              </li>
              <li className="flex items-center gap-2">
                <Badge variant="success" size="sm">✓</Badge>
                定制化规则配置与 SLA 保障
              </li>
              <li className="flex items-center gap-2">
                <Badge variant="success" size="sm">✓</Badge>
                批量生成、多平台支持等高级功能
              </li>
            </ul>
            <Link href="/plans">
              <Button variant="primary" size="md">
                升级到企业版
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Link href={`/workspaces/${id}/settings`}>
          <Button variant="ghost" size="sm">
            ← 返回设置
          </Button>
        </Link>
      </div>
    </div>
  );
}

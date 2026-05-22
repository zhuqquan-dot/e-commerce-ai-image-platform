"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ToastProvider, useToast } from "@/components/toast";
import { hasPermission, type Role } from "@/auth/permissions";
import { useEntitlements } from "@/hooks/use-entitlements";

interface ClientSpace {
  id: string;
  clientName: string;
  brandName: string;
  region: string;
}

interface Project {
  id: string;
  projectType: string;
  status: string;
  selectedPlatforms: string[];
  inputMode: string;
  createdAt: string;
  productId: string;
  productName?: string;
  clientSpaceId?: string;
  clientSpaceName?: string;
}

interface StatsData {
  monthlyProjects: number;
  pendingReviewTasks: number;
  recentExportPacks: number;
  monthlyCreditCost: number;
}

interface UserInfo {
  user: { id: string; name: string; email?: string | null; phone?: string | null };
  currentWorkspace: { id: string; name: string; role: string } | null;
  workspaces: { id: string; name: string; role: string }[];
}

const STATUS_MAP: Record<string, { label: string; variant: "outline" | "primary" | "success" | "warning" | "destructive" }> = {
  draft: { label: "草稿", variant: "outline" },
  planned: { label: "已规划", variant: "primary" },
  generating: { label: "生成中", variant: "primary" },
  qc_pending: { label: "待QC", variant: "warning" },
  qc_failed: { label: "QC未通过", variant: "destructive" },
  review_pending: { label: "待审核", variant: "warning" },
  review_approved: { label: "已通过", variant: "success" },
  review_rejected: { label: "已驳回", variant: "destructive" },
  completed: { label: "已完成", variant: "success" },
  exporting: { label: "导出中", variant: "primary" },
  exported: { label: "已导出", variant: "success" },
};

const PROJECT_TYPE_MAP: Record<string, string> = {
  single_product_single_platform: "单商品单平台",
  single_product_multi_platform: "单商品多平台",
  multi_product_batch: "多商品批量",
};

export default function DashboardPage() {
  return (
    <ToastProvider>
      <DashboardPageContent />
    </ToastProvider>
  );
}

function DashboardPageContent() {
  const { toast } = useToast();

  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [clientSpaces, setClientSpaces] = useState<ClientSpace[]>([]);
  const [activeSpaceId, setActiveSpaceId] = useState<string>("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<StatsData>({
    monthlyProjects: 0,
    pendingReviewTasks: 0,
    recentExportPacks: 0,
    monthlyCreditCost: 0,
  });
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingClientSpaces, setLoadingClientSpaces] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [error, setError] = useState("");

  const workspaceId = userInfo?.currentWorkspace?.id || "";
  const { featureFlags, planInfo, loading: loadingEntitlements } = useEntitlements(workspaceId || undefined);

  const role = userInfo?.currentWorkspace?.role || "";
  const canCreateProject = hasPermission(role as Role, "project:create");
  const canReview = hasPermission(role as Role, "task:review");
  const canExport = hasPermission(role as Role, "export:create");

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUserInfo(data);
      }
    } catch {
      // ignore — middleware handles redirect
    } finally {
      setLoadingUser(false);
    }
  }, []);

  const fetchClientSpaces = useCallback(async () => {
    try {
      const res = await fetch("/api/client-spaces?pageSize=50");
      if (!res.ok) throw new Error("加载客户空间失败");
      const data = await res.json();
      const list: ClientSpace[] = data.list || [];
      setClientSpaces(list);
      if (list.length > 0 && !activeSpaceId) {
        setActiveSpaceId(list[0].id);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoadingClientSpaces(false);
    }
  }, [activeSpaceId]);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await fetch("/api/projects?status=all&pageSize=100");
      if (!res.ok) throw new Error("加载统计数据失败");
      const data = await res.json();
      const allProjects: Project[] = data.list || [];

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const monthlyProjects = allProjects.filter(
        (p) => new Date(p.createdAt) >= startOfMonth
      ).length;

      const pendingReviewTasks = allProjects.filter(
        (p) => p.status === "review_pending" || p.status === "qc_pending"
      ).length;

      const exportedProjects = allProjects.filter(
        (p) => p.status === "exported" || p.status === "exporting"
      ).length;

      const monthlyCreditCost = allProjects
        .filter((p) => new Date(p.createdAt) >= startOfMonth)
        .length * 10;

      setStats({
        monthlyProjects,
        pendingReviewTasks,
        recentExportPacks: exportedProjects,
        monthlyCreditCost,
      });
    } catch (e) {
      console.error("Stats fetch error:", e);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const params = new URLSearchParams({ pageSize: "5", page: "1" });
      const res = await fetch(`/api/projects?${params.toString()}`);
      if (!res.ok) throw new Error("加载项目列表失败");
      const data = await res.json();
      const list: Project[] = data.list || [];
      setProjects(list);
    } catch (e) {
      console.error("Projects fetch error:", e);
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
    fetchClientSpaces();
    fetchStats();
    fetchProjects();
  }, [fetchUser, fetchClientSpaces, fetchStats, fetchProjects]);

  const handleRefresh = () => {
    fetchStats();
    fetchProjects();
    toast("数据已刷新", "success");
  };

  const alertItems = [];
  if (stats.pendingReviewTasks > 0 && canReview) {
    alertItems.push({ type: "warn" as const, message: `有 ${stats.pendingReviewTasks} 个任务待审核`, link: "/projects?status=review_pending" });
  }
  const qcFailed = projects.filter((p) => p.status === "qc_failed").length;
  if (qcFailed > 0) {
    alertItems.push({ type: "error" as const, message: `有 ${qcFailed} 个生成任务 QC 未通过，建议重试`, link: "/projects?status=qc_failed" });
  }

  const STAT_CARDS = [
    {
      label: "本月项目数",
      value: loadingStats ? "..." : String(stats.monthlyProjects),
      unit: "个",
      icon: "\u{1F4CA}",
      accent: false,
    },
    {
      label: "待审核任务",
      value: loadingStats ? "..." : String(stats.pendingReviewTasks),
      unit: "个",
      icon: "\u{1F50D}",
      accent: stats.pendingReviewTasks > 0,
    },
    {
      label: "最近导出包",
      value: loadingStats ? "..." : String(stats.recentExportPacks),
      unit: "个",
      icon: "\u{1F4E6}",
      accent: false,
    },
    {
      label: "本月积分消耗",
      value: loadingStats ? "..." : String(stats.monthlyCreditCost),
      unit: "",
      icon: "\u26A1",
      accent: false,
    },
  ];

  const workspaceName = userInfo?.currentWorkspace?.name || "未选择工作空间";
  const userName = userInfo?.user?.name || userInfo?.user?.email || userInfo?.user?.phone || "";

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground/70 mb-1">Mircioo &gt; 工作台</div>
            <h1 className="text-2xl font-bold text-foreground">总控台</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleRefresh}>
              🔄 刷新
            </Button>
            {canCreateProject && (
              <Link href="/projects/new">
                <Button variant="primary" size="sm">
                  + 新建项目
                </Button>
              </Link>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏢</span>
              <div>
                <div className="text-sm font-semibold text-foreground">
                  {loadingUser ? <Skeleton className="h-4 w-24 inline-block" /> : workspaceName}
                </div>
                <div className="text-xs text-muted-foreground">
                  {loadingUser ? <Skeleton className="h-3 w-32 inline-block" /> : (userName ? `${userName} · ${role}` : role)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              {!loadingEntitlements && planInfo.planName && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">套餐</span>
                  <Badge variant="primary" size="sm">{planInfo.planName}</Badge>
                </div>
              )}
              {!loadingEntitlements && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">积分</span>
                  <span className="font-semibold text-foreground">{planInfo.monthlyCredits + planInfo.fuelCredits}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">状态</span>
                <span className="inline-flex items-center gap-1.5 text-emerald-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  运行中
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-foreground">ClientSpace 快捷切换</h2>
            <Link href="/client-spaces" className="text-xs text-primary hover:text-primary/80">
              管理全部 →
            </Link>
          </div>

          {loadingClientSpaces ? (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="w-48 h-20 shrink-0" />
              ))}
            </div>
          ) : clientSpaces.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center">
                <p className="text-muted-foreground text-sm mb-3">暂无客户空间</p>
                <Link href="/client-spaces">
                  <Button variant="primary" size="sm">
                    + 创建客户空间
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {clientSpaces.map((space) => (
                <button
                  key={space.id}
                  onClick={() => setActiveSpaceId(space.id)}
                  className={`shrink-0 w-48 text-left p-4 rounded-lg border transition-all duration-200 cursor-pointer ${
                    space.id === activeSpaceId
                      ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                      : "border-border bg-card hover:border-primary/30 hover:bg-secondary"
                  }`}
                >
                  <div className="text-sm font-semibold text-foreground truncate">
                    {space.clientName}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {space.brandName}
                    {space.region ? ` · ${space.region}` : ""}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STAT_CARDS.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="py-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-muted-foreground text-sm">{stat.label}</span>
                  <span className="text-lg">{stat.icon}</span>
                </div>
                <div className={`text-2xl font-bold ${stat.accent ? "text-primary" : "text-foreground"}`}>
                  {stat.value}
                  {stat.unit && (
                    <span className="text-sm font-normal text-muted-foreground ml-1">{stat.unit}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {!loadingEntitlements && (
          <Card>
            <CardContent className="py-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-foreground mb-1">当前套餐</div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground">套餐名称:</span>
                    <span className="text-foreground font-medium">{planInfo.planName || "未订阅"}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm mt-1">
                    <span className="text-muted-foreground">月度积分:</span>
                    <span className="text-foreground font-medium">{planInfo.monthlyCredits}</span>
                  </div>
                  {planInfo.fuelCredits > 0 && (
                    <div className="flex items-center gap-3 text-sm mt-1">
                      <span className="text-muted-foreground">加油包积分:</span>
                      <span className="text-foreground font-medium">{planInfo.fuelCredits}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-sm mt-1">
                    <span className="text-muted-foreground">订阅状态:</span>
                    <Badge variant={planInfo.subscriptionStatus === "active" ? "success" : "warning"} size="sm">
                      {planInfo.subscriptionStatus === "active" ? "已激活" : planInfo.subscriptionStatus || "未订阅"}
                    </Badge>
                  </div>
                </div>
                {(!planInfo.planName || planInfo.subscriptionStatus !== "active") && (
                  <Link href="/plans">
                    <Button variant="primary" size="sm">
                      升级套餐
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-foreground">最近项目</h2>
            <Link href="/projects" className="text-xs text-primary hover:text-primary/80">
              查看全部 →
            </Link>
          </div>

          {loadingProjects ? (
            <Card>
              <CardContent className="p-0">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-3 border-b border-border last:border-b-0">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 w-1/6" />
                    <Skeleton className="h-4 w-1/6" />
                    <Skeleton className="h-4 w-1/5" />
                    <Skeleton className="h-4 w-1/5" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : projects.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="text-4xl mb-3">📋</div>
                <p className="text-muted-foreground text-sm mb-4">暂无项目，点击下方按钮创建第一个</p>
                {canCreateProject && (
                  <Link href="/projects/new">
                    <Button variant="primary" size="md">+ 新建项目</Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-secondary border-b border-border">
                        <th className="text-left px-5 py-3 font-medium text-muted-foreground">项目ID</th>
                        <th className="text-left px-5 py-3 font-medium text-muted-foreground">类型</th>
                        <th className="text-left px-5 py-3 font-medium text-muted-foreground">目标平台</th>
                        <th className="text-left px-5 py-3 font-medium text-muted-foreground">状态</th>
                        <th className="text-left px-5 py-3 font-medium text-muted-foreground">创建时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projects.map((p) => {
                        const statusInfo = STATUS_MAP[p.status] || { label: p.status, variant: "outline" as const };
                        const platforms: string[] = typeof p.selectedPlatforms === "string"
                          ? JSON.parse(p.selectedPlatforms || "[]")
                          : (p.selectedPlatforms || []);
                        return (
                          <tr
                            key={p.id}
                            className="border-b border-border hover:bg-secondary cursor-pointer"
                            onClick={() => window.location.href = `/projects/${p.id}`}
                          >
                            <td className="px-5 py-3 font-mono text-xs text-muted-foreground/70">
                              {p.id.slice(0, 8)}...
                            </td>
                            <td className="px-5 py-3 text-muted-foreground">
                              {PROJECT_TYPE_MAP[p.projectType] || p.projectType}
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex gap-1 flex-wrap">
                                {platforms.slice(0, 3).map((pl: string) => (
                                  <Badge key={pl} variant="outline">{pl}</Badge>
                                ))}
                                {platforms.length > 3 && (
                                  <Badge variant="outline">+{platforms.length - 3}</Badge>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-3">
                              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                            </td>
                            <td className="px-5 py-3 text-muted-foreground/70 text-xs">
                              {new Date(p.createdAt).toLocaleDateString("zh-CN")}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {alertItems.length > 0 && (
          <div>
            <h2 className="text-base font-semibold text-foreground mb-3">⚠️ 异常提醒</h2>
            <div className="space-y-2">
              {alertItems.map((alert, i) => (
                <Link key={i} href={alert.link}>
                  <div
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors cursor-pointer ${
                      alert.type === "warn"
                        ? "bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100"
                        : "bg-destructive/10 border-destructive/20 text-destructive hover:bg-destructive/15"
                    }`}
                  >
                    <span className="text-lg">
                      {alert.type === "warn" ? "⚠️" : "❌"}
                    </span>
                    <span className="text-sm flex-1">{alert.message}</span>
                    <span className="text-xs opacity-70">查看详情 →</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-base font-semibold text-foreground mb-3">⚡ 快捷操作</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {canCreateProject && (
              <Link href="/projects/new">
                <Card className="text-center hover:shadow-md transition-shadow">
                  <CardContent className="py-5">
                    <div className="text-2xl mb-2">🚀</div>
                    <div className="text-sm font-medium text-foreground">新建项目</div>
                    <div className="text-xs text-muted-foreground mt-1">创建生图任务</div>
                  </CardContent>
                </Card>
              </Link>
            )}
            <Link href="/products">
              <Card className="text-center hover:shadow-md transition-shadow">
                <CardContent className="py-5">
                  <div className="text-2xl mb-2">📦</div>
                  <div className="text-sm font-medium text-foreground">商品库</div>
                  <div className="text-xs text-muted-foreground mt-1">管理全部商品</div>
                </CardContent>
              </Card>
            </Link>
            {canCreateProject && (
              <Link href="/products/new">
                <Card className="text-center hover:shadow-md transition-shadow">
                  <CardContent className="py-5">
                    <div className="text-2xl mb-2">➕</div>
                    <div className="text-sm font-medium text-foreground">录入商品</div>
                    <div className="text-xs text-muted-foreground mt-1">添加新商品</div>
                  </CardContent>
                </Card>
              </Link>
            )}
            {canReview && featureFlags.reviewEnabled && (
              <Link href="/projects?status=review_pending">
                <Card className="text-center hover:shadow-md transition-shadow">
                  <CardContent className="py-5">
                    <div className="text-2xl mb-2">🔍</div>
                    <div className="text-sm font-medium text-foreground">审核台</div>
                    <div className="text-xs text-muted-foreground mt-1">待审项目</div>
                  </CardContent>
                </Card>
              </Link>
            )}
            {canExport && featureFlags.exportEnabled && (
              <Link href="/projects?status=exported">
                <Card className="text-center hover:shadow-md transition-shadow">
                  <CardContent className="py-5">
                    <div className="text-2xl mb-2">📥</div>
                    <div className="text-sm font-medium text-foreground">导出中心</div>
                    <div className="text-xs text-muted-foreground mt-1">下载结果包</div>
                  </CardContent>
                </Card>
              </Link>
            )}
            <Link href="/templates">
              <Card className="text-center hover:shadow-md transition-shadow">
                <CardContent className="py-5">
                  <div className="text-2xl mb-2">🧠</div>
                  <div className="text-sm font-medium text-foreground">智能推荐</div>
                  <div className="text-xs text-muted-foreground mt-1">基于历史数据推荐图包结构和策略建议</div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

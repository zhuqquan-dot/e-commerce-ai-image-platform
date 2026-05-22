"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";
import { ToastProvider, useToast } from "@/components/toast";

interface Project {
  id: string;
  projectType: string;
  status: string;
  selectedPlatforms: string[];
  inputMode: string;
  createdAt: string;
  productId: string;
}

interface ListResponse {
  list: Project[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "全部状态" },
  { value: "draft", label: "草稿" },
  { value: "planned", label: "已规划" },
  { value: "generating", label: "生成中" },
  { value: "qc_pending", label: "待QC" },
  { value: "qc_failed", label: "QC未通过" },
  { value: "review_pending", label: "待审核" },
  { value: "review_approved", label: "已通过" },
  { value: "review_rejected", label: "已驳回" },
  { value: "completed", label: "已完成" },
  { value: "exporting", label: "导出中" },
  { value: "exported", label: "已导出" },
];

const STATUS_MAP: Record<string, { label: string; variant: "secondary" | "primary" | "success" | "warning" | "destructive" }> = {
  draft: { label: "草稿", variant: "secondary" },
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

const INPUT_MODE_MAP: Record<string, string> = {
  quick: "快速模式",
  standard: "标准生产",
  high_consistency: "高一致性",
};

const PLATFORM_FILTER_OPTIONS = [
  { value: "", label: "全部平台" },
  { value: "JD", label: "京东" },
  { value: "Tmall", label: "天猫" },
  { value: "Taobao", label: "淘宝" },
  { value: "Pinduoduo", label: "拼多多" },
  { value: "Amazon_US", label: "Amazon US" },
  { value: "Amazon_JP", label: "Amazon JP" },
  { value: "Amazon_UK", label: "Amazon UK" },
  { value: "Amazon_DE", label: "Amazon DE" },
  { value: "Shopee_MY", label: "Shopee MY" },
  { value: "Lazada_SG", label: "Lazada SG" },
];

const TIME_RANGE_OPTIONS = [
  { value: "", label: "全部时间" },
  { value: "today", label: "今天" },
  { value: "7d", label: "近7天" },
  { value: "30d", label: "近30天" },
  { value: "90d", label: "近90天" },
];

function getTimeRangeFilter(range: string): Date | null {
  if (!range) return null;
  const now = new Date();
  switch (range) {
    case "today": {
      const d = new Date(now); d.setHours(0, 0, 0, 0); return d;
    }
    case "7d": { const d = new Date(now); d.setDate(d.getDate() - 7); return d; }
    case "30d": { const d = new Date(now); d.setDate(d.getDate() - 30); return d; }
    case "90d": { const d = new Date(now); d.setDate(d.getDate() - 90); return d; }
    default: return null;
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "刚刚";
  if (diffMin < 60) return `${diffMin} 分钟前`;
  if (diffHour < 24) return `${diffHour} 小时前`;
  if (diffDay < 7) return `${diffDay} 天前`;
  return d.toLocaleDateString("zh-CN");
}

export default function ProjectsPage() {
  return (
    <ToastProvider>
      <ProjectsPageContent />
    </ToastProvider>
  );
}

function ProjectsPageContent() {
  const { toast } = useToast();

  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [statusFilter, setStatusFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [timeRange, setTimeRange] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"card" | "table">("table");

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      params.set("page", String(page));
      params.set("pageSize", "20");

      const res = await fetch(`/api/projects?${params.toString()}`);
      if (!res.ok) throw new Error("加载项目列表失败");
      const data: ListResponse = await res.json();

      let list: Project[] = data.list || [];

      const timeFilter = getTimeRangeFilter(timeRange);
      if (timeFilter) {
        list = list.filter((p) => new Date(p.createdAt) >= timeFilter);
      }

      if (platformFilter) {
        list = list.filter((p) => {
          const platforms: string[] = typeof p.selectedPlatforms === "string"
            ? JSON.parse(p.selectedPlatforms || "[]")
            : (p.selectedPlatforms || []);
          return platforms.includes(platformFilter);
        });
      }

      setProjects(list);
      setTotal(list.length);
      setTotalPages(Math.max(1, Math.ceil(list.length / 20)));
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page, timeRange, platformFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [statusFilter, platformFilter, timeRange]);

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除该项目吗？")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("删除失败");
      toast("项目已删除", "success");
      fetchProjects();
    } catch (e) {
      toast(String(e), "error");
    } finally {
      setDeleting(null);
    }
  };

  const statusCounts = STATUS_FILTER_OPTIONS.filter((s) => s.value).reduce(
    (acc, opt) => {
      acc[opt.value] = projects.filter((p) => p.status === opt.value).length;
      return acc;
    },
    {} as Record<string, number>
  );

  const activeStatusCounts = Object.entries(statusCounts).filter(
    ([, count]) => count > 0
  );

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground/70 mb-1">Mircioo &gt; 项目列表</div>
            <h1 className="text-2xl font-bold text-foreground">项目列表</h1>
          </div>
          <div className="flex gap-2">
            <Link href="/projects?status=review_pending">
              <Button variant="ghost" size="sm">
                🔍 审核台
              </Button>
            </Link>
            <Link href="/projects?status=exported">
              <Button variant="ghost" size="sm">
                📥 导出中心
              </Button>
            </Link>
            <Link href="/projects/new">
              <Button variant="primary" size="sm">
                + 新建项目
              </Button>
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="w-48">
                <Select
                  label="状态筛选"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={STATUS_FILTER_OPTIONS}
                />
              </div>
              <div className="w-40">
                <Select
                  label="目标平台"
                  value={platformFilter}
                  onChange={(e) => setPlatformFilter(e.target.value)}
                  options={PLATFORM_FILTER_OPTIONS}
                />
              </div>
              <div className="w-32">
                <Select
                  label="时间范围"
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  options={TIME_RANGE_OPTIONS}
                />
              </div>
              <div className="flex gap-1 ml-auto">
                <button
                  onClick={() => setViewMode("table")}
                  className={`px-3 py-1.5 text-xs rounded-l-md border transition-colors cursor-pointer ${
                    viewMode === "table"
                      ? "bg-primary/10 text-primary border-primary/20"
                      : "bg-card text-muted-foreground border-border hover:bg-secondary"
                  }`}
                >
                  \u2630 列表
                </button>
                <button
                  onClick={() => setViewMode("card")}
                  className={`px-3 py-1.5 text-xs rounded-r-md border-l-0 border transition-colors cursor-pointer ${
                    viewMode === "card"
                      ? "bg-primary/10 text-primary border-primary/20"
                      : "bg-card text-muted-foreground border-border hover:bg-secondary"
                  }`}
                >
                  \u25A6 卡片
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          viewMode === "card" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 px-5 py-3.5 border-b border-border last:border-b-0"
                  >
                    <Skeleton className="h-4 w-1/5" />
                    <Skeleton className="h-4 w-1/6" />
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 w-1/6" />
                    <Skeleton className="h-4 w-1/6" />
                    <Skeleton className="h-4 w-1/5" />
                  </div>
                ))}
              </CardContent>
            </Card>
          )
        ) : projects.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="text-5xl mb-4">📦</div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {statusFilter
                  ? `暂无${STATUS_MAP[statusFilter]?.label || statusFilter}状态的项目`
                  : "暂无项目"}
              </h3>
              <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
                {statusFilter
                  ? "尝试切换到其他状态筛选，或清除筛选条件查看全部项目"
                  : "点击下方按钮创建第一个项目，开始生成商品图包"}
              </p>
              <div className="flex gap-3 justify-center">
                {statusFilter && (
                  <Button variant="ghost" onClick={() => setStatusFilter("")}>
                    清除筛选
                  </Button>
                )}
                <Link href="/projects/new">
                  <Button variant="primary">+ 新建项目</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : viewMode === "card" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => {
              const statusInfo = STATUS_MAP[p.status] || { label: p.status, variant: "secondary" as const };
              const platforms: string[] = typeof p.selectedPlatforms === "string"
                ? JSON.parse(p.selectedPlatforms || "[]")
                : (p.selectedPlatforms || []);
              const isProcessing = p.status === "generating" || p.status === "exporting";

              return (
                <Link key={p.id} href={`/projects/${p.id}`}>
                  <Card className="p-5 h-full hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-sm font-semibold text-foreground truncate max-w-[200px]">
                          {p.id.slice(0, 12)}...
                        </div>
                        <div className="text-xs text-muted-foreground/70 mt-0.5">
                          {PROJECT_TYPE_MAP[p.projectType] || p.projectType}
                        </div>
                      </div>
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    </div>

                    <div className="space-y-2 text-sm mb-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">输入模式</span>
                        <span className="text-foreground">
                          {INPUT_MODE_MAP[p.inputMode] || p.inputMode}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">目标平台</span>
                        <span className="text-foreground">
                          {platforms.length} 个平台
                        </span>
                      </div>
                    </div>

                    {platforms.length > 0 && (
                      <div className="flex gap-1 flex-wrap mb-3">
                        {platforms.slice(0, 4).map((pl: string) => (
                          <Badge key={pl} variant="outline">{pl}</Badge>
                        ))}
                        {platforms.length > 4 && (
                          <Badge variant="outline">+{platforms.length - 4}</Badge>
                        )}
                      </div>
                    )}

                    {isProcessing && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground/70">生成中...</span>
                          <span className="text-primary">45%</span>
                        </div>
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full animate-shimmer"
                            style={{ width: "45%" }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <span className="text-xs text-muted-foreground/70">
                        {formatDate(p.createdAt)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive text-xs"
                        onClick={(e) => {
                          e.preventDefault();
                          handleDelete(p.id);
                        }}
                        disabled={deleting === p.id}
                        loading={deleting === p.id}
                      >
                        删除
                      </Button>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <>
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-secondary border-b border-border">
                        <th className="text-left px-5 py-3 font-medium text-muted-foreground">项目ID</th>
                        <th className="text-left px-5 py-3 font-medium text-muted-foreground">类型</th>
                        <th className="text-left px-5 py-3 font-medium text-muted-foreground">输入模式</th>
                        <th className="text-left px-5 py-3 font-medium text-muted-foreground">目标平台</th>
                        <th className="text-left px-5 py-3 font-medium text-muted-foreground">状态</th>
                        <th className="text-left px-5 py-3 font-medium text-muted-foreground">进度</th>
                        <th className="text-left px-5 py-3 font-medium text-muted-foreground">创建时间</th>
                        <th className="text-right px-5 py-3 font-medium text-muted-foreground">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projects.map((p) => {
                        const statusInfo = STATUS_MAP[p.status] || { label: p.status, variant: "secondary" as const };
                        const platforms: string[] = typeof p.selectedPlatforms === "string"
                          ? JSON.parse(p.selectedPlatforms || "[]")
                          : (p.selectedPlatforms || []);
                        const isProcessing = p.status === "generating" || p.status === "exporting";
                        const progress = isProcessing ? 45 : p.status === "completed" || p.status === "exported" ? 100 : 0;

                        return (
                          <tr
                            key={p.id}
                            className="border-b border-border hover:bg-secondary cursor-pointer"
                            onClick={() => window.location.href = `/projects/${p.id}`}
                          >
                            <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                              {p.id.slice(0, 10)}...
                            </td>
                            <td className="px-5 py-3 text-muted-foreground">
                              {PROJECT_TYPE_MAP[p.projectType] || p.projectType}
                            </td>
                            <td className="px-5 py-3 text-muted-foreground">
                              {INPUT_MODE_MAP[p.inputMode] || p.inputMode}
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
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-16 bg-secondary rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      progress === 100 ? "bg-emerald-600" : "bg-primary"
                                    } ${isProcessing ? "animate-shimmer" : ""}`}
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground/70">{progress}%</span>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-muted-foreground/70 text-xs">
                              {formatDate(p.createdAt)}
                            </td>
                            <td className="px-5 py-3 text-right">
                              <div className="flex gap-2 justify-end">
                                <Button variant="link" size="sm" asChild>
                                  <Link
                                    href={`/projects/${p.id}`}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    详情
                                  </Link>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(p.id);
                                  }}
                                  disabled={deleting === p.id}
                                  loading={deleting === p.id}
                                >
                                  删除
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between px-2">
              <span className="text-sm text-muted-foreground">共 {total} 条</span>
              <div className="flex gap-2 items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  上一页
                </Button>
                <span className="px-3 py-1 text-sm text-muted-foreground">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  下一页
                </Button>
              </div>
            </div>
          </>
        )}

        {!loading && projects.length > 0 && activeStatusCounts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>📊 状态分布概览</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {activeStatusCounts.map(([status, count]) => {
                  const info = STATUS_MAP[status] || { label: status, variant: "secondary" as const };
                  const totalCount = projects.length;
                  const pct = Math.round((count / totalCount) * 100);
                  return (
                    <button
                      key={status}
                      onClick={() => {
                        setStatusFilter(statusFilter === status ? "" : status);
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all cursor-pointer ${
                        statusFilter === status
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border bg-card text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      <Badge variant={info.variant}>{info.label}</Badge>
                      <span className="font-semibold text-foreground">{count}</span>
                      <span className="text-xs text-muted-foreground/70">({pct}%)</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

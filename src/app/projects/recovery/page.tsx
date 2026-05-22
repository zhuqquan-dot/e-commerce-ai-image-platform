"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ToastProvider, useToast } from "@/components/toast";

const CATEGORY_LABELS: Record<string, string> = {
  compile_failed: "编译失败",
  provider_timeout: "Provider 超时",
  qc_blocked: "QC 拦截",
  generation_failed: "生成失败",
  blocked: "阻断",
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  compile_failed: "商品信息缺失或格式化错误导致编译失败",
  provider_timeout: "生成提供商超时未响应",
  qc_blocked: "质检未通过，已自动拦截",
  generation_failed: "生成过程中发生错误",
  blocked: "依赖的锚点任务失败，被阻断",
};

const STATUS_VARIANT: Record<string, "secondary" | "primary" | "success" | "warning" | "destructive"> = {
  compile_failed: "destructive",
  provider_timeout: "warning",
  qc_blocked: "destructive",
  generation_failed: "destructive",
  blocked: "secondary",
};

const PLATFORM_MAP: Record<string, string> = {
  JD: "京东",
  Tmall: "天猫",
  Taobao: "淘宝",
  Pinduoduo: "拼多多",
  Amazon_US: "Amazon US",
  Amazon_JP: "Amazon JP",
  Amazon_UK: "Amazon UK",
  Amazon_DE: "Amazon DE",
  Shopee_MY: "Shopee MY",
  Lazada_SG: "Lazada SG",
};

const PROJECT_TYPE_MAP: Record<string, string> = {
  single_product_single_platform: "单商品单平台",
  single_product_multi_platform: "单商品多平台",
  multi_product_batch: "多商品批量",
};

interface ProjectSummary {
  projectId: string;
  projectName: string;
  projectType: string;
  status: string;
  selectedPlatforms: string[];
  totalTasks: number;
  failedTasks: number;
  compileFailed: number;
  providerTimeout: number;
  qcBlocked: number;
  generationFailed: number;
  blocked: number;
  recoverableCount: number;
  lastFailureAt: string | null;
  taskIds: string[];
}

interface FailureTask {
  taskId: string;
  slotCode: string;
  slotType: string;
  platform: string;
  status: string;
  reason: string;
  retryable: boolean;
  retryCount: number;
  manualRequired: boolean;
}

interface ProjectFailures {
  projectId: string;
  totalSlots: number;
  failedSlots: number;
  items: FailureTask[];
  categories: Record<string, FailureTask[]>;
}

interface BatchRetryResult {
  total: number;
  succeeded: number;
  failed: number;
  failedDetails: Array<{ taskId: string; reason: string }>;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
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

function truncate(str: string, max: number): string {
  if (!str) return "";
  return str.length > max ? str.slice(0, max) + "…" : str;
}

function shortId(id: string): string {
  return id.length > 8 ? id.slice(-8) : id;
}

export default function RecoveryPage() {
  return (
    <ToastProvider>
      <RecoveryPageContent />
    </ToastProvider>
  );
}

function RecoveryPageContent() {
  const { toast } = useToast();

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [projectFailures, setProjectFailures] = useState<Record<string, ProjectFailures>>({});
  const [loadingFailures, setLoadingFailures] = useState<Set<string>>(new Set());

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedMap, setSelectedMap] = useState<Record<string, Set<string>>>({});
  const [retrying, setRetrying] = useState(false);
  const [retryResult, setRetryResult] = useState<BatchRetryResult | null>(null);

  const [blockedExpanded, setBlockedExpanded] = useState<Set<string>>(new Set());
  const [unblocking, setUnblocking] = useState<Set<string>>(new Set());
  const [markingManual, setMarkingManual] = useState<Set<string>>(new Set());

  const allBlockedTasks = Object.values(projectFailures).flatMap(
    (pf) => pf.categories.blocked || [],
  );

  const selectedTaskIds = (projectId: string, cat: string): string[] => {
    const key = `${projectId}:${cat}`;
    const set = selectedMap[key];
    return set ? Array.from(set) : [];
  };

  const toggleTask = (projectId: string, cat: string, taskId: string) => {
    const key = `${projectId}:${cat}`;
    setSelectedMap((prev) => {
      const current = new Set(prev[key] || []);
      if (current.has(taskId)) {
        current.delete(taskId);
      } else {
        current.add(taskId);
      }
      return { ...prev, [key]: current };
    });
  };

  const toggleAllInCategory = (projectId: string, cat: string, taskIds: string[]) => {
    const key = `${projectId}:${cat}`;
    setSelectedMap((prev) => {
      const current = new Set(prev[key] || []);
      const allSelected = taskIds.every((id) => current.has(id));
      if (allSelected) {
        taskIds.forEach((id) => current.delete(id));
      } else {
        taskIds.forEach((id) => current.add(id));
      }
      return { ...prev, [key]: current };
    });
  };

  const totalSelectedCount = Object.values(selectedMap).reduce(
    (sum, set) => sum + set.size,
    0,
  );

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/projects/recovery-summary");
      if (!res.ok) throw new Error("加载失败");
      const data = await res.json();
      setProjects(data.list || []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const toggleExpand = async (projectId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
        return next;
      }
      next.add(projectId);
      return next;
    });

    if (!projectFailures[projectId]) {
      setLoadingFailures((prev) => new Set(prev).add(projectId));
      try {
        const res = await fetch(`/api/projects/${projectId}/failures`);
        if (res.ok) {
          const data: ProjectFailures = await res.json();
          setProjectFailures((prev) => ({ ...prev, [projectId]: data }));
        }
      } catch {
        // best-effort
      } finally {
        setLoadingFailures((prev) => {
          const next = new Set(prev);
          next.delete(projectId);
          return next;
        });
      }
    }
  };

  const toggleCategory = (projectId: string, cat: string) => {
    const key = `${projectId}:${cat}`;
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleBatchRetry = async () => {
    const taskIds: string[] = [];
    for (const [key, set] of Object.entries(selectedMap)) {
      const [projectId, cat] = key.split(":");
      const pf = projectFailures[projectId];
      if (!pf) continue;
      const catTasks = pf.categories[cat] || [];
      const catIds = new Set(catTasks.map((t) => t.taskId));
      for (const tid of set) {
        if (catIds.has(tid)) taskIds.push(tid);
      }
    }

    if (taskIds.length === 0) return;

    setRetrying(true);
    setRetryResult(null);
    try {
      const res = await fetch("/api/tasks/batch-retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskIds }),
      });
      const data: BatchRetryResult = await res.json();
      setRetryResult(data);
      toast(
        `重试完成: 成功 ${data.succeeded} / 失败 ${data.failed}`,
        data.failed > 0 ? "error" : "success",
      );
      setSelectedMap({});
    } catch (e) {
      toast(String(e), "error");
    } finally {
      setRetrying(false);
    }
  };

  const handleMarkManual = async (taskId: string) => {
    setMarkingManual((prev) => new Set(prev).add(taskId));
    try {
      const res = await fetch(`/api/tasks/${taskId}/mark-manual`, { method: "PATCH" });
      if (res.ok) {
        toast("已标记为人工处理", "success");
        setProjectFailures((prev) => {
          const updated = { ...prev };
          for (const pid of Object.keys(updated)) {
            const pf = { ...updated[pid] };
            const updateItem = (item: FailureTask) =>
              item.taskId === taskId ? { ...item, manualRequired: true } : item;
            pf.items = pf.items.map(updateItem);
            pf.categories = Object.fromEntries(
              Object.entries(pf.categories).map(([k, v]) => [k, v.map(updateItem)]),
            );
            updated[pid] = pf;
          }
          return updated;
        });
      } else {
        toast("操作失败", "error");
      }
    } catch (e) {
      toast(String(e), "error");
    } finally {
      setMarkingManual((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  };

  const handleUnblock = async (taskId: string) => {
    setUnblocking((prev) => new Set(prev).add(taskId));
    try {
      const res = await fetch(`/api/tasks/${taskId}/unblock`, { method: "PATCH" });
      if (res.ok) {
        toast("已解封", "success");
        setProjectFailures((prev) => {
          const updated = { ...prev };
          for (const pid of Object.keys(updated)) {
            const pf = { ...updated[pid] };
            const filtered = (arr: FailureTask[]) =>
              arr.filter((t) => t.taskId !== taskId);
            pf.items = filtered(pf.items);
            pf.failedSlots = pf.items.length;
            pf.categories = Object.fromEntries(
              Object.entries(pf.categories).map(([k, v]) => [k, filtered(v)]),
            );
            updated[pid] = pf;
          }
          return updated;
        });
      } else {
        toast("解封失败", "error");
      }
    } catch (e) {
      toast(String(e), "error");
    } finally {
      setUnblocking((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  };


  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">失败恢复工作台</h1>
        <Button variant="secondary" size="sm" onClick={fetchProjects} disabled={loading}>
          刷新
        </Button>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      )}

      {error && !loading && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p className="mb-2 text-destructive">加载失败: {error}</p>
            <Button variant="secondary" size="sm" onClick={fetchProjects}>
              重试
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && projects.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="text-lg">暂无失败项目</p>
            <p className="mt-1 text-sm">所有项目运行正常</p>
          </CardContent>
        </Card>
      )}

      {/* Blocked items summary bar */}
      {allBlockedTasks.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-destructive">
                阻断项 ({allBlockedTasks.length})
              </CardTitle>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (blockedExpanded.size > 0) setBlockedExpanded(new Set());
                  else {
                    const allIds = new Set(
                      Object.keys(projectFailures).filter((pid) => {
                        const pf = projectFailures[pid];
                        return pf && pf.categories.blocked && pf.categories.blocked.length > 0;
                      }),
                    );
                    setBlockedExpanded(allIds);
                  }
                }}
              >
                {blockedExpanded.size > 0 ? "全部收起" : "全部展开"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {allBlockedTasks.map((task) => (
              <div
                  key={task.taskId}
                  className="flex items-center justify-between rounded-md border bg-card px-3 py-2"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge variant="secondary" className="shrink-0">
                      {shortId(task.taskId)}
                    </Badge>
                    <Badge variant="secondary" className="shrink-0">
                      {PLATFORM_MAP[task.platform] || task.platform || "-"}
                    </Badge>
                    <span className="text-sm text-muted-foreground truncate">
                      {task.slotType || task.slotCode}
                    </span>
                    {task.reason && (
                      <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                        {truncate(task.reason, 40)}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={unblocking.has(task.taskId)}
                    onClick={() => handleUnblock(task.taskId)}
                    className="ml-2 shrink-0"
                  >
                    {unblocking.has(task.taskId) ? "解封中…" : "解封"}
                  </Button>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* Project cards */}
      <div className="space-y-4">
        {projects.map((project) => (
          <Card key={project.projectId}>
            <CardHeader
              className="cursor-pointer pb-2"
              onClick={() => toggleExpand(project.projectId)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <CardTitle className="text-base truncate">
                    {project.projectName || project.projectId}
                  </CardTitle>
                  <Badge variant="secondary">
                    {PROJECT_TYPE_MAP[project.projectType] || project.projectType}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="destructive">失败 {project.failedTasks}</Badge>
                  {project.recoverableCount > 0 && (
                    <Badge variant="warning">可恢复 {project.recoverableCount}</Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                <span>
                  编译失败 {project.compileFailed} / 超时 {project.providerTimeout} / QC拦截 {project.qcBlocked} / 生成失败 {project.generationFailed} / 阻断 {project.blocked}
                </span>
                <span>最近失败: {formatDate(project.lastFailureAt)}</span>
                <Link href={`/projects/${project.projectId}`} className="text-primary hover:underline ml-auto">
                  进入项目 →
                </Link>
              </div>
            </CardHeader>

            {expanded.has(project.projectId) && (
              <CardContent className="border-t pt-4">
                {loadingFailures.has(project.projectId) && (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                )}

                {!loadingFailures.has(project.projectId) &&
                  projectFailures[project.projectId] &&
                  projectFailures[project.projectId].items.length === 0 && (
                    <p className="text-sm text-muted-foreground py-2">该项目暂无失败任务</p>
                  )}

                {!loadingFailures.has(project.projectId) &&
                  projectFailures[project.projectId] && (
                    <div className="space-y-2">
                      {Object.entries(projectFailures[project.projectId].categories).map(
                        ([cat, tasks]) => {
                          if (!tasks || tasks.length === 0) return null;
                          const catKey = `${project.projectId}:${cat}`;
                          const isCatExpanded = expandedCategories.has(catKey);
                          const selected = selectedTaskIds(project.projectId, cat);
                          const allTasksSelected = tasks.length > 0 && tasks.every((t) => selected.includes(t.taskId));

                          return (
                            <div key={cat} className="rounded-md border">
                              <button
                                type="button"
                                className="flex w-full items-center justify-between px-4 py-2 hover:bg-muted/50 text-left"
                                onClick={() => toggleCategory(project.projectId, cat)}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">
                                    {isCatExpanded ? "▼" : "▶"}
                                  </span>
                                  <Badge variant={STATUS_VARIANT[cat] || "secondary"}>
                                    {CATEGORY_LABELS[cat] || cat}
                                  </Badge>
                                  <span className="text-sm text-muted-foreground">
                                    {tasks.length} 个
                                  </span>
                                  <span className="text-xs text-muted-foreground hidden sm:inline">
                                    {CATEGORY_DESCRIPTIONS[cat] || ""}
                                  </span>
                                </div>
                                {tasks.filter((t) => t.retryable).length > 0 && (
                                  <Badge variant="secondary" className="text-xs">
                                    {tasks.filter((t) => t.retryable).length} 可重试
                                  </Badge>
                                )}
                              </button>

                              {isCatExpanded && (
                                <div className="border-t p-2 space-y-1">
                                  {/* Select all checkbox */}
                                  {tasks.filter((t) => t.retryable).length > 0 && (
                                    <label className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                                      <input
                                        type="checkbox"
                                        checked={allTasksSelected}
                                        onChange={() =>
                                          toggleAllInCategory(
                                            project.projectId,
                                            cat,
                                            tasks.filter((t) => t.retryable).map((t) => t.taskId),
                                          )
                                        }
                                        className="rounded"
                                      />
                                      全选
                                    </label>
                                  )}

                                  {tasks.map((task) => (
                                    <div
                                      key={task.taskId}
                                      className="flex items-center justify-between gap-2 rounded px-2 py-1.5 hover:bg-muted/30"
                                    >
                                      {task.retryable ? (
                                        <label className="flex items-center gap-2 min-w-0 cursor-pointer flex-1">
                                          <input
                                            type="checkbox"
                                            checked={selected.includes(task.taskId)}
                                            onChange={() =>
                                              toggleTask(project.projectId, cat, task.taskId)
                                            }
                                            className="rounded shrink-0"
                                          />
                                          <Badge variant="secondary" className="shrink-0 text-xs">
                                            {shortId(task.taskId)}
                                          </Badge>
                                        </label>
                                      ) : (
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                          <span className="w-3.5 shrink-0" />
                                          <Badge variant="secondary" className="shrink-0 text-xs">
                                            {shortId(task.taskId)}
                                          </Badge>
                                        </div>
                                      )}

                                      <Badge variant="secondary" className="shrink-0 text-xs">
                                        {PLATFORM_MAP[task.platform] || task.platform || "-"}
                                      </Badge>

                                      <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">
                                        {task.slotType || task.slotCode}
                                      </span>

                                      <Badge
                                        variant={STATUS_VARIANT[task.status] || "secondary"}
                                        className="shrink-0 text-xs"
                                      >
                                        {CATEGORY_LABELS[task.status] || task.status}
                                      </Badge>

                                      {task.reason && (
                                        <span className="text-xs text-muted-foreground truncate max-w-[120px] hidden md:inline">
                                          {truncate(task.reason, 30)}
                                        </span>
                                      )}

                                      <div className="flex items-center gap-1 shrink-0">
                                        {task.manualRequired && (
                                          <Badge variant="warning" className="text-xs">
                                            已标记人工
                                          </Badge>
                                        )}
                                        {!task.manualRequired && (
                                          <Button
                                            variant="secondary"
                                            size="sm"
                                            className="text-xs h-7 px-2"
                                            disabled={markingManual.has(task.taskId)}
                                            onClick={() => handleMarkManual(task.taskId)}
                                          >
                                            {markingManual.has(task.taskId) ? "…" : "标记人工"}
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        },
                      )}
                    </div>
                  )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Batch retry bar */}
      {totalSelectedCount > 0 && (
        <div className="sticky bottom-4 flex items-center gap-4 rounded-lg border bg-card p-4 shadow-lg">
          <span className="text-sm font-medium">
            已选中 <span className="text-primary">{totalSelectedCount}</span> 个任务
          </span>
          <Button onClick={handleBatchRetry} disabled={retrying}>
            {retrying ? "重试中…" : `重试选中的 ${totalSelectedCount} 个任务`}
          </Button>
        </div>
      )}

      {/* Retry result dialog */}
      {retryResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">重试结果</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-3">
              <Badge variant="success">成功 {retryResult.succeeded}</Badge>
              <Badge variant="destructive">失败 {retryResult.failed}</Badge>
            </div>
            {retryResult.failedDetails.length > 0 && (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {retryResult.failedDetails.map((d) => (
                  <div key={d.taskId} className="text-xs text-muted-foreground">
                    <span className="text-destructive">{shortId(d.taskId)}</span>: {d.reason}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

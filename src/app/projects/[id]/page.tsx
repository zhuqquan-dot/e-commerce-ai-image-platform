"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ToastProvider, useToast } from "@/components/toast";
import { Select } from "@/components/ui/select";

const STATUS_OPTIONS = [
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

interface ProjectDetail {
  id: string;
  productId: string;
  projectName: string;
  projectType: string;
  status: string;
  selectedPlatforms: string[];
  inputMode: string;
  parentProjectId?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface FailureSummary {
  projectId: string;
  totalSlots: number;
  failedSlots: number;
  blockedSlots: number;
  compilingFailed: number;
  timeoutSlots: number;
  qcBlockedSlots: number;
  failures: Array<{ taskId: string; slotId: string; slotType: string; status: string; reason: string; retryable: boolean }>;
  recoverableCount: number;
  suggestedActions: string[];
}

interface ChildProject {
  id: string;
  productId: string;
  projectName: string;
  projectType: string;
  status: string;
  selectedPlatforms: string[];
  inputMode: string;
}

interface BatchCreationResult {
  parentProject: {
    id: string;
    projectName: string;
    status: string;
  };
  summary: {
    total: number;
    created: number;
    blocked: number;
  };
  children: Array<{
    projectId: string;
    productId: string;
    productName: string;
    status: string;
  }>;
  blocked: Array<{
    productId: string;
    productName: string;
    reason: string;
  }>;
}

interface BatchOrchestrateResult {
  parentProjectId: string;
  summary: {
    totalTasks: number;
    anchorTasks: number;
    created: number;
    failed: number;
    blocked: number;
  };
  subProjects: Array<{
    projectId: string;
    status: 'created' | 'partial_failed' | 'anchor_failed';
    taskCount: number;
    anchorDone: number;
  }>;
}

interface BatchPlanResult {
  parentProjectId: string;
  summary: {
    total: number;
    succeeded: number;
    failed: number;
    totalSlots: number;
    anchorSlots: number;
  };
  warnings: Array<{ type: string; count: number }>;
  subProjects: Array<{
    projectId: string;
    status: 'succeeded' | 'failed';
    reason?: string;
    slotCount?: number;
    platforms?: string[];
  }>;
}

const BATCH_RESULT_KEY = "mircioo_batch_result";

export default function ProjectDetailPage() {
  return (
    <ToastProvider>
      <ProjectDetailPageContent />
    </ToastProvider>
  );
}

function ProjectDetailPageContent() {
  const params = useParams();
  const { toast } = useToast();
  const id = params.id as string;

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [failureSummary, setFailureSummary] = useState<FailureSummary | null>(null);
  const [children, setChildren] = useState<ChildProject[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchCreationResult | null>(null);
  const [expandedChildren, setExpandedChildren] = useState<Set<string>>(new Set());
  const [batchPlanResult, setBatchPlanResult] = useState<BatchPlanResult | null>(null);
  const [batchPlanning, setBatchPlanning] = useState(false);
  const [batchGenerateResult, setBatchGenerateResult] = useState<BatchOrchestrateResult | null>(null);
  const [batchGenerating, setBatchGenerating] = useState(false);

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) throw new Error("加载项目失败");
      const data = await res.json();
      setProject(data);

      const failuresRes = await fetch(`/api/projects/${id}/failures`);
      if (failuresRes.ok) {
        const failuresData = await failuresRes.json();
        setFailureSummary(failuresData);
      }

      if (data.projectType === "multi_product_batch" && !data.parentProjectId) {
        fetchChildren(data.id);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchChildren = useCallback(async (parentId: string) => {
    setLoadingChildren(true);
    try {
      const res = await fetch(`/api/projects?parentProjectId=${parentId}&pageSize=100`);
      if (res.ok) {
        const data = await res.json();
        setChildren(data.list || []);
      }
    } catch {
      // children fetch is best-effort
    } finally {
      setLoadingChildren(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (id) {
      fetchProject();
      try {
        const stored = sessionStorage.getItem(BATCH_RESULT_KEY);
        if (stored) {
          const parsed: BatchCreationResult = JSON.parse(stored);
          if (parsed.parentProject.id === id) {
            setBatchResult(parsed);
            sessionStorage.removeItem(BATCH_RESULT_KEY);
          }
        }
      } catch {
        // ignore
      }
    }
  }, [id, fetchProject]);

  const handleStatusChange = async (newStatus: string) => {
    setStatusUpdating(true);
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("更新状态失败");
      const updated = await res.json();
      setProject(updated);
      toast("状态已更新", "success");
    } catch (e) {
      toast(String(e), "error");
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleBatchPlan = async () => {
    setBatchPlanning(true);
    try {
      const res = await fetch(`/api/projects/${id}/plan-batch`, { method: "POST" });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "批量规划失败");
      }
      const result: BatchPlanResult = await res.json();
      setBatchPlanResult(result);
      toast(`批量规划完成: ${result.summary.succeeded} 成功 / ${result.summary.failed} 失败`, "success");
      fetchChildren(id);
    } catch (e) {
      toast(String(e), "error");
    } finally {
      setBatchPlanning(false);
    }
  };

  const handleBatchGenerate = async () => {
    setBatchGenerating(true);
    try {
      const res = await fetch(`/api/projects/${id}/generate-batch`, { method: "POST" });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "批量生成失败");
      }
      const result: BatchOrchestrateResult = await res.json();
      setBatchGenerateResult(result);
      const { summary } = result;
      toast(
        `批量生成完成: ${summary.created} 已创建 / ${summary.blocked} 被阻断 / ${summary.failed} 失败`,
        summary.failed > 0 ? "error" : "success",
      );
      fetchChildren(id);
    } catch (e) {
      toast(String(e), "error");
    } finally {
      setBatchGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="py-8 space-y-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="text-4xl mb-4">🔍</div>
        <h2 className="text-lg font-semibold text-foreground mb-2">项目不存在</h2>
        <p className="text-muted-foreground text-sm mb-4">{error || "该项目可能已被删除"}</p>
        <Link href="/projects">
          <Button variant="primary">返回项目列表</Button>
        </Link>
      </div>
    );
  }

  const statusInfo = STATUS_MAP[project.status] || { label: project.status, variant: "secondary" as const };
  const platforms: string[] = Array.isArray(project.selectedPlatforms)
    ? project.selectedPlatforms
    : [];

  const QUICK_ACTIONS = [
    { label: "配置商品", href: `/projects/${id}/plan`, icon: "\u{1F4E6}" },
    { label: "生成图包", href: `/projects/${id}/generate`, icon: "\u26A1" },
    { label: "QC审核", href: `/projects/${id}/qc`, icon: "\u{1F50D}" },
    { label: "人工审核", href: `/projects/${id}/review`, icon: "\u{1F4CB}" },
    { label: "导出下载", href: `/projects/${id}/export`, icon: "\u{1F4E5}" },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-muted-foreground/70 mb-1">
            <Link href="/projects" className="hover:text-muted-foreground">项目列表</Link> &gt; 项目详情
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {project.projectName || "项目详情"}
          </h1>
        </div>
        <div className="flex gap-2">
          {project.projectType === 'multi_product_batch' && !project.parentProjectId && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleBatchPlan}
              disabled={batchPlanning}
            >
              {batchPlanning ? '\u23F3 规划中...' : '🚀 批量规划'}
            </Button>
          )}
          {project.projectType === 'multi_product_batch' && !project.parentProjectId && children.length > 0 && children.every((c) => c.status === 'planned') && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleBatchGenerate}
              disabled={batchGenerating}
            >
              {batchGenerating ? '\u23F3 生成中...' : '\u26A1 批量生成'}
            </Button>
          )}
          <Link href={`/projects/${id}/plan`}>
            <Button variant="primary" size="sm">📦 配置商品</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">项目 ID</span>
              <p className="text-foreground font-mono text-xs mt-1">{project.id}</p>
            </div>
            <div>
              <span className="text-muted-foreground">状态</span>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                <Select
                  label="状态"
                  value={project.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  options={STATUS_OPTIONS}
                  disabled={statusUpdating}
                />
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">任务类型</span>
              <p className="text-foreground mt-1">{PROJECT_TYPE_MAP[project.projectType] || project.projectType}</p>
            </div>
            <div>
              <span className="text-muted-foreground">输入模式</span>
              <p className="text-foreground mt-1">{INPUT_MODE_MAP[project.inputMode] || project.inputMode}</p>
            </div>
            <div>
              <span className="text-muted-foreground">关联商品</span>
              <p className="text-foreground mt-1 font-mono text-xs">{project.productId}</p>
            </div>
            <div>
              <span className="text-muted-foreground">目标平台</span>
              <div className="flex gap-1 flex-wrap mt-1">
                {platforms.length > 0 ? (
                  platforms.map((pl: string) => (
                    <Badge key={pl} variant="outline">{pl}</Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground/70 text-sm">\u2014</span>
                )}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">创建时间</span>
              <p className="text-foreground mt-1">{new Date(project.createdAt).toLocaleString("zh-CN")}</p>
            </div>
            <div>
              <span className="text-muted-foreground">更新时间</span>
              <p className="text-foreground mt-1">{new Date(project.updatedAt).toLocaleString("zh-CN")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {batchResult && (
        <Card>
          <CardHeader>
            <CardTitle>📊 批量创建结果</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Badge variant="success">{batchResult.summary.created} 成功</Badge>
              </div>
              {batchResult.summary.blocked > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">{batchResult.summary.blocked} 失败</Badge>
                </div>
              )}
            </div>
            {batchResult.summary.blocked > 0 && batchResult.blocked.length > 0 && (
              <div className="border-t border-border pt-3">
                <div className="text-xs text-muted-foreground font-medium mb-2">失败明细</div>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {batchResult.blocked.map((b) => (
                    <div key={b.productId} className="text-xs text-muted-foreground/70 flex items-center gap-2">
                      <span className="font-mono truncate max-w-[120px]">
                        {b.productName || b.productId.slice(0, 8)}
                      </span>
                      <Badge variant="destructive" className="text-[10px]">失败</Badge>
                      <span className="truncate">{b.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {batchResult.summary.blocked > 0 && (
              <div className="border-t border-border pt-3 mt-3">
                <div className="text-xs text-muted-foreground font-medium mb-1">建议操作</div>
                <ul className="text-xs text-muted-foreground/70 space-y-0.5">
                  <li>\u2022 检查失败商品的数据完整性（必填字段、参考图等）</li>
                  <li>\u2022 修正后可使用「新建项目」为失败商品单独创建</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {batchPlanResult && (
        <Card>
          <CardHeader>
            <CardTitle>📋 批量规划结果</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">{batchPlanResult.summary.total}</div>
                <div className="text-xs text-muted-foreground">子项目总数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{batchPlanResult.summary.succeeded}</div>
                <div className="text-xs text-muted-foreground">规划成功</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-500">{batchPlanResult.summary.failed}</div>
                <div className="text-xs text-muted-foreground">规划失败</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">{batchPlanResult.summary.totalSlots}</div>
                <div className="text-xs text-muted-foreground">总槽位数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">{batchPlanResult.summary.anchorSlots}</div>
                <div className="text-xs text-muted-foreground">锚点槽位</div>
              </div>
            </div>

            {batchPlanResult.subProjects.length > 0 && (
              <div className="border-t border-border pt-3">
                <div className="text-xs text-muted-foreground font-medium mb-2">子项目明细</div>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {batchPlanResult.subProjects.map((sp) => (
                    <div key={sp.projectId} className="text-xs text-muted-foreground/70 flex items-center gap-2">
                      <span className="font-mono truncate max-w-[100px]">{sp.projectId.slice(0, 8)}...</span>
                      <Badge variant={sp.status === 'succeeded' ? 'success' : 'destructive'} className="text-[10px]">
                        {sp.status === 'succeeded' ? '成功' : '失败'}
                      </Badge>
                      {sp.slotCount !== undefined && (
                        <span className="text-muted-foreground/50">{sp.slotCount} slots</span>
                      )}
                      {sp.reason && (
                        <span className="text-red-400 truncate">{sp.reason}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {batchPlanResult.warnings.length > 0 && (
              <div className="border-t border-border pt-3 mt-3">
                <div className="text-xs text-muted-foreground font-medium mb-1">警告汇总 (Top 5)</div>
                <div className="space-y-0.5">
                  {batchPlanResult.warnings.slice(0, 5).map((w, i) => (
                    <div key={i} className="text-xs text-muted-foreground/70 flex items-center gap-1">
                      <Badge variant="warning" className="text-[10px]">{w.count}</Badge>
                      <span className="truncate">{w.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {batchGenerateResult && (
        <Card>
          <CardHeader>
            <CardTitle>\u26A1 批量生成结果</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">{batchGenerateResult.summary.totalTasks}</div>
                <div className="text-xs text-muted-foreground">总任务数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">{batchGenerateResult.summary.anchorTasks}</div>
                <div className="text-xs text-muted-foreground">锚点任务</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{batchGenerateResult.summary.created}</div>
                <div className="text-xs text-muted-foreground">已创建</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-500">{batchGenerateResult.summary.failed}</div>
                <div className="text-xs text-muted-foreground">失败</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500">{batchGenerateResult.summary.blocked}</div>
                <div className="text-xs text-muted-foreground">被阻断</div>
              </div>
            </div>

            {batchGenerateResult.subProjects.length > 0 && (
              <div className="border-t border-border pt-3">
                <div className="text-xs text-muted-foreground font-medium mb-2">子项目明细</div>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {batchGenerateResult.subProjects.map((sp) => (
                    <div key={sp.projectId} className="text-xs text-muted-foreground/70 flex items-center gap-2">
                      <span className="font-mono truncate max-w-[100px]">{sp.projectId.slice(0, 8)}...</span>
                      <Badge
                        variant={sp.status === 'created' ? 'success' : sp.status === 'anchor_failed' ? 'destructive' : 'warning'}
                        className="text-[10px]"
                      >
                        {sp.status === 'created' ? '已创建' : sp.status === 'anchor_failed' ? '锚点失败' : '部分失败'}
                      </Badge>
                      <span className="text-muted-foreground/50">{sp.taskCount} 任务</span>
                      {sp.anchorDone > 0 && (
                        <span className="text-green-500">{sp.anchorDone} 锚点</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {project.projectType === "multi_product_batch" && !project.parentProjectId && (
        <Card>
          <CardHeader>
            <CardTitle>📦 子项目列表 {children.length > 0 && `(${children.length})`}</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingChildren ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : children.length === 0 ? (
              <div className="py-8 text-center">
                <div className="text-3xl mb-2">📭</div>
                <p className="text-muted-foreground text-sm">暂无子项目</p>
                <p className="text-muted-foreground/70 text-xs mt-1">
                  子项目在批量创建时自动生成。请通过「新建项目 → 多商品批量」创建。
                </p>
              </div>
            ) : (
              <div className="border border-border rounded-lg divide-y divide-border max-h-96 overflow-y-auto">
                {children.map((child) => {
                  const childStatus = STATUS_MAP[child.status] || { label: child.status, variant: "secondary" as const };
                  const childPlatforms: string[] = typeof child.selectedPlatforms === "string"
                    ? (() => { try { return JSON.parse(child.selectedPlatforms); } catch { return []; } })()
                    : (Array.isArray(child.selectedPlatforms) ? child.selectedPlatforms : []);
                  const isExpanded = expandedChildren.has(child.id);
                  return (
                    <div key={child.id}>
                      <div
                        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-secondary transition-colors"
                        onClick={() => {
                          setExpandedChildren((prev) => {
                            const next = new Set(prev);
                            if (next.has(child.id)) {
                              next.delete(child.id);
                            } else {
                              next.add(child.id);
                            }
                            return next;
                          });
                        }}
                      >
                        <span className="text-xs text-muted-foreground/70">
                          {isExpanded ? "\u25BC" : "\u25B6"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-foreground truncate">
                            {child.projectName || child.productId}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <Badge variant={childStatus.variant} className="text-[10px]">
                              {childStatus.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground/70 font-mono">
                              {child.id.slice(0, 10)}...
                            </span>
                          </div>
                        </div>
                        <Link
                          href={`/projects/${child.id}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button variant="ghost" size="sm">查看</Button>
                        </Link>
                      </div>
                      {isExpanded && (
                        <div className="px-10 py-3 bg-secondary border-t border-border">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground/70">输入模式:</span>{" "}
                              <span className="text-foreground">{INPUT_MODE_MAP[child.inputMode] || child.inputMode}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground/70">类型:</span>{" "}
                              <span className="text-foreground">{PROJECT_TYPE_MAP[child.projectType] || child.projectType}</span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-muted-foreground/70">平台:</span>{" "}
                              <span className="text-foreground">
                                {childPlatforms.length > 0 ? childPlatforms.join(", ") : "\u2014"}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>\u26A1 快捷操作</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {QUICK_ACTIONS.map((action) => (
              <Link key={action.href} href={action.href}>
                <Card className="text-center hover:shadow-md transition-shadow">
                  <CardContent className="py-4">
                    <div className="text-xl mb-1">{action.icon}</div>
                    <div className="text-sm font-medium text-foreground">{action.label}</div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {failureSummary && failureSummary.failedSlots > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>\u26A0\uFE0F 失败汇总</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <Badge variant="destructive">{failureSummary.failedSlots} 失败</Badge>
                <span className="text-sm text-muted-foreground/70">/ {failureSummary.totalSlots} 总槽位</span>
                {failureSummary.recoverableCount > 0 && (
                  <Badge variant="warning">{failureSummary.recoverableCount} 可恢复</Badge>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                {failureSummary.compilingFailed > 0 && (
                  <div className="text-muted-foreground">❌ 编译失败: <span className="text-foreground font-medium">{failureSummary.compilingFailed}</span></div>
                )}
                {failureSummary.blockedSlots > 0 && (
                  <div className="text-muted-foreground">{'\u{1F6AB}'} 已阻断: <span className="text-foreground font-medium">{failureSummary.blockedSlots}</span></div>
                )}
                {failureSummary.qcBlockedSlots > 0 && (
                  <div className="text-muted-foreground">{'\u{1F6D1}'} QC拦截: <span className="text-foreground font-medium">{failureSummary.qcBlockedSlots}</span></div>
                )}
                {failureSummary.timeoutSlots > 0 && (
                  <div className="text-muted-foreground">\u23F1\uFE0F 超时: <span className="text-foreground font-medium">{failureSummary.timeoutSlots}</span></div>
                )}
              </div>

              {failureSummary.failures.length > 0 && (
                <div className="border-t border-border pt-2">
                  <div className="text-xs text-muted-foreground font-medium mb-1">失败明细</div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {failureSummary.failures.slice(0, 5).map((f) => (
                      <div key={f.taskId} className="text-xs text-muted-foreground/70 flex items-center gap-1">
                        <span className="font-mono">{f.taskId.slice(0, 8)}</span>
                        <Badge variant="outline" className="text-[10px]">{f.slotType}</Badge>
                        <Badge variant={f.status === 'blocked' ? 'warning' : 'destructive'} className="text-[10px]">{f.status}</Badge>
                        <span className="truncate">{f.reason}</span>
                      </div>
                    ))}
                    {failureSummary.failures.length > 5 && (
                      <div className="text-xs text-muted-foreground/70">...还有 {failureSummary.failures.length - 5} 条</div>
                    )}
                  </div>
                </div>
              )}

              {failureSummary.suggestedActions.length > 0 && (
                <div className="border-t border-border pt-2">
                  <div className="text-xs text-muted-foreground font-medium mb-1">建议操作</div>
                  <ul className="text-xs text-muted-foreground/70 space-y-0.5">
                    {failureSummary.suggestedActions.map((action, i) => (
                      <li key={i}>\u2022 {action}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Link href={`/projects/${id}/generate`}>
                  <Button variant="primary" size="sm">🔄 重新生成</Button>
                </Link>
                {failureSummary.recoverableCount > 0 && (
                  <Button variant="outline" size="sm" disabled>\u267B\uFE0F 重试可恢复</Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

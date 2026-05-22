"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface TaskQueueItem {
  taskId: string;
  slotType: string;
  platform: string;
  isAnchor: boolean;
  sequenceOrder: number;
  status: string;
  creditCost: number;
  retryCount: number;
  exportNameSuggestion: string;
  bundleSlotId: string;
}

const PLATFORM_LABELS: Record<string, string> = {
  TAOBAO_TMALL: "\u6DD8\u5B9D/\u5929\u732B",
  JD: "\u4EAC\u4E1C",
  PINDUODUO: "\u62FC\u591A\u591A",
  DOUYIN: "\u6296\u97F3",
  AMAZON: "Amazon",
  EBAY: "eBay",
  ETSY: "Etsy",
  SHOPIFY: "Shopify",
  TIKTOK_SHOP: "TikTok Shop",
  ALIEXPRESS: "AliExpress",
};

const SLOT_LABELS: Record<string, string> = {
  main_white: "\u9996\u56FE\u767D\u5E95",
  main_text: "\u9996\u56FE\u5E26\u6587\u6848",
  feature: "\u529F\u80FD\u5356\u70B9",
  scene: "\u573A\u666F\u56FE",
  spec: "\u89C4\u683C\u56FE",
  compare: "\u5BF9\u6BD4\u56FE",
  trust: "\u4FE1\u4EFB\u80CC\u4E66\u56FE",
};

const STATUS_CONFIG: Record<string, { label: string; variant: "success" | "warning" | "destructive" | "primary" | "secondary" }> = {
  pending: { label: "等待中", variant: "secondary" },
  compiled: { label: "已编译", variant: "secondary" },
  compile_failed: { label: "编译失败", variant: "destructive" },
  queued: { label: "已排队", variant: "primary" },
  running: { label: "生成中", variant: "warning" },
  generated: { label: "已生成", variant: "success" },
  blocked: { label: "已阻断", variant: "secondary" },
  qc_failed: { label: "QC失败", variant: "destructive" },
  qc_blocked: { label: "QC拦截", variant: "destructive" },
  review_pending: { label: "待审核", variant: "warning" },
  approved: { label: "已通过", variant: "success" },
  rejected: { label: "已拒绝", variant: "destructive" },
  exported: { label: "已导出", variant: "success" },
};

export default function GeneratePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [tasks, setTasks] = useState<TaskQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [retryingTaskId, setRetryingTaskId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [progressMsg, setProgressMsg] = useState("");

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/generate`);
      if (!res.ok) {
        const data = await res.json();
        if (data.message && data.message.includes("\u6682\u65E0")) {
          setTasks([]);
          setLoading(false);
          return;
        }
        throw new Error(data.message || data.error || "\u52A0\u8F7D\u5931\u8D25");
      }
      const data = await res.json();
      setTasks(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTasks();
  }, [fetchTasks]);

  async function handleStartGenerate() {
    setGenerating(true);
    setError("");
    setProgressMsg("\u6B63\u5728\u521B\u5EFA\u751F\u6210\u4EFB\u52A1...");
    try {
      const res = await fetch(`/api/projects/${projectId}/generate`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || data.error || "\u751F\u6210\u5931\u8D25");
      }
      const data = await res.json();
      setTasks(data.results.map((r: { taskId: string; success: boolean; status: string; error?: string }) => {
        const existing = tasks.find((t) => t.taskId === r.taskId);
        return {
          taskId: r.taskId,
          status: r.status,
          slotType: existing?.slotType ?? "",
          platform: existing?.platform ?? "",
          isAnchor: existing?.isAnchor ?? false,
          sequenceOrder: existing?.sequenceOrder ?? 0,
          creditCost: existing?.creditCost ?? 1,
          retryCount: existing?.retryCount ?? 0,
          exportNameSuggestion: existing?.exportNameSuggestion ?? "",
          bundleSlotId: existing?.bundleSlotId ?? "",
        };
      }));
      setProgressMsg(
        data.allCompleted
          ? "\u5168\u90E8\u751F\u6210\u5B8C\u6210\uFF01"
          : "\u90E8\u5206\u4EFB\u52A1\u5B8C\u6210\uFF0C\u53EF\u91CD\u8BD5\u5931\u8D25\u4EFB\u52A1",
      );
    } catch (e) {
      setError(String(e));
    } finally {
      setGenerating(false);
      await fetchTasks();
    }
  }

  async function handleRetry(taskId: string) {
    setRetryingTaskId(taskId);
    setError("");
    try {
      const res = await fetch(`/api/tasks/${taskId}/retry`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || data.error || "\u91CD\u8BD5\u5931\u8D25");
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setRetryingTaskId(null);
      await fetchTasks();
    }
  }

  const completedCount = tasks.filter(
    (t) => t.status === "generated" || t.status === "approved",
  ).length;
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const allCompleted = totalCount > 0 && completedCount === totalCount;
  const totalCredits = tasks.reduce((sum, t) => sum + t.creditCost, 0);

  const groupedTasks = tasks.reduce<Record<string, TaskQueueItem[]>>((acc, task) => {
    const platform = task.platform || "\u672A\u77E5\u5E73\u53F0";
    if (!acc[platform]) acc[platform] = [];
    acc[platform].push(task);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="text-muted-foreground mt-4">\u52A0\u8F7D\u4E2D...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/" className="hover:text-primary transition-colors">
          \u9996\u9875
        </Link>
        <span>/</span>
        <Link
          href={`/projects/${projectId}/plan`}
          className="hover:text-primary transition-colors"
        >
          \u56FE\u5305\u89C4\u5212
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">\u6279\u91CF\u751F\u6210</span>
      </nav>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">\u6279\u91CF\u751F\u6210\u6267\u884C</h1>
          <p className="text-sm text-muted-foreground mt-1">
            \u9879\u76EE ID: {projectId}
            {totalCount > 0 && (
              <span className="ml-3">
                \u4EFB\u52A1\u6570: {totalCount} | \u5DF2\u5B8C\u6210: {completedCount} | \u79EF\u5206\u6D88\u8017: {totalCredits}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {allCompleted && (
            <Button
              variant="accent"
              onClick={() => router.push(`/projects/${projectId}/review`)}
            >
              \u8FDB\u5165\u5BA1\u6838 \u2192
            </Button>
          )}
          <Button
            onClick={handleStartGenerate}
            loading={generating}
            disabled={generating}
          >
            {generating ? "\u751F\u6210\u4E2D..." : "\u542F\u52A8\u751F\u6210"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg mb-6 text-sm">
          {error}
        </div>
      )}

      {progressMsg && (
        <div className="bg-primary/10 border border-primary/20 text-primary px-4 py-3 rounded-lg mb-6 text-sm">
          {progressMsg}
        </div>
      )}

      {totalCount > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              \u751F\u6210\u8FDB\u5EA6
            </span>
            <span className="text-sm text-foreground font-mono">
              {completedCount}/{totalCount} ({progressPercent}%)
            </span>
          </div>
          <div className="w-full h-2 bg-background rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {totalCount === 0 && !error ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <div className="text-5xl mb-4">\uD83C\uDFA8</div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            \u51C6\u5907\u5F00\u59CB\u751F\u6210
          </h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            \u70B9\u51FB\u201C\u542F\u52A8\u751F\u6210\u201D\u6309\u94AE\uFF0C\u7CFB\u7EDF\u5C06\u81EA\u52A8\u4ECE\u56FE\u5305\u89C4\u5212\u521B\u5EFA\u751F\u6210\u4EFB\u52A1\uFF0C\u6309\u951A\u70B9\u4F18\u5148\u987A\u5E8F\u6267\u884C\uFF0C\u5E76\u81EA\u52A8\u8C03\u7528 AI \u751F\u6210\u670D\u52A1\u3002
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedTasks).map(([platform, platformTasks]) => (
            <div
              key={platform}
              className="bg-card border border-border rounded-xl overflow-hidden"
            >
              <div className="px-6 py-4 bg-secondary border-b border-border">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-foreground">
                    {PLATFORM_LABELS[platform] || platform}
                  </h2>
                  <span className="text-xs bg-secondary text-muted-foreground/70 px-2 py-0.5 rounded-full font-mono">
                    {platform}
                  </span>
                  <span className="text-xs bg-secondary text-muted-foreground/70 px-2 py-0.5 rounded-full">
                    {platformTasks.length} \u4E2A\u4EFB\u52A1
                  </span>
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
                        \u56FE\u4F4D
                      </th>
                      <th className="text-center px-4 py-3 font-medium text-muted-foreground w-16">
                        \u951A\u70B9
                      </th>
                      <th className="text-center px-4 py-3 font-medium text-muted-foreground w-24">
                        \u72B6\u6001
                      </th>
                      <th className="text-center px-4 py-3 font-medium text-muted-foreground w-16">
                        \u79EF\u5206
                      </th>
                      <th className="text-center px-4 py-3 font-medium text-muted-foreground w-16">
                        \u91CD\u8BD5
                      </th>
                      <th className="text-center px-4 py-3 font-medium text-muted-foreground w-20">
                        \u64CD\u4F5C
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {platformTasks.map((task) => {
                      const isAnchor = task.isAnchor || task.slotType === "main_white";
                      const hasAnchorInPlatform = platformTasks.some((t) => t.isAnchor || t.slotType === "main_white");
                      const statusConf = STATUS_CONFIG[task.status] || {
                        label: task.status,
                        variant: "secondary" as const,
                      };
                      const isFailed = task.status === "qc_failed";

                      return (
                        <tr
                          key={task.taskId}
                          className={
                            isAnchor
                              ? "bg-primary/5 border-b border-primary/10"
                              : "border-b border-border hover:bg-secondary/50"
                          }
                        >
                          <td className="px-4 py-3 text-muted-foreground/70 font-mono text-xs">
                            {isAnchor ? (
                              <span className="text-primary font-bold text-sm" title="锚点任务">◉</span>
                            ) : hasAnchorInPlatform ? (
                              <span className="text-muted-foreground/40 text-sm pl-3">↳ {task.sequenceOrder.toString().padStart(2, "0")}</span>
                            ) : (
                              task.sequenceOrder.toString().padStart(2, "0")
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">
                                {SLOT_LABELS[task.slotType] || task.slotType}
                              </span>
                            </div>
                            {task.exportNameSuggestion && (
                              <code className="text-xs text-muted-foreground/70 mt-0.5 block truncate max-w-[300px]">
                                {task.exportNameSuggestion}
                              </code>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {isAnchor ? (
                              <span
                                className="text-primary text-lg"
                                title="\u9996\u56FE\u951A\u70B9"
                              >
                                \u2B50
                              </span>
                            ) : (
                              <span className="text-muted-foreground/70">\u2014</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant={statusConf.variant}>
                              {task.status === "running" ? (
                                <span className="flex items-center gap-1">
                                  <Spinner size="sm" />
                                  {statusConf.label}
                                </span>
                              ) : (
                                statusConf.label
                              )}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm text-muted-foreground/70 font-mono">
                              {task.creditCost}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm text-muted-foreground/70 font-mono">
                              {task.retryCount}/{2}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {isFailed && (
                              <Button
                                variant="ghost"
                                size="sm"
                                loading={retryingTaskId === task.taskId}
                                onClick={() => handleRetry(task.taskId)}
                              >
                                \u91CD\u8BD5
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

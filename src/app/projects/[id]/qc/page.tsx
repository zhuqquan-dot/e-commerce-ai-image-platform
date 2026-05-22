"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Card } from "@/components/ui/card";

interface TaskItem {
  taskId: string;
  slotType: string;
  platform: string;
  isAnchor: boolean;
  sequenceOrder: number;
  status: string;
  creditCost: number;
  exportNameSuggestion: string;
  bundleSlotId: string;
}

interface QCItem {
  id: string;
  taskId: string;
  consistencyScore: number;
  styleScore: number;
  complianceScore: number;
  overallGrade: string;
  reasons: string[];
  riskTags: string[];
  suggestedAction: string;
  createdAt: string;
}

interface TaskWithQC {
  task: TaskItem;
  qc: QCItem | null;
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

const GRADE_CONFIG: Record<string, { label: string; variant: "success" | "primary" | "warning" | "destructive" | "secondary" }> = {
  S: { label: "S", variant: "success" },
  A: { label: "A", variant: "primary" },
  B: { label: "B", variant: "warning" },
  C: { label: "C", variant: "destructive" },
  "N/A": { label: "N/A", variant: "secondary" },
};

const ANCHOR_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
  </svg>
);

export default function QCPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [tasksWithQC, setTasksWithQC] = useState<TaskWithQC[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningQC, setRunningQC] = useState(false);
  const [error, setError] = useState("");
  const [qcTaskId, setQcTaskId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const tasksRes = await fetch(`/api/projects/${projectId}/generate`);
      let tasks: TaskItem[] = [];
      if (tasksRes.ok) {
        tasks = await tasksRes.json();
      } else {
        const data = await tasksRes.json();
        if (!data.message?.includes("\u6682\u65E0")) {
          throw new Error(data.message || data.error || "\u52A0\u8F7D\u5931\u8D25");
        }
      }

      const qcResults = await Promise.all(
        tasks.map(async (task) => {
          try {
            const qcRes = await fetch(`/api/tasks/${task.taskId}/qc`);
            if (qcRes.ok) {
              const results = await qcRes.json();
              return {
                task,
                qc: results.length > 0 ? results[0] : null,
              } as TaskWithQC;
            }
            return { task, qc: null } as TaskWithQC;
          } catch {
            return { task, qc: null } as TaskWithQC;
          }
        }),
      );

      setTasksWithQC(qcResults);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  async function handleRunQC(taskId: string) {
    setQcTaskId(taskId);
    setError("");
    try {
      const res = await fetch(`/api/tasks/${taskId}/qc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: "" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || data.error || "\u8D28\u68C0\u5931\u8D25");
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setQcTaskId(null);
      await fetchData();
    }
  }

  async function handleBatchQC() {
    setRunningQC(true);
    setError("");
    const tasksToQC = tasksWithQC.filter((t) => !t.qc);

    let completed = 0;
    for (const item of tasksToQC) {
      try {
        const res = await fetch(`/api/tasks/${item.task.taskId}/qc`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assetId: "" }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || data.error || "\u8D28\u68C0\u5931\u8D25");
        }
        completed++;
      } catch {
        continue;
      }
    }

    setRunningQC(false);
    await fetchData();
    if (completed > 0) {
      setError("");
    }
  }

  const groupedTasks = tasksWithQC.reduce<Record<string, TaskWithQC[]>>(
    (acc, item) => {
      const platform = item.task.platform || "\u672A\u77E5\u5E73\u53F0";
      if (!acc[platform]) acc[platform] = [];
      acc[platform].push(item);
      return acc;
    },
    {},
  );

  const gradedTasks = tasksWithQC.filter((t) => t.qc);
  const allSA =
    gradedTasks.length > 0 &&
    gradedTasks.every((t) => t.qc!.overallGrade === "S" || t.qc!.overallGrade === "A");
  const totalTasks = tasksWithQC.length;
  const qcCount = gradedTasks.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" className="mx-auto mb-4" />
          <p className="text-muted-foreground">\u52A0\u8F7D\u4E2D...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground/70 mb-6">
          <Link href="/" className="hover:text-primary transition-colors">
            \u9996\u9875
          </Link>
          <span>/</span>
          <Link
            href={`/projects/${projectId}/generate`}
            className="hover:text-primary transition-colors"
          >
            \u6279\u91CF\u751F\u6210
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">\u8D28\u68C0\u7ED3\u679C</span>
        </nav>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">\u8D28\u68C0\u7ED3\u679C</h1>
            <p className="text-sm text-muted-foreground mt-1">
              \u9879\u76EE ID: {projectId}
              {totalTasks > 0 && (
                <span className="ml-3">
                  \u4EFB\u52A1\u6570: {totalTasks} | \u5DF2\u8D28\u68C0: {qcCount}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {allSA && (
              <Button
                variant="accent"
                onClick={() => router.push(`/projects/${projectId}/review`)}
              >
                \u8FDB\u5165\u5BA1\u6838 \u2192
              </Button>
            )}
            {qcCount < totalTasks && (
              <Button
                variant="primary"
                loading={runningQC}
                onClick={handleBatchQC}
              >
                {runningQC ? "\u8D28\u68C0\u4E2D..." : "\u4E00\u952E\u5168\u91CF\u8D28\u68C0"}
              </Button>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        {totalTasks === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <div className="text-5xl mb-4">\uD83D\uDD0D</div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              \u6682\u65E0\u751F\u6210\u4EFB\u52A1
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              \u8BF7\u5148\u5728\u6279\u91CF\u751F\u6210\u9875\u9762\u5B8C\u6210\u56FE\u7247\u751F\u6210\uFF0C\u7136\u540E\u56DE\u5230\u672C\u9875\u6267\u884C\u8D28\u68C0\u3002
            </p>
            <Button onClick={() => router.push(`/projects/${projectId}/generate`)}>
              \u524D\u5F80\u6279\u91CF\u751F\u6210
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedTasks).map(([platform, items]) => (
              <Card key={platform}>
                <div className="px-6 py-4 bg-secondary border-b border-border">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold text-foreground">
                      {PLATFORM_LABELS[platform] || platform}
                    </h2>
                    <Badge variant="primary" className="font-mono">
                      {platform}
                    </Badge>
                    <Badge variant="outline">
                      {items.length} \u4E2A\u56FE\u4F4D
                    </Badge>
                    <Badge variant="secondary">
                      \u5DF2\u8D28\u68C0 {items.filter((i) => i.qc).length}/{items.length}
                    </Badge>
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
                          \u7B49\u7EA7
                        </th>
                        <th className="text-center px-4 py-3 font-medium text-muted-foreground">
                          \u5408\u89C4\u5206
                        </th>
                        <th className="text-center px-4 py-3 font-medium text-muted-foreground">
                          \u4E00\u81F4\u6027\u5206
                        </th>
                        <th className="text-center px-4 py-3 font-medium text-muted-foreground">
                          \u98CE\u683C\u5206
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          \u98CE\u9669\u6807\u7B7E
                        </th>
                        <th className="text-center px-4 py-3 font-medium text-muted-foreground w-28">
                          \u64CD\u4F5C
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => {
                        const isAnchor =
                          item.task.isAnchor ||
                          item.task.slotType === "main_white";
                        const qc = item.qc;
                        const gradeConf = qc
                          ? GRADE_CONFIG[qc.overallGrade] || GRADE_CONFIG["N/A"]
                          : GRADE_CONFIG["N/A"];

                        return (
                          <tr
                            key={item.task.taskId}
                            className={
                              isAnchor
                                ? "bg-primary/5 border-b border-primary/10"
                                : "border-b border-border hover:bg-secondary/50"
                            }
                          >
                            <td className="px-4 py-3 text-muted-foreground/70 font-mono text-xs">
                              {item.task.sequenceOrder
                                .toString()
                                .padStart(2, "0")}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-foreground">
                                  {SLOT_LABELS[item.task.slotType] ||
                                    item.task.slotType}
                                </span>
                              </div>
                              {item.task.exportNameSuggestion && (
                                <code className="text-xs text-muted-foreground/70 mt-0.5 block truncate max-w-[240px]">
                                  {item.task.exportNameSuggestion}
                                </code>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {isAnchor ? (
                                <span
                                  className="text-primary text-lg inline-flex items-center justify-center"
                                  title="\u9996\u56FE\u951A\u70B9"
                                >
                                  {ANCHOR_ICON}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/70">&mdash;</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {qc ? (
                                <Badge variant={gradeConf.variant}>
                                  {gradeConf.label}
                                </Badge>
                              ) : (
                                <Badge variant="secondary">N/A</Badge>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {qc ? (
                                <span
                                  className={`font-mono text-sm font-semibold ${
                                    qc.complianceScore >= 80
                                      ? "text-emerald-600"
                                      : qc.complianceScore >= 50
                                        ? "text-amber-600"
                                        : "text-destructive"
                                  }`}
                                >
                                  {qc.complianceScore}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/70">&mdash;</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {qc ? (
                                <span className="font-mono text-sm font-semibold text-muted-foreground/70">
                                  {qc.consistencyScore}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/70">&mdash;</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {qc ? (
                                <span className="font-mono text-sm font-semibold text-muted-foreground/70">
                                  {qc.styleScore}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/70">&mdash;</span>
                              )}
                            </td>
                            <td className="px-4 py-3 max-w-[200px]">
                              {qc ? (
                                <div className="flex flex-wrap gap-1">
                                  {qc.riskTags.length > 0 ? (
                                    qc.riskTags.map((tag, ti) => (
                                      <span
                                        key={ti}
                                        className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                          tag.includes("\u9AD8\u98CE\u9669") || tag.includes("\u5DF2\u62E6\u622A")
                                            ? "bg-destructive/10 text-destructive"
                                            : tag.includes("\u9700\u91CD\u751F\u6210")
                                              ? "bg-amber-50 text-amber-600"
                                              : "bg-secondary text-muted-foreground/70"
                                        }`}
                                      >
                                        {tag}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-xs text-muted-foreground/70">
                                      \u65E0
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground/70">
                                  \u5F85\u8D28\u68C0
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {qc && qc.overallGrade === "B" ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    router.push(
                                      `/projects/${projectId}/generate`,
                                    )
                                  }
                                >
                                  \u91CD\u751F\u6210
                                </Button>
                              ) : qc && qc.overallGrade === "C" ? (
                                <span className="text-destructive text-xs font-semibold inline-flex items-center gap-1">
                                  <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="shrink-0"
                                  >
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                                  </svg>
                                  \u5DF2\u62E6\u622A
                                </span>
                              ) : !qc ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  loading={qcTaskId === item.task.taskId}
                                  onClick={() =>
                                    handleRunQC(item.task.taskId)
                                  }
                                >
                                  \u6267\u884C\u8D28\u68C0
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground/70">
                                  &mdash;
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { ToastProvider, useToast } from "@/components/toast";

interface AttemptItem {
  id: string;
  createdAt: string;
  providerConfigId: string | null;
  status: string;
  promptText: string | null;
  promptVersion: string | null;
  errorMessage: string | null;
  thumbnailUrl: string | null;
}

interface ReuseResult {
  promptVersion: string | null;
  promptText: string | null;
  promptSections: unknown;
  generationParams: unknown;
  sourceAttemptId: string;
  reused: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "success" | "destructive" | "warning" | "secondary" }> = {
  completed: { label: "成功", variant: "success" },
  failed: { label: "失败", variant: "destructive" },
  timeout: { label: "超时", variant: "warning" },
  running: { label: "生成中", variant: "warning" },
  pending: { label: "等待中", variant: "secondary" },
};

function TaskHistoryPage() {
  const params = useParams();
  const taskId = params.taskId as string;
  const projectId = params.id as string;
  const { toast } = useToast();

  const [attempts, setAttempts] = useState<AttemptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reuseLoading, setReuseLoading] = useState<string | null>(null);
  const [reuseResults, setReuseResults] = useState<Record<string, ReuseResult>>({});

  const fetchAttempts = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/attempts`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "加载失败");
      }
      const data = await res.json();
      setAttempts(data.attempts || []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (taskId) fetchAttempts();
  }, [fetchAttempts, taskId]);

  const handleReuse = async (attemptId: string) => {
    setReuseLoading(attemptId);
    try {
      const res = await fetch("/api/compile-prompt/reuse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "复用失败");
      }
      const data = await res.json();
      setReuseResults((prev) => ({ ...prev, [attemptId]: data }));
      toast("Prompt 配置已获取", "success");
    } catch (e) {
      toast(String(e), "error");
    } finally {
      setReuseLoading(null);
    }
  };

  const handleUseConfig = (result: ReuseResult) => {
    const searchParams = new URLSearchParams();
    if (result.promptText) searchParams.set("promptText", result.promptText);
    if (result.promptVersion) searchParams.set("promptVersion", result.promptVersion);
    window.location.href = `/projects/${projectId}/generate?reuse=${result.sourceAttemptId}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <Spinner size="lg" className="mb-4" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <Link href="/projects" className="hover:text-primary transition-colors">
          项目列表
        </Link>
        <span>/</span>
        <Link href={`/projects/${projectId}`} className="hover:text-primary transition-colors">
          项目详情
        </Link>
        <span>/</span>
        <Link href={`/projects/${projectId}/generate`} className="hover:text-primary transition-colors">
          批量生成
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">版本历史</span>
      </nav>

      <h1 className="text-2xl font-bold text-foreground">图位版本历史</h1>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {attempts.length === 0 && !error ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-4xl mb-3">🕐</div>
            <p className="text-foreground font-medium">暂无生成记录</p>
            <p className="text-sm text-muted-foreground mt-1">该图位尚未发起过生成尝试</p>
            <div className="mt-4">
              <Link href={`/projects/${projectId}/generate`}>
                <Button variant="primary" size="sm">返回生成页</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Attempt 记录</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

              <div className="space-y-6">
                {attempts.map((attempt, idx) => {
                  const statusConf = STATUS_CONFIG[attempt.status] || {
                    label: attempt.status,
                    variant: "secondary" as const,
                  };
                  const isExpanded = expandedId === attempt.id;
                  const reuseResult = reuseResults[attempt.id];

                  return (
                    <div key={attempt.id} className="relative pl-12">
                      <div
                        className={`absolute left-3.5 w-3 h-3 rounded-full border-2 border-border bg-card z-10 ${
                          attempt.status === "completed"
                            ? "bg-emerald-500 border-emerald-500"
                            : attempt.status === "failed"
                              ? "bg-red-500 border-red-500"
                              : attempt.status === "timeout"
                                ? "bg-amber-500 border-amber-500"
                                : "bg-secondary"
                        }`}
                      />

                      <div className="bg-card border border-border rounded-lg p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <span className="text-sm text-muted-foreground">
                                #{attempts.length - idx}
                              </span>
                              <Badge variant={statusConf.variant} size="sm">
                                {statusConf.label}
                              </Badge>
                              {attempt.promptVersion && (
                                <Badge variant="outline" size="sm">
                                  v{attempt.promptVersion}
                                </Badge>
                              )}
                              {attempt.providerConfigId && (
                                <Badge variant="secondary" size="sm">
                                  {attempt.providerConfigId.slice(0, 8)}...
                                </Badge>
                              )}
                            </div>

                            <p className="text-xs text-muted-foreground/70">
                              {new Date(attempt.createdAt).toLocaleString("zh-CN")}
                            </p>

                            {attempt.status === "completed" && attempt.thumbnailUrl && (
                              <div className="mt-3">
                                <img
                                  src={attempt.thumbnailUrl}
                                  alt="生成结果缩略图"
                                  className="w-32 h-32 object-cover rounded-lg border border-border"
                                />
                              </div>
                            )}

                            {attempt.status === "failed" && attempt.errorMessage && (
                              <div className="mt-2 p-2 bg-destructive/5 border border-destructive/10 rounded text-sm text-destructive/80 break-words">
                                {attempt.errorMessage}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {attempt.promptText && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setExpandedId(isExpanded ? null : attempt.id)
                                }
                              >
                                {isExpanded ? "收起 Prompt" : "查看 Prompt"}
                              </Button>
                            )}
                          </div>
                        </div>

                        {isExpanded && attempt.promptText && (
                          <div className="mt-3 p-3 bg-secondary/50 rounded-lg border border-border">
                            <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-words font-mono max-h-64 overflow-y-auto">
                              {attempt.promptText}
                            </pre>
                          </div>
                        )}

                        {attempt.status === "completed" && (
                          <div className="mt-3 flex items-center gap-2">
                            {reuseResult ? (
                              <div className="flex-1 p-3 bg-primary/5 border border-primary/10 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="success" size="sm">已获取</Badge>
                                  <span className="text-xs text-muted-foreground">
                                    Prompt v{reuseResult.promptVersion}
                                  </span>
                                </div>
                                <Button
                                  variant="accent"
                                  size="sm"
                                  onClick={() => handleUseConfig(reuseResult)}
                                >
                                  使用此配置重生成
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                loading={reuseLoading === attempt.id}
                                onClick={() => handleReuse(attempt.id)}
                              >
                                复用此 Prompt 版本
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-start">
        <Link href={`/projects/${projectId}/generate`}>
          <Button variant="ghost">← 返回生成页</Button>
        </Link>
      </div>
    </div>
  );
}

export default function TaskHistoryPageWrapper() {
  return (
    <ToastProvider>
      <TaskHistoryPage />
    </ToastProvider>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface ReviewRecord {
  id: string;
  taskId: string;
  action: string;
  comment: string;
  reviewerId: string | null;
  createdAt: string;
}

interface TaskItem {
  taskId: string;
  productId: string;
  productName: string;
  sku: string;
  platform: string;
  slotType: string;
  status: string;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  latestReview: ReviewRecord | null;
  qcGrade: string;
  qcReasons: string[];
  qcRiskTags: string[];
  suggestedAction: string;
  attempts: Array<{ attemptId: string; status: string; thumbnailUrl: string | null }>;
}

interface ReviewSummary {
  total: number;
  approved: number;
  rejected: number;
  pending: number;
}

interface ProjectData {
  projectId: string;
  summary: ReviewSummary;
  tasks: TaskItem[];
}

interface AttemptData {
  taskId: string;
  currentImageUrl: string | null;
  attempts: Array<{
    id: string;
    taskId: string;
    attemptNumber: number;
    prompt: string | null;
    providerId: string | null;
    status: string;
    imageUrl: string | null;
    errorMessage: string | null;
    startedAt: string | null;
    completedAt: string | null;
    createdAt: string;
    assets: Array<{
      id: string;
      attemptId: string;
      imageUrl: string;
      thumbnailUrl: string | null;
      format: string | null;
      fileSize: number | null;
      createdAt: string;
    }>;
    qcResult: {
      id: string;
      attemptId: string;
      grade: string;
      score: number;
      issues: string | null;
      createdAt: string;
    } | null;
  }>;
}

const PLATFORM_LABELS: Record<string, string> = {
  TAOBAO_TMALL: "淘宝/天猫",
  JD: "京东",
  PINDUODUO: "拼多多",
  DOUYIN: "抖音",
  AMAZON: "Amazon",
  EBAY: "eBay",
  ETSY: "Etsy",
  SHOPIFY: "Shopify",
  TIKTOK_SHOP: "TikTok Shop",
  ALIEXPRESS: "AliExpress",
};

const SLOT_LABELS: Record<string, string> = {
  main_white: "首图白底",
  main_text: "首图",
  feature: "功能卖点",
  scene: "场景图",
  spec: "规格图",
  compare: "对比图",
  trust: "信任背书图",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "待处理",
  compiled: "已编译",
  queued: "排队中",
  running: "生成中",
  generated: "已生成",
  qc_failed: "质检未通过",
  review_pending: "待审核",
  approved: "已通过",
  rejected: "已驳回",
  exported: "已导出",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  compiled: "bg-blue-50 text-blue-700",
  queued: "bg-yellow-50 text-yellow-700",
  running: "bg-purple-50 text-purple-700",
  generated: "bg-cyan-50 text-cyan-700",
  qc_failed: "bg-red-50 text-red-700",
  review_pending: "bg-orange-50 text-orange-700",
  approved: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-700",
  exported: "bg-emerald-50 text-emerald-700",
};

const REVIEW_ACTION_LABELS: Record<string, string> = {
  approved: "通过",
  rejected: "驳回",
  risk_mark: "风险标记",
};

const REVIEW_ACTION_COLORS: Record<string, string> = {
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  risk_mark: "bg-yellow-100 text-yellow-700",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] || "bg-gray-100 text-gray-700"}`}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function ReviewActionBadge({ action }: { action: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${REVIEW_ACTION_COLORS[action] || "bg-gray-100 text-gray-700"}`}
    >
      {REVIEW_ACTION_LABELS[action] || action}
    </span>
  );
}

export default function ReviewPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [attemptData, setAttemptData] = useState<AttemptData | null>(null);
  const [selectedVersionUrl, setSelectedVersionUrl] = useState<string | null>(null);

  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const [filterPlatform, setFilterPlatform] = useState("");
  const [filterSlotType, setFilterSlotType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [compareMode, setCompareMode] = useState(false);
  const [leftAttemptId, setLeftAttemptId] = useState("");
  const [rightAttemptId, setRightAttemptId] = useState("");
  const [filterQcGrades, setFilterQcGrades] = useState<Set<string>>(new Set());
  const [batchApproveOpen, setBatchApproveOpen] = useState(false);
  const [batchApproving, setBatchApproving] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");
  const [filterMyReviews, setFilterMyReviews] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user?.id) setCurrentUserId(data.user.id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/projects/${projectId}/reviews`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || data.message || "加载失败");
        }
        const data: ProjectData = await res.json();
        if (!cancelled) setProjectData(data);
      } catch (e) {
        if (!cancelled) setError(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [projectId, retryKey]);

  const fetchReviews = useCallback(async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/review`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
      }
    } catch {
      setReviews([]);
    }
  }, []);

  const fetchAttempts = useCallback(async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/attempts`);
      if (res.ok) {
        const data: AttemptData = await res.json();
        setAttemptData(data);
      }
    } catch {
      setAttemptData(null);
    }
  }, []);

  const handleSelectTask = useCallback(
    (task: TaskItem) => {
      setSelectedTask(task);
      setSelectedVersionUrl(null);
      setCompareMode(false);
      setReviewComment("");
      setRejectReason("");
      setReviewError("");
      setReviews([]);
      setAttemptData(null);
      fetchReviews(task.taskId);
      fetchAttempts(task.taskId);
    },
    [fetchReviews, fetchAttempts],
  );

  const handleReviewAction = useCallback(
    async (action: "approved" | "rejected" | "risk_mark") => {
      if (!selectedTask) return;

      const comment = action === "rejected" ? rejectReason : reviewComment;

      if (action === "rejected" && !comment.trim()) {
        setReviewError("驳回操作必须填写原因");
        return;
      }

      setReviewLoading(true);
      setReviewError("");

      try {
        const res = await fetch(`/api/tasks/${selectedTask.taskId}/review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, comment: comment || undefined }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || data.message || "操作失败");
        }

        const data = await res.json();
        setSelectedTask((prev) =>
          prev ? { ...prev, status: data.task.status } : prev,
        );
        setReviewComment("");
        setRejectReason("");
        fetchReviews(selectedTask.taskId);

        if (projectData) {
          const updatedTasks = projectData.tasks.map((t) =>
            t.taskId === selectedTask.taskId ? { ...t, status: data.task.status } : t,
          );
          const summary: ReviewSummary = {
            total: updatedTasks.length,
            approved: updatedTasks.filter((t) => t.status === "approved").length,
            rejected: updatedTasks.filter((t) => t.status === "rejected").length,
            pending: updatedTasks.filter(
              (t) => !["approved", "rejected"].includes(t.status),
            ).length,
          };
          setProjectData({ ...projectData, tasks: updatedTasks, summary });
        }
      } catch (e) {
        setReviewError(String(e));
      } finally {
        setReviewLoading(false);
      }
    },
    [selectedTask, rejectReason, reviewComment, fetchReviews, projectData],
  );

  function qcGradeOrder(g: string): number {
    if (g === "C") return 0;
    if (g === "B") return 1;
    if (g === "A") return 2;
    if (g === "S") return 3;
    return 4;
  }

  const filteredTasks = (() => {
    let tasks =
      projectData?.tasks.filter((task) => {
        if (filterPlatform && task.platform !== filterPlatform) return false;
        if (filterSlotType && task.slotType !== filterSlotType) return false;
        if (filterStatus) {
          if (filterStatus === "unreviewed") {
            if (["approved", "rejected"].includes(task.status)) return false;
          } else if (filterStatus === "reviewed") {
            if (!["approved", "rejected"].includes(task.status)) return false;
          } else {
            if (task.status !== filterStatus) return false;
          }
        }
        if (filterSearch) {
          const q = filterSearch.toLowerCase();
          const matchName = task.productName.toLowerCase().includes(q);
          const matchSku = task.sku.toLowerCase().includes(q);
          const matchPlatform = PLATFORM_LABELS[task.platform]?.toLowerCase().includes(q);
          const matchSlot = SLOT_LABELS[task.slotType]?.toLowerCase().includes(q);
          if (!matchName && !matchSku && !matchPlatform && !matchSlot) return false;
        }
        if (filterQcGrades.size > 0) {
          const grade = task.qcGrade || "N/A";
          if (!filterQcGrades.has(grade)) return false;
        }
        if (filterMyReviews && currentUserId) {
          if (["approved", "rejected"].includes(task.status)) return false;
          const reviewedByMe = task.latestReview?.reviewerId === currentUserId;
          if (reviewedByMe) return false;
        }
        return true;
      }) ?? [];

    tasks = [...tasks].sort((a, b) => {
      const aRiskC = a.qcGrade === "C" && a.qcRiskTags.length > 0 ? 1 : 0;
      const bRiskC = b.qcGrade === "C" && b.qcRiskTags.length > 0 ? 1 : 0;
      if (aRiskC !== bRiskC) return bRiskC - aRiskC;
      return qcGradeOrder(a.qcGrade) - qcGradeOrder(b.qcGrade);
    });

    return tasks;
  })();

  const uniquePlatforms = [
    ...new Set((projectData?.tasks ?? []).map((t) => t.platform)),
  ];
  const uniqueSlotTypes = [
    ...new Set((projectData?.tasks ?? []).map((t) => t.slotType)),
  ];

  const previewUrl =
    selectedVersionUrl ||
    selectedTask?.imageUrl ||
    (attemptData?.currentImageUrl ?? null);

  const qcGrade =
    attemptData?.attempts[0]?.qcResult?.grade ?? null;
  const qcScore =
    attemptData?.attempts[0]?.qcResult?.score ?? null;
  const qcIssues: string[] = (() => {
    try {
      const raw = attemptData?.attempts[0]?.qcResult?.issues;
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  })();

  const allVersionAssets = (attemptData?.attempts ?? []).flatMap((attempt) =>
    (attempt.assets ?? []).map((asset) => ({
      ...asset,
      attemptNumber: attempt.attemptNumber,
      attemptStatus: attempt.status,
      qcGrade: attempt.qcResult?.grade ?? null,
      qcScore: attempt.qcResult?.score ?? null,
    })),
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin inline-block w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full mb-4" />
          <p className="text-gray-500">加载审核数据...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">!</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">加载失败</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => setRetryKey((k) => k + 1)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  if (!projectData || projectData.tasks.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
            <Link href="/" className="hover:text-blue-600 transition-colors">
              首页
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">审核台</span>
          </nav>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-5xl mb-4">{"\uD83C\uDF1F"}</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              暂无待审核任务
            </h2>
            <p className="text-gray-500">
              该项目下没有生成任务，请先创建生成任务。
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { summary } = projectData;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
          >
            首页
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-lg font-bold text-gray-900">审核台</h1>
          <span className="text-xs text-gray-400 ml-2">
            项目: {projectId.slice(0, 8)}...
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
            <span className="text-gray-500">总计:</span>
            <span className="font-semibold text-gray-900">{summary.total}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg">
            <span className="text-green-600">已通过:</span>
            <span className="font-semibold text-green-700">{summary.approved}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-lg">
            <span className="text-red-600">已驳回:</span>
            <span className="font-semibold text-red-700">{summary.rejected}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 rounded-lg">
            <span className="text-orange-600">待审核:</span>
            <span className="font-semibold text-orange-700">{summary.pending}</span>
          </div>
          <button
            onClick={() => setBatchApproveOpen(true)}
            className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
          >
            一键通过
          </button>
        </div>
      </header>

      <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-gray-200 shrink-0">
        <input
          type="text"
          placeholder="搜索商品名/SKU..."
          value={filterSearch}
          onChange={(e) => setFilterSearch(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filterPlatform}
          onChange={(e) => setFilterPlatform(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">全部平台</option>
          {uniquePlatforms.map((p) => (
            <option key={p} value={p}>
              {PLATFORM_LABELS[p] || p}
            </option>
          ))}
        </select>
        <select
          value={filterSlotType}
          onChange={(e) => setFilterSlotType(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">全部图位</option>
          {uniqueSlotTypes.map((s) => (
            <option key={s} value={s}>
              {SLOT_LABELS[s] || s}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">全部状态</option>
          <option value="unreviewed">未审核</option>
          <option value="reviewed">已审核</option>
          <option value="approved">已通过</option>
          <option value="rejected">已驳回</option>
          <option value="review_pending">待审核</option>
          <option value="generated">已生成</option>
          <option value="qc_failed">质检未通过</option>
        </select>
        <div className="flex items-center gap-1 text-xs">
          <span className="text-gray-400 mr-0.5">QC:</span>
          {["S", "A", "B", "C", "N/A"].map((g) => (
            <label key={g} className="flex items-center gap-0.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filterQcGrades.has(g)}
                onChange={(e) => {
                  const next = new Set(filterQcGrades);
                  e.target.checked ? next.add(g) : next.delete(g);
                  setFilterQcGrades(next);
                }}
                className="w-3 h-3 accent-blue-600"
              />
              <span className="text-gray-500">{g}</span>
            </label>
          ))}
        </div>
        <span className="text-xs text-gray-400 ml-auto flex items-center gap-2">
          {currentUserId && (
            <label className="flex items-center gap-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filterMyReviews}
                onChange={(e) => setFilterMyReviews(e.target.checked)}
                className="w-3 h-3 accent-blue-600"
              />
              <span>我的待审核</span>
            </label>
          )}
          <span>显示 {filteredTasks.length} / {projectData.tasks.length} 个任务</span>
        </span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-72 bg-white border-r border-gray-200 flex flex-col shrink-0 overflow-hidden">
          <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-200">
            任务列表
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredTasks.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-400">
                无匹配任务
              </div>
            ) : (
              filteredTasks.map((task) => (
                <button
                  key={task.taskId}
                  onClick={() => handleSelectTask(task)}
                  className={`w-full text-left px-3 py-2.5 border-b border-gray-100 transition-colors hover:bg-gray-50 ${
                    selectedTask?.taskId === task.taskId
                      ? "bg-blue-50 border-l-2 border-l-blue-500"
                      : "border-l-2 border-l-transparent"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="w-12 h-12 bg-gray-100 rounded flex-shrink-0 overflow-hidden border border-gray-200">
                      {task.thumbnailUrl || task.imageUrl ? (
                        <img
                          src={task.thumbnailUrl || task.imageUrl!}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                          无图
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-900 truncate">
                        {task.productName || "未命名商品"}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {PLATFORM_LABELS[task.platform] || task.platform}
                        {" / "}
                        {SLOT_LABELS[task.slotType] || task.slotType}
                      </div>
                      <div className="mt-1">
                        <StatusBadge status={task.status} />
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center bg-gray-100 p-4 overflow-hidden">
          {!selectedTask ? (
            <div className="text-center text-gray-400">
              <div className="text-5xl mb-3">{"\uD83D\uDC41"}</div>
              <p className="text-sm">请从左侧列表选择一个任务进行审核</p>
            </div>
          ) : compareMode && attemptData ? (
            <div className="w-full h-full flex flex-col">
              <div className="flex items-center justify-between mb-2 shrink-0">
                <span className="text-sm font-medium text-gray-700">版本对比</span>
                <button
                  onClick={() => setCompareMode(false)}
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  关闭对比
                </button>
              </div>
              <div className="flex-1 flex gap-3 min-h-0">
                {[
                  { side: "left", attemptId: leftAttemptId, setId: setLeftAttemptId },
                  { side: "right", attemptId: rightAttemptId, setId: setRightAttemptId },
                ].map(({ side, attemptId, setId }) => {
                  const attempt = attemptData.attempts.find((a) => a.id === attemptId);
                  const imgUrl = attempt?.assets?.[0]?.imageUrl ?? attempt?.imageUrl ?? null;
                  const qc = attempt?.qcResult ?? null;
                  return (
                    <div key={side} className="flex-1 flex flex-col min-w-0">
                      <select
                        value={attemptId}
                        onChange={(e) => setId(e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs bg-white mb-1.5 shrink-0"
                      >
                        {attemptData.attempts.map((a) => (
                          <option key={a.id} value={a.id}>
                            V{a.attemptNumber} [{a.status}]
                            {a.qcResult ? ` ${a.qcResult.grade}` : ""}
                          </option>
                        ))}
                      </select>
                      <div className="flex-1 bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center min-h-0">
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={`V${attempt?.attemptNumber ?? "?"} 预览`}
                            className="max-w-full max-h-full object-contain"
                          />
                        ) : (
                          <span className="text-xs text-gray-400">无图像</span>
                        )}
                      </div>
                      {qc && (
                        <div className="mt-1.5 p-1.5 bg-gray-50 border border-gray-200 rounded text-xs shrink-0">
                          <div className="flex justify-between">
                            <span className="text-gray-500">QC 等级</span>
                            <span className={`font-semibold ${
                              qc.grade === "S" ? "text-emerald-600" :
                              qc.grade === "A" ? "text-green-600" :
                              qc.grade === "B" ? "text-yellow-600" :
                              "text-red-600"
                            }`}>{qc.grade}</span>
                          </div>
                          <div className="flex justify-between mt-0.5">
                            <span className="text-gray-500">分数</span>
                            <span className="text-gray-700">{qc.score}</span>
                          </div>
                          {qc.issues && (
                            <div className="mt-0.5 text-red-600">
                              {(() => {
                                try { return (JSON.parse(qc.issues) as string[]).slice(0, 2).join("; "); }
                                catch { return ""; }
                              })()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="预览"
                  className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                />
              ) : (
                <div className="text-center text-gray-400">
                  <div className="text-4xl mb-2">{"\uD83D\uDDBC"}</div>
                  <p className="text-sm">暂无生成图像</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="w-80 bg-white border-l border-gray-200 flex flex-col shrink-0 overflow-hidden">
          {!selectedTask ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm p-4 text-center">
              选择任务后可进行操作
            </div>
          ) : (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 shrink-0">
                <h3 className="text-sm font-semibold text-gray-900 truncate">
                  {selectedTask.productName || "未命名商品"}
                </h3>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                  <span>{PLATFORM_LABELS[selectedTask.platform] || selectedTask.platform}</span>
                  <span>/</span>
                  <span>{SLOT_LABELS[selectedTask.slotType] || selectedTask.slotType}</span>
                </div>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <StatusBadge status={selectedTask.status} />
                  {qcGrade && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                      QC: {qcGrade} ({qcScore})
                    </span>
                  )}
                  {selectedTask.latestReview && (
                    <ReviewActionBadge action={selectedTask.latestReview.action} />
                  )}
                  {selectedTask.attempts.length > 1 && (
                    <button
                      onClick={() => {
                        const attempts = attemptData?.attempts ?? [];
                        setLeftAttemptId(attempts[0]?.id ?? "");
                        setRightAttemptId(attempts[1]?.id ?? "");
                        setCompareMode(true);
                      }}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                    >
                      对比
                    </button>
                  )}
                </div>
                {qcIssues.length > 0 && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded text-xs text-red-700">
                    <div className="font-medium mb-1">质检问题:</div>
                    <ul className="list-disc list-inside space-y-0.5">
                      {qcIssues.map((issue, i) => (
                        <li key={i}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <details className="mt-2 text-xs">
                  <summary className="cursor-pointer font-medium text-gray-600 hover:text-gray-800 py-1">
                    QC 合规详情
                  </summary>
                  <div className="mt-2 p-2.5 bg-gray-50 border border-gray-100 rounded space-y-2">
                    {selectedTask.qcGrade !== "N/A" ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-500">QC 等级</span>
                          <span className={`font-semibold ${selectedTask.qcGrade === "A" ? "text-green-600" : selectedTask.qcGrade === "B" ? "text-yellow-600" : "text-red-600"}`}>
                            {selectedTask.qcGrade}
                          </span>
                        </div>
                        {selectedTask.suggestedAction && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">建议操作</span>
                            <span className="text-gray-700 font-medium">{selectedTask.suggestedAction}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-500">白底检查</span>
                          <span className={qcGrade === "A" ? "text-green-600" : "text-red-600"}>
                            {qcGrade === "A" ? "✓ 通过" : "✗ 未通过"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">尺寸检查</span>
                          <span className="text-gray-700">—</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">禁止元素检查</span>
                          <span className="text-gray-700">
                            {selectedTask.qcReasons.length > 0 ? (
                              <span className="text-red-600">发现 {selectedTask.qcReasons.length} 项</span>
                            ) : "✓ 通过"}
                          </span>
                        </div>
                        {selectedTask.qcReasons.length > 0 && (
                          <div className="pt-1 border-t border-gray-200">
                            <div className="text-gray-500 mb-1">不合规项:</div>
                            <ul className="list-disc list-inside space-y-0.5 text-gray-700">
                              {selectedTask.qcReasons.map((r, i) => (
                                <li key={i}>{r}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {selectedTask.qcRiskTags.length > 0 && (
                          <div className="pt-1 border-t border-gray-200">
                            <div className="text-gray-500 mb-1">平台风险标记:</div>
                            <div className="flex flex-wrap gap-1">
                              {selectedTask.qcRiskTags.map((tag, i) => (
                                <span key={i} className="px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded text-[10px] font-medium">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-400 italic">质检未执行</span>
                    )}
                  </div>
                </details>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-600">
                    审核备注
                  </label>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="可选备注..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-600">
                    驳回原因（驳回时必填）
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                    placeholder="商品漂移/风格不符/布局问题..."
                  />
                </div>

                {reviewError && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                    {reviewError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleReviewAction("approved")}
                    disabled={reviewLoading}
                    className="px-3 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {reviewLoading ? "处理中..." : "通过"}
                  </button>
                  <button
                    onClick={() => handleReviewAction("rejected")}
                    disabled={reviewLoading}
                    className="px-3 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {reviewLoading ? "处理中..." : "驳回"}
                  </button>
                  <button
                    onClick={() => handleReviewAction("risk_mark")}
                    disabled={reviewLoading}
                    className="px-3 py-2.5 bg-yellow-500 text-white text-sm font-medium rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    风险标记
                  </button>
                  <button
                    onClick={async () => {
                      setReviewError("");
                      setRetrying(true);
                      try {
                        const res = await fetch(`/api/tasks/${selectedTask.taskId}/retry`, {
                          method: "POST",
                        });
                        if (!res.ok) {
                          const data = await res.json();
                          throw new Error(data.message || "重生成失败");
                        }
                        setRetryKey((k) => k + 1);
                      } catch (e) {
                        setReviewError(String(e));
                      } finally {
                        setRetrying(false);
                      }
                    }}
                    disabled={retrying}
                    className="px-3 py-2.5 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {retrying ? "重生成中..." : "重生成"}
                  </button>
                </div>

                {allVersionAssets.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">
                      版本切换 ({allVersionAssets.length} 个版本)
                    </label>
                    <select
                      value={selectedVersionUrl || ""}
                      onChange={(e) => setSelectedVersionUrl(e.target.value || null)}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">当前版本</option>
                      {allVersionAssets.map((asset) => (
                        <option key={asset.id} value={asset.imageUrl}>
                          V{asset.attemptNumber}{" "}
                          {asset.qcGrade ? `[${asset.qcGrade}]` : ""}{" "}
                          {new Date(asset.createdAt).toLocaleString("zh-CN")}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {allVersionAssets.length === 0 && selectedTask.attempts.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">
                      版本切换 ({selectedTask.attempts.length} 个版本)
                    </label>
                    <select
                      value={selectedVersionUrl || ""}
                      onChange={(e) => setSelectedVersionUrl(e.target.value || null)}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">当前版本</option>
                      {selectedTask.attempts.map((a) => (
                        <option key={a.attemptId} value={a.thumbnailUrl || ""}>
                          {a.status === "succeeded" ? "✓ " : a.status === "failed" ? "✗ " : ""}
                          [{a.status}]
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {reviews.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">
                      审核记录 ({reviews.length})
                    </label>
                    {currentUserId && selectedTask.latestReview?.reviewerId === currentUserId && !["approved", "rejected"].includes(selectedTask.status) && (
                      <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700 flex items-center gap-1.5">
                        <span>⚠️</span>
                        <span>您已审核过此任务，再次操作请确认</span>
                      </div>
                    )}
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {reviews.map((r) => (
                        <div
                          key={r.id}
                          className="flex items-start gap-2 p-2 bg-gray-50 rounded text-xs"
                        >
                          <ReviewActionBadge action={r.action} />
                          <div className="flex-1 min-w-0">
                            {r.comment ? (
                              <p className="text-gray-700 break-words">{r.comment}</p>
                            ) : (
                              <p className="text-gray-400 italic">无备注</p>
                            )}
                            <p className="text-gray-400 mt-0.5">
                              {r.reviewerId && r.reviewerId !== "system" && (
                                <span className="text-gray-500 mr-1">
                                  {r.reviewerId === currentUserId ? "我" : r.reviewerId.slice(0, 8)}
                                </span>
                              )}
                              {new Date(r.createdAt).toLocaleString("zh-CN")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      {batchApproveOpen && (() => {
        const eligible = filteredTasks.filter(
          (t) =>
            (t.qcGrade === "S" || t.qcGrade === "A") &&
            !["approved", "rejected"].includes(t.status),
        );
        return (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">一键通过确认</h3>
              <p className="text-sm text-gray-600 mb-4">
                将对当前筛选结果中 QC 等级为 S 或 A 的{" "}
                <span className="font-semibold text-gray-900">{eligible.length}</span>{" "}
                个待审核任务执行通过操作
              </p>
              {eligible.length > 0 ? (
                <div className="max-h-40 overflow-y-auto mb-4 text-xs space-y-1 border rounded p-2">
                  {eligible.map((t) => (
                    <div key={t.taskId} className="flex justify-between items-center">
                      <span className="truncate mr-2">{t.productName || "未命名"}</span>
                      <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        t.qcGrade === "S" ? "bg-emerald-50 text-emerald-700" : "bg-green-50 text-green-700"
                      }`}>{t.qcGrade}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-400 mb-4">当前没有符合条件的待审核任务</div>
              )}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setBatchApproveOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
                >
                  取消
                </button>
                <button
                  onClick={async () => {
                    setBatchApproving(true);
                    for (const t of eligible) {
                      try {
                        await fetch(`/api/tasks/${t.taskId}/review`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ action: "approved", comment: "一键批量通过" }),
                        });
                      } catch {
                        // continue on individual failure
                      }
                    }
                    setBatchApproving(false);
                    setBatchApproveOpen(false);
                    setRetryKey((k) => k + 1);
                  }}
                  disabled={batchApproving || eligible.length === 0}
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {batchApproving ? "处理中..." : "确认通过"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

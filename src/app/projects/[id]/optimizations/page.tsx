"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";

interface OptimizationItem {
  id: string;
  projectId: string;
  suggestionType: string;
  priority: "high" | "medium" | "low";
  content: string;
  isAdopted: boolean;
  adoptedAt: string | null;
  createdAt: string;
}

const TYPE_OPTIONS = [
  { value: "", label: "全部类型" },
  { value: "slot_optimization", label: "图位优化" },
  { value: "reinforcement", label: "补强" },
  { value: "compliance", label: "合规" },
  { value: "regen_priority", label: "重生成优先级" },
];

const TYPE_LABELS: Record<string, string> = {
  slot_optimization: "图位优化",
  reinforcement: "补强",
  compliance: "合规",
  regen_priority: "重生成优先级",
};

const TYPE_BADGE_VARIANT: Record<string, "primary" | "accent" | "warning" | "destructive"> = {
  slot_optimization: "primary",
  reinforcement: "accent",
  compliance: "warning",
  regen_priority: "destructive",
};

const PRIORITY_CONFIG: Record<string, { label: string; variant: "destructive" | "secondary" | "outline" }> = {
  high: { label: "高", variant: "destructive" },
  medium: { label: "中", variant: "secondary" },
  low: { label: "低", variant: "outline" },
};

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

export default function OptimizationsPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { toast } = useToast();

  const [items, setItems] = useState<OptimizationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("");
  const [adoptingId, setAdoptingId] = useState<string | null>(null);

  const fetchOptimizations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/optimizations?projectId=${projectId}`);
      const data = await res.json();
      if (data.list) {
        setItems(data.list);
      }
    } catch {
      toast("加载优化建议失败", "error");
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  useEffect(() => {
    fetchOptimizations();
  }, [fetchOptimizations]);

  const handleAdopt = async (id: string) => {
    setAdoptingId(id);
    try {
      const res = await fetch(`/api/optimizations/${id}/adopt`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        toast(err.error || "采纳失败", "error");
        return;
      }
      toast("建议已采纳", "success");
      await fetchOptimizations();
    } catch {
      toast("采纳建议失败", "error");
    } finally {
      setAdoptingId(null);
    }
  };

  const filteredItems = items
    .filter((item) => !filterType || item.suggestionType === filterType)
    .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9));

  const parseContent = (content: string): string => {
    try {
      const parsed = JSON.parse(content);
      return typeof parsed === "string" ? parsed : JSON.stringify(parsed, null, 2);
    } catch {
      return content;
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground/70 mb-6">
          <Link href="/" className="hover:text-primary transition-colors">
            首页
          </Link>
          <span>/</span>
          <Link href={`/projects/${projectId}`} className="hover:text-primary transition-colors">
            项目
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">优化建议</span>
        </nav>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">优化建议历史</h1>
            <p className="text-sm text-muted-foreground mt-1">
              项目 ID: {projectId}
              {items.length > 0 && (
                <span className="ml-3">
                  共 {items.length} 条建议
                  {items.filter((i) => i.isAdopted).length > 0 && (
                    <span className="ml-2">
                      已采纳 {items.filter((i) => i.isAdopted).length}
                    </span>
                  )}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="h-9 bg-card border border-border rounded-lg px-3 text-sm text-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-colors"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            title="暂无优化建议"
            description={filterType ? "当前筛选条件下没有匹配的建议" : "该项目暂无优化建议记录"}
          />
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => {
              const typeLabel = TYPE_LABELS[item.suggestionType] || item.suggestionType;
              const typeVariant = TYPE_BADGE_VARIANT[item.suggestionType] || "secondary";
              const prioConf = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.low;
              return (
                <Card key={item.id}>
                  <CardContent className="pt-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={typeVariant} size="sm">
                            {typeLabel}
                          </Badge>
                          <Badge variant={prioConf.variant} size="sm">
                            {prioConf.label}优先级
                          </Badge>
                          {item.isAdopted ? (
                            <Badge variant="success" size="sm">
                              已采纳
                            </Badge>
                          ) : (
                            <Badge variant="outline" size="sm">
                              未采纳
                            </Badge>
                          )}
                        </div>

                        <div className="bg-secondary rounded-lg p-3 text-sm text-foreground font-mono whitespace-pre-wrap break-words">
                          {parseContent(item.content)}
                        </div>

                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>创建于 {new Date(item.createdAt).toLocaleString("zh-CN")}</span>
                          {item.adoptedAt && (
                            <span>采纳于 {new Date(item.adoptedAt).toLocaleString("zh-CN")}</span>
                          )}
                        </div>
                      </div>

                      {!item.isAdopted && (
                        <Button
                          variant="primary"
                          size="sm"
                          loading={adoptingId === item.id}
                          onClick={() => handleAdopt(item.id)}
                        >
                          采纳
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

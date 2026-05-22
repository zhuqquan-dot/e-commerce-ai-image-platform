"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SkeletonCard } from "@/components/ui/skeleton";

interface Recommendation {
  id: string;
  slotTypeCombination: string[];
  basis: string;
  platformId: string;
  category: string;
  adopted: boolean;
}

interface StrategySuggestion {
  id: string;
  type: "main_image_strategy" | "slot_priority";
  mainImageProportions?: string;
  slotPriority?: string[];
  platformId: string;
  category: string;
  adopted: boolean;
}

export default function SuggestionsPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [strategies, setStrategies] = useState<StrategySuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adoptingId, setAdoptingId] = useState<string | null>(null);

  const [workspaceId, setWorkspaceId] = useState("");
  const [platformId, setPlatformId] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    try {
      const match = document.cookie.match(/(?:^|;\s*)mircioo_session=([^;]*)/);
      if (match) {
        const session = JSON.parse(decodeURIComponent(match[1]));
        if (session.workspaceId) setWorkspaceId(session.workspaceId);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/projects/${projectId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          if (data.platformId) setPlatformId(data.platformId);
          if (data.category) setCategory(data.category);
        }
      })
      .catch(() => {});
  }, [projectId]);

  const fetchData = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ workspaceId });
      if (platformId) params.set("platformId", platformId);
      if (category) params.set("category", category);

      const [recRes, stratRes] = await Promise.all([
        fetch(`/api/recommendations/bundle?${params.toString()}`),
        fetch(`/api/suggestions/strategy?${params.toString()}`),
      ]);

      if (!recRes.ok || !stratRes.ok) {
        throw new Error("加载推荐数据失败");
      }

      const recData = await recRes.json();
      const stratData = await stratRes.json();
      setRecommendations(recData.list || recData || []);
      setStrategies(stratData.list || stratData || []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [workspaceId, platformId, category]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleAdoptRecommendation(id: string) {
    setAdoptingId(id);
    try {
      const res = await fetch(`/api/recommendations/${id}/adopt`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "采纳失败");
      }
      setRecommendations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, adopted: true } : r)),
      );
    } catch (e) {
      setError(String(e));
    } finally {
      setAdoptingId(null);
    }
  }

  async function handleAdoptStrategy(id: string) {
    setAdoptingId(id);
    try {
      const res = await fetch(`/api/suggestions/strategy/${id}/adopt`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "采纳失败");
      }
      setStrategies((prev) =>
        prev.map((s) => (s.id === id ? { ...s, adopted: true } : s)),
      );
    } catch (e) {
      setError(String(e));
    } finally {
      setAdoptingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground/70">
        <Link href={`/projects/${projectId}`} className="hover:text-primary transition-colors">
          项目
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">推荐与策略建议</span>
      </nav>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">推荐与策略建议</h1>
          <p className="text-sm text-muted-foreground mt-1">
            基于平台规则与历史数据，为项目提供图包推荐与策略建议
          </p>
        </div>
        <Link href={`/projects/${projectId}`}>
          <Button variant="outline">返回项目</Button>
        </Link>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <>
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3">图包推荐</h2>
            {recommendations.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">暂无图包推荐数据</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendations.map((rec) => (
                  <Card key={rec.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <Badge variant="primary">图包推荐</Badge>
                        {rec.adopted && <Badge variant="success">已采纳</Badge>}
                      </div>
                      <CardTitle className="text-base mt-2">
                        {rec.slotTypeCombination.join(" + ")}
                      </CardTitle>
                      <CardDescription>{rec.basis}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                        {rec.platformId && <span>平台: {rec.platformId}</span>}
                        {rec.category && <span>品类: {rec.category}</span>}
                      </div>
                      {!rec.adopted && (
                        <Button
                          size="sm"
                          loading={adoptingId === rec.id}
                          onClick={() => handleAdoptRecommendation(rec.id)}
                        >
                          采纳
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3">策略建议</h2>
            {strategies.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">暂无策略建议数据</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {strategies.map((strat) => (
                  <Card key={strat.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <Badge variant={strat.type === "main_image_strategy" ? "accent" : "warning"}>
                          {strat.type === "main_image_strategy" ? "主图策略" : "图位优先级"}
                        </Badge>
                        {strat.adopted && <Badge variant="success">已采纳</Badge>}
                      </div>
                      <CardTitle className="text-base mt-2">
                        {strat.type === "main_image_strategy"
                          ? `主图比例: ${strat.mainImageProportions || "—"}`
                          : `优先级: ${(strat.slotPriority || []).join(" → ")}`}
                      </CardTitle>
                      <CardDescription>
                        {strat.platformId && `平台: ${strat.platformId}`}
                        {strat.category && ` · 品类: ${strat.category}`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {!strat.adopted && (
                        <Button
                          size="sm"
                          variant="outline"
                          loading={adoptingId === strat.id}
                          onClick={() => handleAdoptStrategy(strat.id)}
                        >
                          采纳
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

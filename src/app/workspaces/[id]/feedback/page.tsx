"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { SkeletonCard, SkeletonRow } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

interface FeedbackStat {
  groupKey: string;
  avgRating: number;
  totalFeedback: number;
  totalExports: number;
}

interface FeedbackRecord {
  id: string;
  exportPackId: string;
  impressions: number | null;
  clicks: number | null;
  conversions: number | null;
  rating: number | null;
  notes: string | null;
  createdAt: string;
}

export default function FeedbackPage() {
  const params = useParams<{ id: string }>();
  const workspaceId = params.id;

  const [stats, setStats] = useState<FeedbackStat[]>([]);
  const [records, setRecords] = useState<FeedbackRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [formExportPackId, setFormExportPackId] = useState("");
  const [formImpressions, setFormImpressions] = useState("");
  const [formClicks, setFormClicks] = useState("");
  const [formConversions, setFormConversions] = useState("");
  const [formRating, setFormRating] = useState("5");
  const [formNotes, setFormNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [csvContent, setCsvContent] = useState("");
  const [csvPreview, setCsvPreview] = useState<string[][] | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
  const [importError, setImportError] = useState("");

  const [searchExportPackId, setSearchExportPackId] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const statsParams = new URLSearchParams({ workspaceId, groupBy: "platform" });
      const statsRes = await fetch(`/api/feedback/summary?${statsParams.toString()}`);
      if (!statsRes.ok) {
        const data = await statsRes.json();
        throw new Error(data.error || "加载统计数据失败");
      }
      const statsData = await statsRes.json();
      setStats(statsData.list || statsData || []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  const fetchRecords = useCallback(async () => {
    if (!searchExportPackId) {
      setRecords([]);
      return;
    }
    try {
      const res = await fetch(`/api/feedback?exportPackId=${searchExportPackId}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.list || data || []);
      }
    } catch {
      setRecords([]);
    }
  }, [searchExportPackId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  async function handleSubmitFeedback(e: React.FormEvent) {
    e.preventDefault();
    if (!formExportPackId.trim()) {
      setSubmitError("请输入导出包 ID");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exportPackId: formExportPackId,
          impressions: formImpressions ? Number(formImpressions) : undefined,
          clicks: formClicks ? Number(formClicks) : undefined,
          conversions: formConversions ? Number(formConversions) : undefined,
          rating: Number(formRating),
          notes: formNotes || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "录入失败");
      }
      setFormExportPackId("");
      setFormImpressions("");
      setFormClicks("");
      setFormConversions("");
      setFormRating("5");
      setFormNotes("");
      fetchData();
    } catch (e) {
      setSubmitError(String(e));
    } finally {
      setSubmitting(false);
    }
  }

  function parseCsvPreview() {
    if (!csvContent.trim()) {
      setImportError("请输入 CSV 内容");
      return;
    }
    const lines = csvContent.trim().split("\n");
    if (lines.length < 2) {
      setImportError("CSV 至少需要表头和一行数据");
      return;
    }
    const headers = lines[0].split(",").map((h) => h.trim());
    const rows = lines.slice(1, 4).map((line) => line.split(",").map((c) => c.trim()));
    setCsvHeaders(headers);
    setCsvPreview(rows);
    setShowPreview(true);
    setImportError("");
  }

  async function handleBatchImport() {
    if (!csvContent.trim()) {
      setImportError("请输入 CSV 内容");
      return;
    }
    setImporting(true);
    setImportError("");
    setImportResult(null);
    try {
      const res = await fetch("/api/feedback/batch-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvContent }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "导入失败");
      }
      const data = await res.json();
      setImportResult({ success: data.success || 0, failed: data.failed || 0 });
      setCsvContent("");
      setCsvPreview(null);
      setCsvHeaders([]);
      setShowPreview(false);
      fetchData();
    } catch (e) {
      setImportError(String(e));
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground/70">
        <Link href={`/workspaces/${workspaceId}`} className="hover:text-primary transition-colors">
          工作空间
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">数据回流</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">数据回流概览</h1>
        <p className="text-sm text-muted-foreground mt-1">
          汇总反馈数据，录入表现指标，追踪导出效果
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : stats.length === 0 ? (
        <EmptyState title="暂无反馈数据" description="录入反馈数据后将在此展示汇总统计" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((stat) => (
            <Card key={stat.groupKey}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{stat.groupKey}</CardTitle>
                  <Badge variant="primary">{stat.totalFeedback} 条反馈</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {stat.avgRating > 0 ? stat.avgRating.toFixed(1) : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">平均评分</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stat.totalFeedback}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">反馈数</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stat.totalExports}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">导出数</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>录入反馈</CardTitle>
            <CardDescription>手动录入单条导出包的表现数据</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitFeedback} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">导出包 ID</label>
                <Input
                  placeholder="输入 exportPackId"
                  value={formExportPackId}
                  onChange={(e) => setFormExportPackId(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">曝光量</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={formImpressions}
                    onChange={(e) => setFormImpressions(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">点击量</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={formClicks}
                    onChange={(e) => setFormClicks(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">转化量</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={formConversions}
                    onChange={(e) => setFormConversions(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">评分 (1-5)</label>
                <Select value={formRating} onChange={(e) => setFormRating(e.target.value)}>
                  <option value="5">5 - 优秀</option>
                  <option value="4">4 - 良好</option>
                  <option value="3">3 - 一般</option>
                  <option value="2">2 - 较差</option>
                  <option value="1">1 - 很差</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">备注</label>
                <Textarea
                  placeholder="可选备注..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={2}
                />
              </div>
              {submitError && <p className="text-sm text-destructive">{submitError}</p>}
              <Button type="submit" loading={submitting}>录入</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>CSV 批量导入</CardTitle>
            <CardDescription>粘贴 CSV 内容批量导入反馈数据</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Textarea
                placeholder={"exportPackId,impressions,clicks,conversions,rating,notes\npack_001,1000,50,5,4,表现良好"}
                value={csvContent}
                onChange={(e) => {
                  setCsvContent(e.target.value);
                  setShowPreview(false);
                  setCsvPreview(null);
                }}
                rows={5}
              />
              {importError && <p className="text-sm text-destructive">{importError}</p>}
              {showPreview && csvPreview && csvHeaders.length > 0 && (
                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="bg-secondary px-3 py-2 text-xs font-medium text-muted-foreground">
                    预览前 3 行
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          {csvHeaders.map((h, i) => (
                            <th key={i} className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreview.map((row, ri) => (
                          <tr key={ri} className="border-b border-border last:border-b-0">
                            {row.map((cell, ci) => (
                              <td key={ci} className="px-3 py-2 text-xs text-foreground">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {importResult && (
                <div className="bg-secondary rounded-lg p-3 text-sm">
                  <span className="text-foreground font-medium">导入完成：</span>
                  <span className="text-emerald-600 ml-1">成功 {importResult.success} 条</span>
                  {importResult.failed > 0 && (
                    <span className="text-destructive ml-2">失败 {importResult.failed} 条</span>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={parseCsvPreview} disabled={!csvContent.trim()}>
                  预览
                </Button>
                <Button
                  variant="primary"
                  loading={importing}
                  onClick={handleBatchImport}
                  disabled={!showPreview}
                >
                  确认导入
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>反馈记录</CardTitle>
            <div className="flex items-center gap-2">
              <Input
                placeholder="按导出包 ID 搜索"
                value={searchExportPackId}
                onChange={(e) => setSearchExportPackId(e.target.value)}
                className="w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {searchExportPackId && records.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm text-muted-foreground">未找到该导出包的反馈记录</p>
            </div>
          ) : records.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm text-muted-foreground">输入导出包 ID 搜索反馈记录</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">导出包</th>
                    <th className="text-center text-xs font-medium text-muted-foreground px-6 py-3">曝光</th>
                    <th className="text-center text-xs font-medium text-muted-foreground px-6 py-3">点击</th>
                    <th className="text-center text-xs font-medium text-muted-foreground px-6 py-3">转化</th>
                    <th className="text-center text-xs font-medium text-muted-foreground px-6 py-3">评分</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">备注</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {records.map((rec) => (
                    <tr key={rec.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-3 text-sm text-foreground font-mono">
                        {rec.exportPackId.slice(0, 8)}...
                      </td>
                      <td className="px-6 py-3 text-sm text-center text-muted-foreground">
                        {rec.impressions ?? "—"}
                      </td>
                      <td className="px-6 py-3 text-sm text-center text-muted-foreground">
                        {rec.clicks ?? "—"}
                      </td>
                      <td className="px-6 py-3 text-sm text-center text-muted-foreground">
                        {rec.conversions ?? "—"}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <Badge variant={rec.rating && rec.rating >= 4 ? "success" : rec.rating && rec.rating >= 3 ? "warning" : "destructive"}>
                          {rec.rating ?? "—"}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-sm text-muted-foreground max-w-[200px] truncate">
                        {rec.notes || "—"}
                      </td>
                      <td className="px-6 py-3 text-sm text-muted-foreground">
                        {new Date(rec.createdAt).toLocaleDateString("zh-CN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCard } from "@/components/ui/skeleton";

interface SeriesPack {
  id: string;
  clientSpaceId: string;
  brandPackId: string;
  seriesName: string;
  styleLockText: string;
  fixedPalette: string[];
  backgroundSystem: string;
  lightingSystem: string;
  defaultBundleStructure: string;
  defaultReviewThreshold: string;
  brandPackName: string | null;
  createdAt: string;
}

interface ListResponse {
  list: SeriesPack[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface ClientSpaceOption {
  id: string;
  clientName: string;
  brandName: string;
}

interface BrandPackOption {
  id: string;
  brandName: string;
}

const emptyForm = {
  clientSpaceId: "",
  brandPackId: "",
  seriesName: "",
  styleLockText: "",
  fixedPalette: "",
  backgroundSystem: "",
  lightingSystem: "",
  defaultBundleStructure: "",
  defaultReviewThreshold: "",
};

function truncateText(text: string | null | undefined, maxLen: number): string {
  if (!text) return "-";
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + "...";
}

function SeriesPacksPageContent() {
  const searchParams = useSearchParams();
  const filterClientSpaceId = searchParams.get("clientSpaceId") || "";
  const filterBrandPackId = searchParams.get("brandPackId") || "";

  const [list, setList] = useState<SeriesPack[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [clientSpaces, setClientSpaces] = useState<ClientSpaceOption[]>([]);
  const [brandPacks, setBrandPacks] = useState<BrandPackOption[]>([]);
  const [clientSpaceId, setClientSpaceId] = useState(filterClientSpaceId);
  const [brandPackId, setBrandPackId] = useState(filterBrandPackId);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (clientSpaceId) params.set("clientSpaceId", clientSpaceId);
      if (brandPackId) params.set("brandPackId", brandPackId);
      const res = await fetch(`/api/series-packs?${params.toString()}`);
      if (!res.ok) throw new Error("加载失败");
      const data: ListResponse = await res.json();
      setList(data.list);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [page, clientSpaceId, brandPackId]);

  const fetchClientSpaces = useCallback(async () => {
    try {
      const res = await fetch("/api/client-spaces?pageSize=100");
      if (!res.ok) return;
      const data = await res.json();
      setClientSpaces(data.list || []);
    } catch {
      // ignore
    }
  }, []);

  const fetchBrandPacks = useCallback(async () => {
    try {
      const params = new URLSearchParams({ pageSize: "100" });
      if (clientSpaceId) params.set("clientSpaceId", clientSpaceId);
      const res = await fetch(`/api/brand-packs?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      setBrandPacks(data.list || []);
    } catch {
      // ignore
    }
  }, [clientSpaceId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchClientSpaces();
  }, [fetchClientSpaces]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBrandPacks();
  }, [fetchBrandPacks]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [clientSpaceId, brandPackId]);

  function openCreateModal() {
    setEditingId(null);
    setForm({
      ...emptyForm,
      clientSpaceId: clientSpaceId || "",
      brandPackId: brandPackId || "",
    });
    setShowModal(true);
  }

  function openEditModal(item: SeriesPack) {
    setEditingId(item.id);
    setForm({
      clientSpaceId: item.clientSpaceId,
      brandPackId: item.brandPackId,
      seriesName: item.seriesName,
      styleLockText: item.styleLockText || "",
      fixedPalette: Array.isArray(item.fixedPalette)
        ? item.fixedPalette.join(", ")
        : "",
      backgroundSystem: item.backgroundSystem || "",
      lightingSystem: item.lightingSystem || "",
      defaultBundleStructure: item.defaultBundleStructure || "",
      defaultReviewThreshold: item.defaultReviewThreshold || "",
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const fixedPalette = form.fixedPalette
      ? form.fixedPalette.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    const body = {
      clientSpaceId: form.clientSpaceId,
      brandPackId: form.brandPackId,
      seriesName: form.seriesName,
      styleLockText: form.styleLockText || undefined,
      fixedPalette,
      backgroundSystem: form.backgroundSystem || undefined,
      lightingSystem: form.lightingSystem || undefined,
      defaultBundleStructure: form.defaultBundleStructure || undefined,
      defaultReviewThreshold: form.defaultReviewThreshold || undefined,
    };

    try {
      const url = editingId
        ? `/api/series-packs/${editingId}`
        : "/api/series-packs";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "操作失败");
      }

      closeModal();
      fetchList();
    } catch (e) {
      setError(String(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("确定要删除该系列资产包吗？")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/series-packs/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("删除失败");
      fetchList();
    } catch (e) {
      setError(String(e));
    } finally {
      setDeleting(null);
    }
  }

  function getClientSpaceLabel(id: string) {
    const cs = clientSpaces.find((c) => c.id === id);
    return cs ? `${cs.clientName} - ${cs.brandName}` : id;
  }

  const clientSpaceFilterOptions = [
    { value: "", label: "全部" },
    ...clientSpaces.map((cs) => ({
      value: cs.id,
      label: `${cs.clientName} - ${cs.brandName}`,
    })),
  ];

  const brandPackFilterOptions = [
    { value: "", label: "全部" },
    ...brandPacks.map((bp) => ({
      value: bp.id,
      label: bp.brandName,
    })),
  ];

  const modalClientSpaceOptions = [
    { value: "", label: "请选择客户空间" },
    ...clientSpaces.map((cs) => ({
      value: cs.id,
      label: `${cs.clientName} - ${cs.brandName}`,
    })),
  ];

  const modalBrandPackOptions = [
    { value: "", label: "请选择品牌包" },
    ...brandPacks.map((bp) => ({
      value: bp.id,
      label: bp.brandName,
    })),
  ];

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-sm text-muted-foreground/70 mb-4">
          Mircioo &gt; 系列资产包
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">系列资产包</h1>
          <Button variant="primary" onClick={openCreateModal}>
            + 新建系列资产包
          </Button>
        </div>

        <div className="bg-secondary rounded-lg p-4 mb-6">
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Select
                label="按客户空间筛选"
                value={clientSpaceId}
                onChange={(e) => {
                  setClientSpaceId(e.target.value);
                  setBrandPackId("");
                }}
                options={clientSpaceFilterOptions}
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <Select
                label="按品牌包筛选"
                value={brandPackId}
                onChange={(e) => setBrandPackId(e.target.value)}
                options={brandPackFilterOptions}
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            title="暂无系列资产包"
            description="点击「新建系列资产包」来创建第一个系列资产包"
            action={
              <Button variant="primary" onClick={openCreateModal}>
                新建系列资产包
              </Button>
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {list.map((item) => (
                <Card key={item.id} className="p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-foreground">
                      {item.seriesName}
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(item)}
                        className="text-primary hover:text-primary/80 text-sm"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={deleting === item.id}
                        className="text-destructive hover:text-destructive/70 text-sm disabled:opacity-50"
                      >
                        {deleting === item.id ? "删除中..." : "删除"}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">客户空间</span>
                      <span className="text-foreground text-xs">
                        {getClientSpaceLabel(item.clientSpaceId)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">品牌包</span>
                      <span className="text-foreground font-medium text-xs">
                        {item.brandPackName || item.brandPackId}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">背景系统</span>
                      <span className="text-foreground text-xs">
                        {item.backgroundSystem || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">光照系统</span>
                      <span className="text-foreground text-xs">
                        {item.lightingSystem || "-"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border">
                    <span className="text-xs text-muted-foreground mb-1 block">
                      Style Lock
                    </span>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {truncateText(item.styleLockText, 80)}
                    </p>
                  </div>

                  {item.defaultBundleStructure && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <span className="text-xs text-muted-foreground mb-1 block">
                        默认图包结构
                      </span>
                      <p className="text-xs text-muted-foreground font-mono">
                        {truncateText(item.defaultBundleStructure, 60)}
                      </p>
                    </div>
                  )}

                  {Array.isArray(item.fixedPalette) &&
                    item.fixedPalette.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border">
                        <span className="text-xs text-muted-foreground mb-1 block">
                          固定色板
                        </span>
                        <div className="flex gap-1 flex-wrap">
                          {item.fixedPalette.map((color, i) => (
                            <div
                              key={i}
                              className="w-5 h-5 rounded border border-border"
                              style={{ backgroundColor: color }}
                              title={color}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                  <div className="mt-3 text-xs text-muted-foreground/70">
                    {new Date(item.createdAt).toLocaleDateString("zh-CN")}
                  </div>
                </Card>
              ))}
            </div>

            <div className="flex items-center justify-between mt-6 px-2">
              <span className="text-sm text-muted-foreground">共 {total} 条</span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  上一页
                </Button>
                <span className="px-3 py-1 text-sm text-muted-foreground self-center">
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

        {showModal && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-foreground mb-4">
                {editingId ? "编辑系列资产包" : "新建系列资产包"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Select
                  label="客户空间"
                  required
                  value={form.clientSpaceId}
                  onChange={(e) => {
                    setForm({
                      ...form,
                      clientSpaceId: e.target.value,
                      brandPackId: "",
                    });
                  }}
                  options={modalClientSpaceOptions}
                />
                <Select
                  label="品牌包"
                  required
                  value={form.brandPackId}
                  onChange={(e) =>
                    setForm({ ...form, brandPackId: e.target.value })
                  }
                  options={modalBrandPackOptions}
                />
                <Input
                  label="系列名称"
                  required
                  value={form.seriesName}
                  onChange={(e) =>
                    setForm({ ...form, seriesName: e.target.value })
                  }
                />
                <Textarea
                  label="Style Lock 文本"
                  value={form.styleLockText}
                  onChange={(e) =>
                    setForm({ ...form, styleLockText: e.target.value })
                  }
                  rows={3}
                />
                <Input
                  label="固定色板"
                  value={form.fixedPalette}
                  onChange={(e) =>
                    setForm({ ...form, fixedPalette: e.target.value })
                  }
                  placeholder="十六进制色值，逗号分隔"
                  hint="例如：#FF0000, #00FF00, #0000FF"
                />
                <Input
                  label="背景系统"
                  value={form.backgroundSystem}
                  onChange={(e) =>
                    setForm({ ...form, backgroundSystem: e.target.value })
                  }
                />
                <Input
                  label="光照系统"
                  value={form.lightingSystem}
                  onChange={(e) =>
                    setForm({ ...form, lightingSystem: e.target.value })
                  }
                />
                <Input
                  label="默认图包结构"
                  value={form.defaultBundleStructure}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      defaultBundleStructure: e.target.value,
                    })
                  }
                />
                <Input
                  label="默认审查阈值"
                  value={form.defaultReviewThreshold}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      defaultReviewThreshold: e.target.value,
                    })
                  }
                />
                <div className="flex gap-3 justify-end pt-2">
                  <Button variant="ghost" type="button" onClick={closeModal}>
                    取消
                  </Button>
                  <Button variant="primary" type="submit" loading={submitting}>
                    保存
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SeriesPacksPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">加载中...</div>}>
      <SeriesPacksPageContent />
    </Suspense>
  )
}

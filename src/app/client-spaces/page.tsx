"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCard } from "@/components/ui/skeleton";

interface ClientSpace {
  id: string;
  clientName: string;
  brandName: string;
  region: string;
  defaultLanguage: string;
  targetMarkets: string[];
  createdAt: string;
}

interface ListResponse {
  list: ClientSpace[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const emptyForm = {
  clientName: "",
  brandName: "",
  region: "",
  defaultLanguage: "zh-CN",
  targetMarkets: "",
};

export default function ClientSpacesPage() {
  const [list, setList] = useState<ClientSpace[]>([]);
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

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      const res = await fetch(`/api/client-spaces?${params.toString()}`);
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
  }, [page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchList();
  }, [fetchList]);

  function openCreateModal() {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEditModal(item: ClientSpace) {
    setEditingId(item.id);
    setForm({
      clientName: item.clientName,
      brandName: item.brandName,
      region: item.region || "",
      defaultLanguage: item.defaultLanguage || "zh-CN",
      targetMarkets: Array.isArray(item.targetMarkets)
        ? item.targetMarkets.join(", ")
        : "",
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

    const targetMarkets = form.targetMarkets
      ? form.targetMarkets.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    const body = {
      clientName: form.clientName,
      brandName: form.brandName,
      region: form.region || undefined,
      defaultLanguage: form.defaultLanguage || undefined,
      targetMarkets,
    };

    try {
      const url = editingId
        ? `/api/client-spaces/${editingId}`
        : "/api/client-spaces";
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
    if (!confirm("确定要删除该客户空间吗？关联的品牌包和系列包也会被删除。")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/client-spaces/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("删除失败");
      fetchList();
    } catch (e) {
      setError(String(e));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-sm text-muted-foreground/70 mb-4">
          Mircioo &gt; 客户空间
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">客户空间</h1>
          <Button variant="primary" onClick={openCreateModal}>
            + 新建客户空间
          </Button>
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
            title="暂无客户空间"
            description="点击「新建客户空间」来创建第一个客户空间"
            action={
              <Button variant="primary" onClick={openCreateModal}>
                新建客户空间
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
                      {item.clientName}
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
                      <span className="text-muted-foreground">品牌名称</span>
                      <span className="text-foreground font-medium">{item.brandName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">目标市场</span>
                      <span className="text-foreground">
                        {Array.isArray(item.targetMarkets) && item.targetMarkets.length > 0
                          ? item.targetMarkets.join(", ")
                          : "-"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">区域</span>
                      <span className="text-foreground">{item.region || "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">默认语言</span>
                      <span className="text-foreground">
                        {item.defaultLanguage || "-"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border flex gap-3">
                    <Link
                      href={`/brand-packs?clientSpaceId=${item.id}`}
                      className="text-xs text-primary hover:text-primary/80"
                    >
                      品牌包
                    </Link>
                    <Link
                      href={`/series-packs?clientSpaceId=${item.id}`}
                      className="text-xs text-primary hover:text-primary/80"
                    >
                      系列包
                    </Link>
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
            <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-lg mx-4 p-6">
              <h2 className="text-xl font-bold text-foreground mb-4">
                {editingId ? "编辑客户空间" : "新建客户空间"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">客户名称</label>
                  <Input
                    required
                    value={form.clientName}
                    onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">品牌名称</label>
                  <Input
                    required
                    value={form.brandName}
                    onChange={(e) => setForm({ ...form, brandName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">区域</label>
                  <Input
                    value={form.region}
                    onChange={(e) => setForm({ ...form, region: e.target.value })}
                    placeholder="例如：亚太"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">默认语言</label>
                  <Input
                    value={form.defaultLanguage}
                    onChange={(e) => setForm({ ...form, defaultLanguage: e.target.value })}
                    placeholder="zh-CN"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">目标市场</label>
                  <Input
                    value={form.targetMarkets}
                    onChange={(e) => setForm({ ...form, targetMarkets: e.target.value })}
                    placeholder="逗号分隔，例如：CN, US, JP"
                  />
                  <p className="text-xs text-muted-foreground mt-1">多个市场用逗号分隔</p>
                </div>
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

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonRow } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";

interface Product {
  id: string;
  productName: string;
  category: string;
  sku: string;
  spu: string;
  marketRegion: string;
  coreSellingPoint1: string;
  inputMode: string;
  createdAt: string;
  brandPackName: string | null;
  seriesPackName: string | null;
}

interface ListResponse {
  list: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("");
  const [clientSpaceId, setClientSpaceId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (clientSpaceId) params.set("clientSpaceId", clientSpaceId);
      if (category) params.set("category", category);
      if (keyword) params.set("keyword", keyword);
      params.set("page", String(page));
      params.set("pageSize", "20");

      const res = await fetch(`/api/products?${params.toString()}`);
      if (!res.ok) throw new Error("加载失败");
      const data: ListResponse = await res.json();
      setProducts(data.list);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [clientSpaceId, category, keyword, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProducts();
  }, [fetchProducts]);

  async function handleDelete(id: string) {
    if (!confirm("确定要删除该商品吗？")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("删除失败");
      fetchProducts();
    } catch (e) {
      setError(String(e));
    } finally {
      setDeleting(null);
    }
  }

  const inputModeLabel: Record<string, string> = {
    quick: "快速模式",
    standard: "标准生产",
    high_consistency: "高一致性",
  };

  const inputModeVariant = (mode: string): "primary" | "secondary" => {
    if (mode === "quick") return "secondary";
    return "primary";
  };

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">商品库</h1>
          <div className="flex gap-3">
            <Link href="/products/new">
              <Button variant="primary">+ 新增商品</Button>
            </Link>
            <Link href="/products/import">
              <Button variant="outline">批量导入</Button>
            </Link>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 mb-6">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                客户空间ID
              </label>
              <Input
                value={clientSpaceId}
                onChange={(e) => { setClientSpaceId(e.target.value); setPage(1); }}
                placeholder="输入 clientSpaceId"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                类目
              </label>
              <Input
                value={category}
                onChange={(e) => { setCategory(e.target.value); setPage(1); }}
                placeholder="输入类目"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                关键词
              </label>
              <Input
                value={keyword}
                onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
                placeholder="搜索商品名称/SKU/SPU/卖点"
              />
            </div>
            <Button variant="ghost" onClick={fetchProducts}>
              搜索
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="bg-card border border-border rounded-xl">
            <EmptyState
              title="暂无商品"
              description={'点击"新增商品"或"批量导入"来添加商品'}
            />
          </div>
        ) : (
          <>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-card border-b border-border">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">商品名称</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">类目</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">SKU</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">SPU</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">目标市场</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">核心卖点</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">品牌包</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">系列包</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">模式</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">创建时间</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <tr key={p.id} className="border-b border-border hover:bg-secondary">
                        <td className="px-4 py-3 font-medium text-foreground">{p.productName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{p.category}</td>
                        <td className="px-4 py-3 text-muted-foreground">{p.sku || "-"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{p.spu || "-"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{p.marketRegion}</td>
                        <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">
                          {p.coreSellingPoint1 || "-"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{p.brandPackName || "-"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{p.seriesPackName || "-"}</td>
                        <td className="px-4 py-3">
                          <Badge variant={inputModeVariant(p.inputMode)}>
                            {inputModeLabel[p.inputMode] || p.inputMode}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground/70 text-xs">
                          {new Date(p.createdAt).toLocaleDateString("zh-CN")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex gap-2 justify-end">
                            <Link href={`/products/${p.id}`}>
                              <Button variant="link" size="sm">
                                编辑
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive/70"
                              onClick={() => handleDelete(p.id)}
                              disabled={deleting === p.id}
                            >
                              {deleting === p.id ? "删除中..." : "删除"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 px-2">
              <span className="text-sm text-muted-foreground/70">共 {total} 条</span>
              <div className="flex gap-2 items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  上一页
                </Button>
                <span className="px-3 py-1 text-sm text-muted-foreground">
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
      </div>
    </div>
  );
}

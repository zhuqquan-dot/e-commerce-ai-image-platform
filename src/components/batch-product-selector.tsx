"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface Product {
  id: string;
  productName: string;
  category: string;
  sku: string;
  seriesPackId: string;
  seriesPackName: string | null;
}

interface SeriesPack {
  id: string;
  seriesName: string;
}

interface BatchResult {
  parentProject: {
    id: string;
    projectName: string;
    status: string;
  };
  summary: {
    total: number;
    created: number;
    blocked: number;
  };
  children: Array<{
    projectId: string;
    productId: string;
    productName: string;
    status: string;
  }>;
  blocked: Array<{
    productId: string;
    productName: string;
    reason: string;
  }>;
}

interface BatchProductSelectorProps {
  clientSpaceId: string;
  seriesPackId?: string;
  projectName: string;
  selectedPlatforms: string[];
  inputMode: string;
  bundleType: string;
  onBack: () => void;
  onComplete: (result: BatchResult) => void;
}

export function BatchProductSelector({
  clientSpaceId,
  seriesPackId: preselectedSeriesPackId,
  projectName,
  selectedPlatforms,
  inputMode,
  bundleType,
  onBack,
  onComplete,
}: BatchProductSelectorProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [seriesPacks, setSeriesPacks] = useState<SeriesPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [seriesFilter, setSeriesFilter] = useState(preselectedSeriesPackId || "");

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/products?clientSpaceId=${clientSpaceId}&pageSize=100`);
      if (!res.ok) throw new Error("加载商品列表失败");
      const data = await res.json();
      setProducts(data.list || []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [clientSpaceId]);

  const fetchSeriesPacks = useCallback(async () => {
    try {
      const res = await fetch(`/api/series-packs?clientSpaceId=${clientSpaceId}&pageSize=100`);
      if (!res.ok) return;
      const data = await res.json();
      setSeriesPacks(data.list || []);
    } catch {
      // ignore
    }
  }, [clientSpaceId]);

  useEffect(() => {
    fetchProducts();
    fetchSeriesPacks();
  }, [fetchProducts, fetchSeriesPacks]);

  const filteredProducts = seriesFilter
    ? products.filter((p) => p.seriesPackId === seriesFilter)
    : products;

  const allFilteredSelected =
    filteredProducts.length > 0 && filteredProducts.every((p) => selectedIds.has(p.id));

  const toggleProduct = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProducts.map((p) => p.id)));
    }
  };

  const handleSubmit = async () => {
    if (selectedIds.size === 0) return;

    setSubmitting(true);
    setError("");

    try {
      const productIds = Array.from(selectedIds);

      const res = await fetch("/api/projects/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: projectName.trim(),
          clientSpaceId,
          productIds,
          platformNames: selectedPlatforms,
          seriesPackId: preselectedSeriesPackId || undefined,
          inputMode,
          bundleType,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "批量创建失败");
      }

      const result: BatchResult = await res.json();
      try {
        sessionStorage.setItem("mircioo_batch_result", JSON.stringify(result));
      } catch {
        // ignore
      }
      onComplete(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const seriesPackOptions = [
    { value: "", label: "全部系列包" },
    ...seriesPacks.map((sp) => ({
      value: sp.id,
      label: sp.seriesName,
    })),
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>📦 Step 7 - 选择商品</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            从当前客户空间选择要批量生成图包的商品
          </p>
          <Select
            label="按系列包筛选"
            value={seriesFilter}
            onChange={(e) => setSeriesFilter(e.target.value)}
            options={seriesPackOptions}
          />
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-muted-foreground text-sm">
              {seriesFilter ? "该系列包下暂无商品" : "当前客户空间下暂无商品"}
            </p>
            <p className="text-muted-foreground/70 text-xs mt-1">
              请先在商品管理中导入商品，或清除系列包筛选
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-muted-foreground/30 text-primary focus:ring-primary/20"
                />
                {allFilteredSelected ? "取消全选" : "全选"}
              </label>
              <span className="text-xs text-muted-foreground">
                已选 {selectedIds.size} / {products.length} 个商品
              </span>
            </div>

            <div className="border border-border rounded-lg divide-y divide-border max-h-80 overflow-y-auto">
              {filteredProducts.map((product) => {
                const isSelected = selectedIds.has(product.id);
                return (
                  <label
                    key={product.id}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-secondary ${
                      isSelected ? "bg-primary/5" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleProduct(product.id)}
                      className="w-4 h-4 rounded border-muted-foreground/30 text-primary focus:ring-primary/20 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground truncate">
                        {product.productName}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {product.category && (
                          <Badge variant="outline" className="text-[10px]">
                            {product.category}
                          </Badge>
                        )}
                        {product.sku && (
                          <span className="text-xs text-muted-foreground/70 font-mono">
                            SKU: {product.sku}
                          </span>
                        )}
                        {product.seriesPackName && (
                          <Badge variant="secondary" className="text-[10px]">
                            {product.seriesPackName}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </>
        )}

        <div className="border-t border-border pt-4 flex gap-3 justify-end">
          <Button variant="ghost" onClick={onBack} type="button">
            返回修改
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={submitting}
            disabled={selectedIds.size === 0 || loading}
          >
            批量创建 {selectedIds.size > 0 ? `(${selectedIds.size} 个商品)` : ""}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

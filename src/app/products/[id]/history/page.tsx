"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";

interface PlanHistoryItem {
  projectId: string;
  projectName: string;
  platform: string;
  slotCount: number;
  createdAt: string;
  warnings: string[];
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

export default function ProductHistoryPage() {
  const params = useParams();
  const productId = params.id as string;

  const [planHistory, setPlanHistory] = useState<PlanHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPlanHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/products/${productId}/plan-history`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "加载失败");
      }
      const data = await res.json();
      setPlanHistory(data.planHistory || []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (productId) fetchPlanHistory();
  }, [fetchPlanHistory, productId]);

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

  const groupedByProject = planHistory.reduce<Record<string, PlanHistoryItem[]>>(
    (acc, item) => {
      if (!acc[item.projectId]) acc[item.projectId] = [];
      acc[item.projectId].push(item);
      return acc;
    },
    {},
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <Link href="/products" className="hover:text-primary transition-colors">
          商品库
        </Link>
        <span>/</span>
        <Link href={`/products/${productId}`} className="hover:text-primary transition-colors">
          商品详情
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">规划历史</span>
      </nav>

      <h1 className="text-2xl font-bold text-foreground">商品规划历史</h1>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {planHistory.length === 0 && !error ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-foreground font-medium">暂无规划历史</p>
            <p className="text-sm text-muted-foreground mt-1">该商品尚未在任何项目中进行过图包规划</p>
            <div className="mt-4">
              <Link href={`/products/${productId}`}>
                <Button variant="primary" size="sm">返回商品详情</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByProject).map(([projectId, items]) => {
            const projectName = items[0]?.projectName || "未知商品";
            return (
              <Card key={projectId}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{projectName}</CardTitle>
                      <p className="text-xs text-muted-foreground font-mono mt-1">
                        {projectId}
                      </p>
                    </div>
                    <Link href={`/projects/${projectId}/plan`}>
                      <Button variant="outline" size="sm">
                        查看项目规划
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-secondary border-b border-border">
                          <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                            平台
                          </th>
                          <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">
                            Slot 数量
                          </th>
                          <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                            规划时间
                          </th>
                          <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                            风险提醒
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, idx) => (
                          <tr
                            key={idx}
                            className="border-b border-border hover:bg-secondary/50"
                          >
                            <td className="px-4 py-3">
                              <Badge variant="outline">
                                {PLATFORM_LABELS[item.platform] || item.platform}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="font-mono text-foreground">
                                {item.slotCount}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground/70">
                              {new Date(item.createdAt).toLocaleString("zh-CN")}
                            </td>
                            <td className="px-4 py-3">
                              {item.warnings.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {item.warnings.map((w, wi) => (
                                    <Badge key={wi} variant="warning" size="sm">
                                      {w}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="flex justify-start">
        <Link href={`/products/${productId}`}>
          <Button variant="ghost">← 返回商品详情</Button>
        </Link>
      </div>
    </div>
  );
}

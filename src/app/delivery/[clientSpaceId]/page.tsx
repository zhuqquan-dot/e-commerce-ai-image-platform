"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface ClientSpaceInfo {
  id: string;
  clientName: string;
  brandName: string;
  region: string;
}

interface ProjectInfo {
  id: string;
  projectType: string;
  selectedPlatforms: string[];
  createdAt: string;
}

interface TaskAsset {
  id: string;
  projectId: string;
  platform: string;
  slotCode: string;
  imageUrl: string | null;
  format: string | null;
  fileSize: number | null;
  approvedAt: string | null;
}

interface ExportPack {
  id: string;
  projectId: string;
  status: string;
  fileCount: number;
  fileUrl: string | null;
  createdAt: string;
}

interface DeliveryData {
  clientSpace: ClientSpaceInfo;
  projects: ProjectInfo[];
  tasks: TaskAsset[];
  exportPacks: ExportPack[];
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

const PROJECT_TYPE_MAP: Record<string, string> = {
  single_product_single_platform: "单商品单平台",
  single_product_multi_platform: "单商品多平台",
  multi_product_batch: "多商品批量",
};

export default function DeliveryPage() {
  const params = useParams();
  const clientSpaceId = params.clientSpaceId as string;

  const [data, setData] = useState<DeliveryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [filterProjectId, setFilterProjectId] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/delivery/${clientSpaceId}`);
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || "加载失败");
        }
        const d: DeliveryData = await res.json();
        setData(d);
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [clientSpaceId]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 text-center">
        <div className="text-4xl mb-4">❌</div>
        <p className="text-destructive mb-4">{error || "加载失败"}</p>
        <Link href="/client-spaces">
          <Button variant="outline">返回客户空间</Button>
        </Link>
      </div>
    );
  }

  const { clientSpace, projects, tasks, exportPacks } = data;

  const filteredTasks = filterProjectId
    ? tasks.filter((t) => t.projectId === filterProjectId)
    : tasks;

  const filteredExports = filterProjectId
    ? exportPacks.filter((e) => e.projectId === filterProjectId)
    : exportPacks;

  const tasksByProject = new Map<string, TaskAsset[]>();
  for (const t of filteredTasks) {
    const list = tasksByProject.get(t.projectId) || [];
    list.push(t);
    tasksByProject.set(t.projectId, list);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-muted-foreground/70 mb-1">
            客户交付视图
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {clientSpace.clientName}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {clientSpace.brandName}
            {clientSpace.region ? ` · ${clientSpace.region}` : ""}
          </p>
        </div>
        <Link href="/client-spaces">
          <Button variant="ghost" size="sm">返回</Button>
        </Link>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <span className="text-muted-foreground">项目筛选:</span>
        <button
          onClick={() => setFilterProjectId("")}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            !filterProjectId ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          }`}
        >
          全部 ({tasks.length})
        </button>
        {projects.map((p) => {
          const count = tasks.filter((t) => t.projectId === p.id).length;
          return (
            <button
              key={p.id}
              onClick={() => setFilterProjectId(p.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filterProjectId === p.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {PROJECT_TYPE_MAP[p.projectType] || p.projectType} ({count})
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-4">
            <div className="text-muted-foreground text-sm">已审核素材</div>
            <div className="text-2xl font-bold text-foreground mt-1">{tasks.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="text-muted-foreground text-sm">项目数</div>
            <div className="text-2xl font-bold text-foreground mt-1">{projects.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="text-muted-foreground text-sm">导出包</div>
            <div className="text-2xl font-bold text-foreground mt-1">{exportPacks.length}</div>
          </CardContent>
        </Card>
      </div>

      {filteredExports.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3">📥 导出包</h2>
          <div className="space-y-2">
            {filteredExports.map((pack) => (
              <div key={pack.id} className="flex items-center justify-between p-3 bg-card border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-lg">📦</span>
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      导出包 {pack.id.slice(0, 8)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {pack.fileCount} 个文件 · {new Date(pack.createdAt).toLocaleDateString("zh-CN")}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={pack.status === "completed" ? "success" : "outline"}>
                    {pack.status === "completed" ? "已完成" : pack.status}
                  </Badge>
                  {pack.fileUrl && (
                    <a href={pack.fileUrl} download>
                      <Button variant="outline" size="sm">下载</Button>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">🖼 已审核素材</h2>
        {filteredTasks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-muted-foreground text-sm">暂无已审核素材</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredTasks.map((task) => (
              <button
                key={task.id}
                onClick={() => task.imageUrl && setPreviewUrl(task.imageUrl)}
                className="text-left group"
              >
                <Card className="overflow-hidden hover:shadow-md transition-shadow">
                  <div className="aspect-square bg-secondary flex items-center justify-center overflow-hidden">
                    {task.imageUrl ? (
                      <img
                        src={task.imageUrl}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    ) : (
                      <span className="text-muted-foreground text-xs">无图</span>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Badge variant="outline" className="text-[10px] px-1.5">
                        {PLATFORM_LABELS[task.platform] || task.platform}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] px-1.5">
                        {SLOT_LABELS[task.slotCode] || task.slotCode}
                      </Badge>
                    </div>
                    {task.approvedAt && (
                      <div className="text-[10px] text-muted-foreground">
                        审核通过: {new Date(task.approvedAt).toLocaleDateString("zh-CN")}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
        )}
      </div>

      {previewUrl && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img
              src={previewUrl}
              alt="预览"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute top-2 right-2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SkeletonCard } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

interface TemplateItem {
  id: string;
  name: string;
  type: string;
  platform: string | null;
  category: string | null;
  usageCount: number;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  bundle: "图包模板",
  brand: "品牌模板",
  platform: "平台模板",
};

const TYPE_BADGE_VARIANT: Record<string, "primary" | "accent" | "warning"> = {
  bundle: "primary",
  brand: "accent",
  platform: "warning",
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [workspaceId, setWorkspaceId] = useState("");
  const [filterPlatform, setFilterPlatform] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterType, setFilterType] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", type: "bundle", platform: "", category: "" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    try {
      const match = document.cookie.match(/(?:^|;\s*)mircioo_session=([^;]*)/);
      if (match) {
        const session = JSON.parse(decodeURIComponent(match[1]));
        if (session.workspaceId) setWorkspaceId(session.workspaceId);
      }
    } catch {}
  }, []);

  const fetchTemplates = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ workspaceId });
      if (filterPlatform) params.set("platform", filterPlatform);
      if (filterCategory) params.set("category", filterCategory);
      if (filterType) params.set("type", filterType);

      const res = await fetch(`/api/templates?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "加载模板失败");
      }
      const data = await res.json();
      setTemplates(data.list || data || []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [workspaceId, filterPlatform, filterCategory, filterType]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.name.trim()) {
      setCreateError("请输入模板名称");
      return;
    }
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          name: createForm.name,
          type: createForm.type,
          platform: createForm.platform || undefined,
          category: createForm.category || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "创建模板失败");
      }
      setCreateOpen(false);
      setCreateForm({ name: "", type: "bundle", platform: "", category: "" });
      fetchTemplates();
    } catch (e) {
      setCreateError(String(e));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">模板中心</h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理图包、品牌与平台模板，快速复用历史配置
          </p>
        </div>
        <Button onClick={() => { setCreateOpen(true); setCreateError(""); }}>
          创建模板
        </Button>
      </div>

      {createOpen && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>创建模板</CardTitle>
              <button
                onClick={() => setCreateOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                取消
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">模板名称</label>
                  <Input
                    placeholder="输入模板名称"
                    value={createForm.name}
                    onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">类型</label>
                  <Select
                    value={createForm.type}
                    onChange={(e) => setCreateForm((f) => ({ ...f, type: e.target.value }))}
                  >
                    <option value="bundle">图包模板</option>
                    <option value="brand">品牌模板</option>
                    <option value="platform">平台模板</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">平台</label>
                  <Input
                    placeholder="如 TAOBAO_TMALL"
                    value={createForm.platform}
                    onChange={(e) => setCreateForm((f) => ({ ...f, platform: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">品类</label>
                  <Input
                    placeholder="如 服饰/数码"
                    value={createForm.category}
                    onChange={(e) => setCreateForm((f) => ({ ...f, category: e.target.value }))}
                  />
                </div>
              </div>
              {createError && <p className="text-sm text-destructive">{createError}</p>}
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  取消
                </Button>
                <Button type="submit" loading={creating}>
                  创建
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-3">
        <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-36">
          <option value="">全部类型</option>
          <option value="bundle">图包模板</option>
          <option value="brand">品牌模板</option>
          <option value="platform">平台模板</option>
        </Select>
        <Input
          placeholder="平台筛选"
          value={filterPlatform}
          onChange={(e) => setFilterPlatform(e.target.value)}
          className="w-40"
        />
        <Input
          placeholder="品类筛选"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="w-40"
        />
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : templates.length === 0 ? (
        <EmptyState
          title="暂无模板"
          description="创建模板以复用历史图包配置"
          action={<Button onClick={() => { setCreateOpen(true); setCreateError(""); }}>创建模板</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tpl) => (
            <Card key={tpl.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge variant={TYPE_BADGE_VARIANT[tpl.type] || "secondary"}>
                    {TYPE_LABELS[tpl.type] || tpl.type}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    使用 {tpl.usageCount} 次
                  </span>
                </div>
                <CardTitle className="text-base mt-2">{tpl.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                  {tpl.platform && <span>平台: {tpl.platform}</span>}
                  {tpl.category && <span>品类: {tpl.category}</span>}
                </div>
                <Link href={`/templates/${tpl.id}`}>
                  <Button variant="outline" size="sm">查看详情</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

interface TemplateVersion {
  version: number;
  changelog: string;
  createdAt: string;
}

interface TemplateDetail {
  id: string;
  name: string;
  type: string;
  platform: string | null;
  category: string | null;
  visibility: string;
  usageCount: number;
  sourceProjectId: string | null;
  structureSnapshot: Record<string, unknown>;
  versions: TemplateVersion[];
  createdAt: string;
  updatedAt: string;
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

const VISIBILITY_LABELS: Record<string, string> = {
  private: "私有",
  workspace: "工作空间",
  public: "公开",
};

export default function TemplateDetailPage() {
  const params = useParams<{ id: string }>();
  const templateId = params.id;

  const [template, setTemplate] = useState<TemplateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [applyProjectId, setApplyProjectId] = useState("");
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState("");

  const [editName, setEditName] = useState("");
  const [editChangelog, setEditChangelog] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [sharing, setSharing] = useState(false);

  const fetchTemplate = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/templates/${templateId}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "加载模板失败");
      }
      const data: TemplateDetail = await res.json();
      setTemplate(data);
      setEditName(data.name);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  useEffect(() => {
    fetchTemplate();
  }, [fetchTemplate]);

  async function handleApply() {
    if (!applyProjectId.trim()) {
      setApplyError("请输入项目 ID");
      return;
    }
    setApplying(true);
    setApplyError("");
    try {
      const res = await fetch(`/api/templates/${templateId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: applyProjectId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "应用失败");
      }
      setApplyProjectId("");
      fetchTemplate();
    } catch (e) {
      setApplyError(String(e));
    } finally {
      setApplying(false);
    }
  }

  async function handleSave() {
    if (!editName.trim()) {
      setSaveError("模板名称不能为空");
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch(`/api/templates/${templateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          changelog: editChangelog || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "保存失败");
      }
      setEditChangelog("");
      fetchTemplate();
    } catch (e) {
      setSaveError(String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleShare() {
    setSharing(true);
    try {
      const res = await fetch(`/api/templates/${templateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: "workspace" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "分享失败");
      }
      fetchTemplate();
    } catch (e) {
      setError(String(e));
    } finally {
      setSharing(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-48" />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="space-y-6">
        <Link href="/templates" className="text-sm text-muted-foreground hover:text-primary transition-colors">
          ← 返回模板中心
        </Link>
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
          {error || "模板不存在"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground/70">
        <Link href="/templates" className="hover:text-primary transition-colors">
          模板中心
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{template.name}</span>
      </nav>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{template.name}</h1>
          <Badge variant={TYPE_BADGE_VARIANT[template.type] || "secondary"}>
            {TYPE_LABELS[template.type] || template.type}
          </Badge>
          <Badge variant="outline">{VISIBILITY_LABELS[template.visibility] || template.visibility}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {template.visibility === "private" && (
            <Button variant="outline" loading={sharing} onClick={handleShare}>
              分享
            </Button>
          )}
          <Link href="/templates">
            <Button variant="ghost">返回列表</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">平台</span>
              <p className="font-medium text-foreground mt-0.5">{template.platform || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">品类</span>
              <p className="font-medium text-foreground mt-0.5">{template.category || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">使用次数</span>
              <p className="font-medium text-foreground mt-0.5">{template.usageCount}</p>
            </div>
            <div>
              <span className="text-muted-foreground">来源项目</span>
              <p className="font-medium text-foreground mt-0.5">
                {template.sourceProjectId ? (
                  <Link href={`/projects/${template.sourceProjectId}`} className="text-primary hover:underline">
                    {template.sourceProjectId.slice(0, 8)}...
                  </Link>
                ) : "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>结构快照</CardTitle>
          <CardDescription>模板保存时的图包结构数据</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-secondary rounded-lg p-4 text-xs text-foreground overflow-x-auto max-h-80">
            {JSON.stringify(template.structureSnapshot, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>版本历史</CardTitle>
        </CardHeader>
        <CardContent>
          {template.versions.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无版本记录</p>
          ) : (
            <div className="space-y-3">
              {template.versions.map((v) => (
                <div key={v.version} className="flex items-start gap-3 p-3 bg-secondary rounded-lg">
                  <Badge variant="outline" size="sm">v{v.version}</Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{v.changelog || "无变更说明"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(v.createdAt).toLocaleString("zh-CN")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>应用到项目</CardTitle>
            <CardDescription>将此模板的结构应用到指定项目</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Input
                placeholder="输入项目 ID"
                value={applyProjectId}
                onChange={(e) => setApplyProjectId(e.target.value)}
              />
              {applyError && <p className="text-sm text-destructive">{applyError}</p>}
              <Button loading={applying} onClick={handleApply}>
                应用
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>编辑模板</CardTitle>
            <CardDescription>修改模板名称并保存为新版本</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">模板名称</label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">变更说明</label>
                <Textarea
                  placeholder="描述本次修改内容..."
                  value={editChangelog}
                  onChange={(e) => setEditChangelog(e.target.value)}
                  rows={2}
                />
              </div>
              {saveError && <p className="text-sm text-destructive">{saveError}</p>}
              <Button loading={saving} onClick={handleSave}>
                保存
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

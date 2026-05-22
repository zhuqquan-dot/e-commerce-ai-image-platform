"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SkeletonRow } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
  status: "active" | "disabled";
  rateLimit: number;
  lastUsedAt: string | null;
  createdAt: string;
}

export default function ApiKeysPage() {
  const params = useParams<{ id: string }>();
  const workspaceId = params.id;

  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createRateLimit, setCreateRateLimit] = useState("100");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/api-keys`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "加载 API Key 失败");
      }
      const data = await res.json();
      setKeys(data.list || data || []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createName.trim()) {
      setCreateError("请输入 Key 名称");
      return;
    }
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createName,
          rateLimit: Number(createRateLimit) || 100,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "创建失败");
      }
      const data = await res.json();
      setNewlyCreatedKey(data.key || data.fullKey || "");
      setCreateOpen(false);
      setCreateName("");
      setCreateRateLimit("100");
      fetchKeys();
    } catch (e) {
      setCreateError(String(e));
    } finally {
      setCreating(false);
    }
  }

  async function handleDisable(keyId: string) {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/api-keys/${keyId}/disable`, {
        method: "PUT",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "禁用失败");
      }
      setKeys((prev) =>
        prev.map((k) => (k.id === keyId ? { ...k, status: "disabled" as const } : k)),
      );
    } catch (e) {
      setError(String(e));
    }
  }

  async function handleDelete(keyId: string) {
    if (!confirm("确认删除此 API Key？删除后不可恢复。")) return;
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/api-keys/${keyId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "删除失败");
      }
      setKeys((prev) => prev.filter((k) => k.id !== keyId));
    } catch (e) {
      setError(String(e));
    }
  }

  function handleCopyKey() {
    if (!newlyCreatedKey) return;
    navigator.clipboard.writeText(newlyCreatedKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("zh-CN");
  }

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground/70">
        <Link href={`/workspaces/${workspaceId}`} className="hover:text-primary transition-colors">
          工作空间
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">API 管理</span>
      </nav>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">API 管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理工作空间的 API Key，控制接口访问权限与频率
          </p>
        </div>
        <Button onClick={() => { setCreateOpen(true); setCreateError(""); }}>
          创建 API Key
        </Button>
      </div>

      {createOpen && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>创建 API Key</CardTitle>
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
                  <label className="block text-sm font-medium text-foreground mb-1">Key 名称</label>
                  <Input
                    placeholder="如: 生产环境"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">频率限制 (次/分钟)</label>
                  <Input
                    type="number"
                    placeholder="100"
                    value={createRateLimit}
                    onChange={(e) => setCreateRateLimit(e.target.value)}
                  />
                </div>
              </div>
              {createError && <p className="text-sm text-destructive">{createError}</p>}
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  取消
                </Button>
                <Button type="submit" loading={creating}>创建</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {newlyCreatedKey && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle>API Key 已创建</CardTitle>
            <CardDescription>请立即复制保存，此密钥仅显示一次</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <code className="flex-1 bg-card border border-border rounded-lg px-4 py-2 text-sm font-mono text-foreground break-all">
                {newlyCreatedKey}
              </code>
              <Button variant="outline" onClick={handleCopyKey}>
                {copied ? "已复制" : "复制"}
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3"
              onClick={() => setNewlyCreatedKey(null)}
            >
              关闭
            </Button>
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>API Key 列表</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="divide-y divide-border">
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </div>
          ) : keys.length === 0 ? (
            <EmptyState
              title="暂无 API Key"
              description="创建 API Key 以通过接口访问工作空间资源"
              action={
                <Button onClick={() => { setCreateOpen(true); setCreateError(""); }}>
                  创建 API Key
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">名称</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Key 前缀</th>
                    <th className="text-center text-xs font-medium text-muted-foreground px-6 py-3">状态</th>
                    <th className="text-center text-xs font-medium text-muted-foreground px-6 py-3">频率限制</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">最后使用</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">创建时间</th>
                    <th className="text-right text-xs font-medium text-muted-foreground px-6 py-3">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {keys.map((key) => (
                    <tr key={key.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-3">
                        <p className="text-sm font-medium text-foreground">{key.name}</p>
                      </td>
                      <td className="px-6 py-3">
                        <code className="text-xs text-muted-foreground font-mono">{key.keyPrefix}••••••</code>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <Badge variant={key.status === "active" ? "success" : "secondary"}>
                          {key.status === "active" ? "启用" : "禁用"}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-center text-sm text-muted-foreground">
                        {key.rateLimit}/min
                      </td>
                      <td className="px-6 py-3 text-sm text-muted-foreground">
                        {formatDate(key.lastUsedAt)}
                      </td>
                      <td className="px-6 py-3 text-sm text-muted-foreground">
                        {formatDate(key.createdAt)}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {key.status === "active" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDisable(key.id)}
                            >
                              禁用
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(key.id)}
                          >
                            删除
                          </Button>
                        </div>
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

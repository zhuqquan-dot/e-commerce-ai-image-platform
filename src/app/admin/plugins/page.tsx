"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";

interface PluginItem {
  id: string;
  name: string;
  description: string;
  status: "active" | "inactive" | "error";
  version: string;
  entryRoute: string;
  lifecycleHooks: string[];
  requiredPermissions: string[];
  lastExecutedAt: string | null;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "success" | "secondary" | "destructive" }> = {
  active: { label: "已启用", variant: "success" },
  inactive: { label: "未启用", variant: "secondary" },
  error: { label: "异常", variant: "destructive" },
};

export default function AdminPluginsPage() {
  const { toast } = useToast();
  const [plugins, setPlugins] = useState<PluginItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    entryRoute: "",
    version: "",
    lifecycleHooks: [] as string[],
    requiredPermissions: "",
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchPlugins = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/plugins");
      const data = await res.json();
      if (data.list) {
        setPlugins(data.list);
      }
    } catch {
      toast("加载插件列表失败", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlugins();
  }, [fetchPlugins]);

  const resetForm = () => {
    setForm({ name: "", description: "", entryRoute: "", version: "", lifecycleHooks: [], requiredPermissions: "" });
    setShowRegister(false);
  };

  const handleRegister = async () => {
    if (!form.name.trim() || !form.entryRoute.trim()) {
      toast("名称和入口路由为必填项", "error");
      return;
    }
    try {
      const res = await fetch("/api/admin/plugins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim(),
          entryRoute: form.entryRoute.trim(),
          version: form.version.trim() || "1.0.0",
          lifecycleHooks: form.lifecycleHooks,
          requiredPermissions: form.requiredPermissions
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast(err.error || "注册失败", "error");
        return;
      }
      toast("插件注册成功", "success");
      resetForm();
      await fetchPlugins();
    } catch {
      toast("注册插件失败", "error");
    }
  };

  const handleEnable = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/plugins/${id}/enable`, { method: "PUT" });
      if (!res.ok) {
        const err = await res.json();
        toast(err.error || "启用失败", "error");
        return;
      }
      toast("插件已启用", "success");
      await fetchPlugins();
    } catch {
      toast("启用插件失败", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDisable = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/plugins/${id}/disable`, { method: "PUT" });
      if (!res.ok) {
        const err = await res.json();
        toast(err.error || "禁用失败", "error");
        return;
      }
      toast("插件已禁用", "success");
      await fetchPlugins();
    } catch {
      toast("禁用插件失败", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUninstall = async (id: string) => {
    if (!confirm("确定要卸载此插件吗？此操作不可恢复。")) return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/plugins/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        toast(err.error || "卸载失败", "error");
        return;
      }
      toast("插件已卸载", "success");
      await fetchPlugins();
    } catch {
      toast("卸载插件失败", "error");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">插件管理</h1>
          <Button
            variant="primary"
            onClick={() => {
              resetForm();
              setShowRegister(true);
            }}
          >
            + 注册插件
          </Button>
        </div>

        {showRegister && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">注册插件</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                      名称 *
                    </label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="例如: watermark-plugin"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                      入口路由 *
                    </label>
                    <Input
                      value={form.entryRoute}
                      onChange={(e) => setForm({ ...form, entryRoute: e.target.value })}
                      placeholder="例如: /plugins/watermark"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                      描述
                    </label>
                    <Input
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="插件功能描述"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                      版本
                    </label>
                    <Input
                      value={form.version}
                      onChange={(e) => setForm({ ...form, version: e.target.value })}
                      placeholder="例如: 1.0.0"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                    生命周期钩子
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {["export:before", "export:after", "generation:after", "review:after"].map((hook) => (
                      <label key={hook} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.lifecycleHooks.includes(hook)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setForm({ ...form, lifecycleHooks: [...form.lifecycleHooks, hook] });
                            } else {
                              setForm({ ...form, lifecycleHooks: form.lifecycleHooks.filter((h) => h !== hook) });
                            }
                          }}
                          className="rounded border-border"
                        />
                        <span className="text-sm text-foreground font-mono">{hook}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                    所需权限
                  </label>
                  <Input
                    value={form.requiredPermissions}
                    onChange={(e) => setForm({ ...form, requiredPermissions: e.target.value })}
                    placeholder="逗号分隔，例如: project:read, export:read"
                  />
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <Button variant="primary" onClick={handleRegister}>
                    注册
                  </Button>
                  <Button variant="ghost" onClick={resetForm}>
                    取消
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : plugins.length === 0 ? (
          <EmptyState
            title="暂无插件"
            description="点击上方按钮注册新插件"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plugins.map((plugin) => {
              const statusConf = STATUS_CONFIG[plugin.status] || STATUS_CONFIG.inactive;
              return (
                <Card key={plugin.id}>
                  <CardContent className="pt-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-base font-semibold text-foreground truncate">
                            {plugin.name}
                          </h3>
                          <Badge variant={statusConf.variant} size="sm">
                            {statusConf.label}
                          </Badge>
                          <Badge variant="outline" size="sm">
                            v{plugin.version}
                          </Badge>
                        </div>
                        {plugin.description && (
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                            {plugin.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0 w-20">
                          入口路由
                        </span>
                        <code className="text-xs text-foreground bg-secondary px-2 py-0.5 rounded font-mono">
                          {plugin.entryRoute}
                        </code>
                      </div>

                      {plugin.lifecycleHooks.length > 0 && (
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0 w-20 pt-0.5">
                            生命周期
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {plugin.lifecycleHooks.map((hook) => (
                              <Badge key={hook} variant="secondary" size="sm">
                                {hook}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {plugin.requiredPermissions.length > 0 && (
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0 w-20 pt-0.5">
                            权限要求
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {plugin.requiredPermissions.map((perm) => (
                              <Badge key={perm} variant="accent" size="sm">
                                {perm}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {plugin.lastExecutedAt && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0 w-20">
                            最后执行
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(plugin.lastExecutedAt).toLocaleString("zh-CN")}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
                      {plugin.status === "inactive" && (
                        <Button
                          variant="primary"
                          size="sm"
                          loading={actionLoading === plugin.id}
                          onClick={() => handleEnable(plugin.id)}
                        >
                          启用
                        </Button>
                      )}
                      {plugin.status === "active" && (
                        <Button
                          variant="outline"
                          size="sm"
                          loading={actionLoading === plugin.id}
                          onClick={() => handleDisable(plugin.id)}
                        >
                          禁用
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive/80"
                        loading={actionLoading === plugin.id}
                        onClick={() => handleUninstall(plugin.id)}
                      >
                        卸载
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

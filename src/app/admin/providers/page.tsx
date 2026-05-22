"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface ProviderItem {
  id: string;
  name: string;
  type: string;
  apiKey: string;
  baseURL: string | null;
  priority: number;
  isActive: boolean;
  config: string | null;
  createdAt: string;
  updatedAt: string;
}

const TYPE_OPTIONS = [
  { value: "openai", label: "openai" },
  { value: "apimart", label: "apimart" },
];

export default function AdminProvidersPage() {
  const { toast } = useToast();
  const [providers, setProviders] = useState<ProviderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { available: boolean; latency: number | null }>>({});

  const [form, setForm] = useState({
    name: "",
    type: "openai",
    apiKey: "",
    baseURL: "",
    priority: 1,
    isActive: false,
  });

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/providers");
      const data = await res.json();
      if (data.list) {
        setProviders(data.list);
      }
    } catch {
      toast("加载Provider列表失败", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProviders();
  }, [fetchProviders]);

  const resetForm = () => {
    setForm({ name: "", type: "openai", apiKey: "", baseURL: "", priority: 1, isActive: false });
    setEditingId(null);
    setShowCreate(false);
  };

  const handleCreate = async () => {
    if (!form.name || !form.apiKey) {
      toast("名称和API Key为必填项", "error");
      return;
    }
    try {
      const res = await fetch("/api/admin/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          apiKey: form.apiKey,
          baseURL: form.baseURL || null,
          priority: form.priority,
          isActive: form.isActive,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast(err.error || "创建失败", "error");
        return;
      }
      toast("Provider创建成功", "success");
      resetForm();
      await fetchProviders();
    } catch {
      toast("创建Provider失败", "error");
    }
  };

  const handleEdit = (provider: ProviderItem) => {
    setEditingId(provider.id);
    setShowCreate(false);
    setForm({
      name: provider.name,
      type: provider.type,
      apiKey: "",
      baseURL: provider.baseURL || "",
      priority: provider.priority,
      isActive: provider.isActive,
    });
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    if (!form.name) {
      toast("名称为必填项", "error");
      return;
    }
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        type: form.type,
        priority: form.priority,
        isActive: form.isActive,
        baseURL: form.baseURL || null,
      };
      if (form.apiKey) {
        body.apiKey = form.apiKey;
      }
      const res = await fetch(`/api/admin/providers/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        toast(err.error || "更新失败", "error");
        return;
      }
      toast("Provider更新成功", "success");
      resetForm();
      await fetchProviders();
    } catch {
      toast("更新Provider失败", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除此Provider吗？")) return;
    try {
      const res = await fetch(`/api/admin/providers/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        toast(err.error || "删除失败", "error");
        return;
      }
      toast("Provider已删除", "success");
      await fetchProviders();
    } catch {
      toast("删除Provider失败", "error");
    }
  };

  const handleToggleActive = async (ids: string[]) => {
    try {
      const res = await fetch("/api/admin/providers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeIds: ids }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast(err.error || "切换失败", "error");
        return;
      }
      const data = await res.json();
      setProviders(data.list);
    } catch {
      toast("切换激活状态失败", "error");
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const res = await fetch(`/api/admin/providers/${id}?action=test`, { method: "POST" });
      const data = await res.json();
      setTestResult((prev) => ({
        ...prev,
        [id]: { available: data.available, latency: data.latency },
      }));
      if (data.available) {
        toast(`连接成功 (${data.latency}ms)`, "success");
      } else {
        toast("连接失败", "error");
      }
    } catch {
      toast("测试请求失败", "error");
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Provider 管理</h1>
          <Button
            variant="primary"
            onClick={() => {
              resetForm();
              setShowCreate(true);
            }}
          >
            + 新增 Provider
          </Button>
        </div>

        {showCreate && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">新增 Provider</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ProviderForm
                form={form}
                setForm={setForm}
                onSubmit={handleCreate}
                onCancel={resetForm}
                submitLabel="创建"
              />
            </CardContent>
          </Card>
        )}

        {editingId && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">编辑 Provider</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ProviderForm
                form={form}
                setForm={setForm}
                onSubmit={handleUpdate}
                onCancel={resetForm}
                submitLabel="保存"
              />
            </CardContent>
          </Card>
        )}

        <Card>
          <table className="w-full">
            <thead className="bg-secondary border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">名称</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">类型</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">API Endpoint</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">状态</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">优先级</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    加载中...
                  </td>
                </tr>
              ) : providers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    暂无 Provider 配置，点击上方按钮新增
                  </td>
                </tr>
              ) : (
                providers.map((p) => (
                  <tr key={p.id} className="border-b border-border hover:bg-secondary transition-colors">
                    <td className="px-4 py-3 text-sm text-foreground font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-sm">
                      <Badge variant="secondary">{p.type}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground/70 font-mono">{p.apiKey}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={p.isActive ? "success" : "outline"}
                        size="md"
                        className="cursor-pointer select-none"
                        onClick={() => handleToggleActive(p.isActive ? [] : [p.id])}
                      >
                        {p.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{p.priority}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button variant="link" size="sm" onClick={() => handleEdit(p)}>
                          编辑
                        </Button>
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => handleTest(p.id)}
                          disabled={testingId === p.id}
                          loading={testingId === p.id}
                        >
                          测试连接
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive/80"
                          onClick={() => handleDelete(p.id)}
                        >
                          删除
                        </Button>
                      </div>
                      {testResult[p.id] !== undefined && (
                        <div
                          className={`mt-1 text-xs ${
                            testResult[p.id].available ? "text-emerald-600" : "text-destructive"
                          }`}
                        >
                          {testResult[p.id].available
                            ? `连接正常 (${testResult[p.id].latency}ms)`
                            : "连接失败"}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

function ProviderForm({
  form,
  setForm,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  form: { name: string; type: string; apiKey: string; baseURL: string; priority: number; isActive: boolean };
  setForm: React.Dispatch<React.SetStateAction<typeof form>>;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
            名称 *
          </label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="例如: OpenAI 官方"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
            类型
          </label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="w-full h-9 bg-card border border-border rounded-lg px-3 text-sm text-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-colors"
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
            API Key {submitLabel === "创建" ? "*" : "(留空则不修改)"}
          </label>
          <Input
            type="password"
            value={form.apiKey}
            onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
            placeholder="sk-..."
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
            Base URL (可选)
          </label>
          <Input
            value={form.baseURL}
            onChange={(e) => setForm({ ...form, baseURL: e.target.value })}
            placeholder="https://api.openai.com/v1"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
            优先级
          </label>
          <Input
            type="number"
            min={1}
            value={String(form.priority)}
            onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 1 })}
          />
        </div>
        <div className="flex items-center pt-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="w-4 h-4 accent-primary rounded focus:ring-primary/20 border-border bg-card"
            />
            <span className="text-sm text-muted-foreground">激活</span>
          </label>
        </div>
      </div>
      <div className="flex items-center gap-3 pt-2">
        <Button variant="primary" onClick={onSubmit}>
          {submitLabel}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          取消
        </Button>
      </div>
    </div>
  );
}

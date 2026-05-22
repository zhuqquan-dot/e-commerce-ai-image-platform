"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface ChannelPartner {
  id: string;
  name: string;
  level: number;
  discountRate: number;
  status: string;
  contactInfo: string | null;
  _count?: { workspaces: number };
  createdAt: string;
  updatedAt: string;
}

const LEVEL_LABELS: Record<number, string> = {
  1: "普通",
  2: "银牌",
  3: "金牌",
  4: "铂金",
  5: "钻石",
};

const STATUS_LABELS: Record<string, string> = {
  active: "活跃",
  suspended: "暂停",
  terminated: "终止",
};

export default function AdminChannelPage() {
  const { toast } = useToast();
  const [channels, setChannels] = useState<ChannelPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "",
    level: 1,
    discountRate: 1.0,
    status: "active",
    contactInfo: "",
  });

  const fetchChannels = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/channels");
      const data = await res.json();
      if (data.list) {
        setChannels(data.list);
      }
    } catch {
      toast("加载渠道列表失败", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  const resetForm = () => {
    setForm({ name: "", level: 1, discountRate: 1.0, status: "active", contactInfo: "" });
    setShowCreate(false);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast("渠道名称为必填项", "error");
      return;
    }
    try {
      const res = await fetch("/api/admin/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          level: form.level,
          discountRate: form.discountRate,
          status: form.status,
          contactInfo: form.contactInfo.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast(err.error || "创建失败", "error");
        return;
      }
      toast("渠道创建成功", "success");
      resetForm();
      await fetchChannels();
    } catch {
      toast("创建渠道失败", "error");
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">渠道管理</h1>
          <Button
            variant="primary"
            onClick={() => {
              resetForm();
              setShowCreate(true);
            }}
          >
            + 添加渠道
          </Button>
        </div>

        {showCreate && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">添加渠道</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                      渠道名称 *
                    </label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="例如: 华东代理"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                      等级
                    </label>
                    <select
                      value={form.level}
                      onChange={(e) => setForm({ ...form, level: parseInt(e.target.value) })}
                      className="w-full h-9 bg-card border border-border rounded-lg px-3 text-sm text-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-colors"
                    >
                      {Object.entries(LEVEL_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                      折扣率
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={String(form.discountRate)}
                      onChange={(e) => setForm({ ...form, discountRate: parseFloat(e.target.value) || 1.0 })}
                      placeholder="0.85 = 85折"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                      状态
                    </label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className="w-full h-9 bg-card border border-border rounded-lg px-3 text-sm text-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-colors"
                    >
                      <option value="active">活跃</option>
                      <option value="suspended">暂停</option>
                      <option value="terminated">终止</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                      联系方式
                    </label>
                    <Input
                      value={form.contactInfo}
                      onChange={(e) => setForm({ ...form, contactInfo: e.target.value })}
                      placeholder="联系人电话或邮箱"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <Button variant="primary" onClick={handleCreate}>
                    创建
                  </Button>
                  <Button variant="ghost" onClick={resetForm}>
                    取消
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <table className="w-full">
            <thead className="bg-secondary border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">渠道名称</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">等级</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">折扣率</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">状态</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">关联工作空间</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    加载中...
                  </td>
                </tr>
              ) : channels.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    暂无渠道数据，点击上方按钮添加
                  </td>
                </tr>
              ) : (
                channels.map((ch) => (
                  <tr key={ch.id} className="border-b border-border hover:bg-secondary transition-colors">
                    <td className="px-4 py-3 text-sm text-foreground font-medium">{ch.name}</td>
                    <td className="px-4 py-3 text-sm">
                      <Badge variant={ch.level >= 4 ? "primary" : ch.level >= 3 ? "accent" : "secondary"}>
                        {LEVEL_LABELS[ch.level] || `L${ch.level}`}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {(ch.discountRate * 100).toFixed(0)}%
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={ch.status === "active" ? "success" : ch.status === "suspended" ? "warning" : "outline"}>
                        {STATUS_LABELS[ch.status] || ch.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {ch._count?.workspaces ?? 0}
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

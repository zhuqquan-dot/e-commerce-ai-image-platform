"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

interface WorkspaceDetail {
  id: string;
  name: string;
  type: string;
  owner: { id: string; name: string; email: string | null };
  role: string;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  owner: "拥有者",
  admin: "管理员",
  operator: "操作员",
  reviewer: "审核员",
  viewer: "观察者",
  client_viewer: "客户",
};

export default function WorkspaceSettingsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editName, setEditName] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchWorkspace = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/workspaces/${id}`);
      if (!res.ok) {
        if (res.status === 401) throw new Error("请先登录");
        if (res.status === 403) throw new Error("无权访问该工作空间");
        if (res.status === 404) throw new Error("工作空间不存在");
        throw new Error("加载失败");
      }
      const data: WorkspaceDetail = await res.json();
      setWorkspace(data);
      setEditName(data.name);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchWorkspace();
  }, [fetchWorkspace]);

  const handleSaveName = async () => {
    const trimmed = editName.trim();
    if (!trimmed || !workspace || trimmed === workspace.name) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/workspaces/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "保存失败");
      }
      const updated = await res.json();
      setWorkspace((prev) => prev ? { ...prev, name: updated.name, updatedAt: updated.updatedAt } : prev);
      setEditing(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const isOwnerOrAdmin = workspace?.role === "owner" || workspace?.role === "admin";

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-1/4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm mb-4">
          {error}
        </div>
        <Button variant="ghost" size="sm" onClick={() => router.push("/workspaces")}>
          ← 返回工作空间列表
        </Button>
      </div>
    );
  }

  if (!workspace) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/workspaces" className="hover:text-foreground transition-colors">
          工作空间
        </Link>
        <span>/</span>
        <span className="text-foreground">设置</span>
      </div>

      <h1 className="text-2xl font-bold text-foreground">{workspace.name} - 设置</h1>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
          {error}
          <button className="ml-2 underline" onClick={() => setError("")}>×</button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
          <CardDescription>工作空间的核心信息与名称管理</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">工作空间名称</label>
            {editing ? (
              <div className="flex gap-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                    if (e.key === "Escape") setEditing(false);
                  }}
                  disabled={saving}
                  autoFocus
                />
                <Button variant="primary" size="sm" onClick={handleSaveName} loading={saving} disabled={!editName.trim()}>
                  保存
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setEditName(workspace.name); }}>
                  取消
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{workspace.name}</span>
                {isOwnerOrAdmin && (
                  <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                    编辑
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">拥有者</label>
            <p className="text-muted-foreground">{workspace.owner.name || workspace.owner.email || workspace.owner.id}</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">我的角色</label>
            <p>
              <Badge variant={workspace.role === "owner" ? "primary" : "outline"}>
                {ROLE_LABELS[workspace.role] || workspace.role}
              </Badge>
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">成员数量</label>
            <p className="text-muted-foreground">{workspace.memberCount} 位成员</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">创建时间</label>
            <p className="text-muted-foreground text-sm">
              {new Date(workspace.createdAt).toLocaleDateString("zh-CN", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>管理</CardTitle>
          <CardDescription>成员、订阅与工作空间管理</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link href={`/workspaces/${id}/members`}>
            <Button variant="outline" size="sm">
              成员管理
            </Button>
          </Link>
          <Link href={`/workspaces/${id}/billing`}>
            <Button variant="outline" size="sm">
              订阅与计费
            </Button>
          </Link>
          <Link href={`/workspaces/${id}/subscription`}>
            <Button variant="outline" size="sm">
              订阅管理
            </Button>
          </Link>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Link href="/workspaces">
          <Button variant="ghost" size="sm">
            ← 返回工作空间列表
          </Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="outline" size="sm">
            前往工作台
          </Button>
        </Link>
      </div>
    </div>
  );
}

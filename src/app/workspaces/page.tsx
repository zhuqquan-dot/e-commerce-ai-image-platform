"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";

interface WorkspaceItem {
  id: string;
  name: string;
  role: string;
  memberCount: number;
}

const ROLE_LABELS: Record<string, string> = {
  owner: "拥有者",
  admin: "管理员",
  operator: "操作员",
  reviewer: "审核员",
  viewer: "观察者",
  client_viewer: "客户",
};

const ROLE_VARIANTS: Record<string, "primary" | "accent" | "secondary" | "success" | "warning" | "outline"> = {
  owner: "primary",
  admin: "accent",
  operator: "secondary",
  reviewer: "success",
  viewer: "outline",
  client_viewer: "warning",
};

export default function WorkspacesPage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const fetchWorkspaces = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/workspaces");
      if (!res.ok) {
        if (res.status === 401) throw new Error("请先登录");
        throw new Error("加载工作空间失败");
      }
      const list: WorkspaceItem[] = await res.json();
      setWorkspaces(list);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const handleCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "创建失败");
      }
      setNewName("");
      setShowCreate(false);
      await fetchWorkspaces();
    } catch (e) {
      setError(String(e));
    } finally {
      setCreating(false);
    }
  };

  const handleSwitch = async (ws: WorkspaceItem) => {
    setSwitchingId(ws.id);
    try {
      const res = await fetch(`/api/workspaces/${ws.id}/switch`, { method: "POST" });
      if (!res.ok) throw new Error("切换失败");
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError(String(e));
      setSwitchingId(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">工作空间</h1>
          <p className="text-sm text-muted-foreground mt-1">管理您的工作空间与团队</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowCreate(true)} disabled={creating}>
          + 创建工作空间
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
          {error}
          <button className="ml-2 underline" onClick={() => setError("")}>×</button>
        </div>
      )}

      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle>创建新工作空间</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="输入工作空间名称"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              disabled={creating}
              autoFocus
            />
            <div className="flex gap-2">
              <Button variant="primary" size="sm" onClick={handleCreate} loading={creating} disabled={!newName.trim()}>
                创建
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setShowCreate(false); setNewName(""); }}>
                取消
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5 space-y-2">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-4 w-1/5" />
                <Skeleton className="h-4 w-1/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : workspaces.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-4xl mb-3">🏢</div>
            <h3 className="text-base font-semibold text-foreground mb-1">暂无工作空间</h3>
            <p className="text-sm text-muted-foreground mb-4">创建您的工作空间以开始协作</p>
            <Button variant="primary" size="md" onClick={() => setShowCreate(true)}>
              + 创建工作空间
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {workspaces.map((ws) => (
            <Card
              key={ws.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleSwitch(ws)}
            >
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-primary font-bold text-lg">{ws.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-foreground truncate">{ws.name}</h3>
                      {switchingId === ws.id && <Spinner size="sm" />}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <Badge variant={ROLE_VARIANTS[ws.role] || "outline"}>{ROLE_LABELS[ws.role] || ws.role}</Badge>
                      <span>{ws.memberCount} 位成员</span>
                    </div>
                  </div>
                </div>
                <div className="text-muted-foreground/50 shrink-0 ml-4">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonRow } from "@/components/ui/skeleton";

const ROLE_LABELS: Record<string, string> = {
  owner: "拥有者",
  admin: "管理员",
  operator: "运营",
  reviewer: "审核员",
  viewer: "观察者",
  client_viewer: "客户",
};

const ROLE_BADGE_VARIANT: Record<string, "primary" | "accent" | "secondary" | "warning" | "outline"> = {
  owner: "primary",
  admin: "accent",
  operator: "secondary",
  reviewer: "warning",
  viewer: "outline",
  client_viewer: "outline",
};

const ROLE_OPTIONS = [
  { value: "admin", label: "管理员" },
  { value: "operator", label: "运营" },
  { value: "reviewer", label: "审核员" },
  { value: "viewer", label: "观察者" },
  { value: "client_viewer", label: "客户" },
];

interface MemberItem {
  id: string;
  userId: string;
  role: string;
  status: string;
  invitedBy: string | null;
  joinedAt: string | null;
  name: string;
  phone: string | null;
  email: string | null;
}

export default function WorkspaceMembersPage() {
  const params = useParams<{ id: string }>();
  const workspaceId = params.id;

  const [members, setMembers] = useState<MemberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentRole, setCurrentRole] = useState<string>("");

  const [inviteOpen, setInviteOpen] = useState(false);
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("operator");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const isOwner = currentRole === "owner";
  const isOwnerOrAdmin = currentRole === "owner" || currentRole === "admin";

  const fetchMembers = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "获取成员列表失败");
        return;
      }
      const data = await res.json();
      setMembers(data.list || []);
    } catch {
      setError("网络错误，无法获取成员列表");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setCurrentRole(data.role || "");
      }
    } catch {
      // session not available, use fallback
    }
  }, []);

  useEffect(() => {
    fetchSession().then(() => fetchMembers());
  }, [fetchSession, fetchMembers]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!invitePhone && !inviteEmail) {
      setInviteError("请填写手机号或邮箱");
      return;
    }

    setInviteLoading(true);
    setInviteError(null);

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: invitePhone || undefined,
          email: inviteEmail || undefined,
          role: inviteRole,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setInviteError(data.error || "邀请失败");
        return;
      }

      setInviteOpen(false);
      setInvitePhone("");
      setInviteEmail("");
      setInviteRole("operator");
      fetchMembers();
    } catch {
      setInviteError("网络错误，请重试");
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleRoleChange(memberId: string, newRole: string) {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members/${memberId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "修改角色失败");
        return;
      }

      fetchMembers();
    } catch {
      alert("网络错误，请重试");
    }
  }

  async function handleRemove(memberId: string) {
    if (!confirm("确认移除该成员？")) return;

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members/${memberId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "移除成员失败");
        return;
      }

      fetchMembers();
    } catch {
      alert("网络错误，请重试");
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "待加入";
    return new Date(dateStr).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">成员管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {members.length} 位成员
          </p>
        </div>
        {isOwnerOrAdmin && (
          <Button
            onClick={() => {
              setInviteOpen(true);
              setInviteError(null);
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
            邀请成员
          </Button>
        )}
      </div>

      {inviteOpen && (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">邀请新成员</h3>
                <button
                  type="button"
                  onClick={() => setInviteOpen(false)}
                  className="text-muted-foreground hover:text-foreground text-sm"
                >
                  取消
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">手机号</label>
                  <Input
                    placeholder="13800138000"
                    value={invitePhone}
                    onChange={(e) => setInvitePhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">邮箱</label>
                  <Input
                    placeholder="user@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">角色</label>
                  <Select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                    {ROLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </Select>
                </div>
              </div>

              {inviteError && (
                <p className="text-sm text-destructive">{inviteError}</p>
              )}

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                  取消
                </Button>
                <Button type="submit" loading={inviteLoading}>
                  发送邀请
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>成员列表</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="divide-y divide-border">
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" className="mt-3" onClick={fetchMembers}>
                重试
              </Button>
            </div>
          ) : members.length === 0 ? (
            <EmptyState
              title="暂无成员"
              description={isOwnerOrAdmin ? "邀请团队成员一起协作" : "当前工作区暂无成员"}
              action={
                isOwnerOrAdmin ? (
                  <Button onClick={() => setInviteOpen(true)}>邀请成员</Button>
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">成员</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">联系方式</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">角色</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">状态</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">加入时间</th>
                    {isOwnerOrAdmin && (
                      <th className="text-right text-xs font-medium text-muted-foreground px-6 py-3">操作</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {members.map((member) => (
                    <tr key={member.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                            {member.name?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{member.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <p className="text-sm text-muted-foreground">
                          {member.phone || member.email || "-"}
                        </p>
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant={ROLE_BADGE_VARIANT[member.role] || "secondary"}>
                          {ROLE_LABELS[member.role] || member.role}
                        </Badge>
                      </td>
                      <td className="px-6 py-3">
                        {member.status === "invited" ? (
                          <Badge variant="warning">待加入</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">已加入</span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-sm text-muted-foreground">
                          {formatDate(member.joinedAt)}
                        </span>
                      </td>
                      {isOwnerOrAdmin && (
                        <td className="px-6 py-3">
                          <div className="flex items-center justify-end gap-2">
                            {isOwner && member.role !== "owner" && (
                              <Select
                                value={member.role}
                                onChange={(e) => handleRoleChange(member.id, e.target.value)}
                                className="h-7 w-28 text-xs"
                              >
                                {ROLE_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </Select>
                            )}
                            {isOwnerOrAdmin && member.role !== "owner" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRemove(member.id)}
                                className="h-7 text-xs text-destructive hover:bg-destructive/10"
                              >
                                移除
                              </Button>
                            )}
                          </div>
                        </td>
                      )}
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

"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface PlanItem {
  id: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  monthlyCredits: number;
  memberLimit: number;
  clientSpaceLimit: number;
  brandPackLimit: number;
  seriesPackLimit: number;
  projectLimit: number;
  exportLimit: number;
  batchEnabled: boolean;
  multiPlatformEnabled: boolean;
  reviewEnabled: boolean;
  exportEnabled: boolean;
  yearlyDiscount: number;
  creditCarryOverRatio: number;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const PLAN_FIELDS: { key: keyof PlanItem; label: string; type: "text" | "number" | "boolean" }[] = [
  { key: "name", label: "套餐名称", type: "text" },
  { key: "monthlyPrice", label: "月价(分)", type: "number" },
  { key: "yearlyPrice", label: "年价(分)", type: "number" },
  { key: "monthlyCredits", label: "月度额度", type: "number" },
  { key: "memberLimit", label: "成员上限", type: "number" },
  { key: "clientSpaceLimit", label: "客户空间上限", type: "number" },
  { key: "brandPackLimit", label: "品牌包上限", type: "number" },
  { key: "seriesPackLimit", label: "系列包上限", type: "number" },
  { key: "projectLimit", label: "项目上限", type: "number" },
  { key: "exportLimit", label: "导出上限", type: "number" },
  { key: "batchEnabled", label: "批量生成", type: "boolean" },
  { key: "multiPlatformEnabled", label: "多平台", type: "boolean" },
  { key: "reviewEnabled", label: "审核流程", type: "boolean" },
  { key: "exportEnabled", label: "导出功能", type: "boolean" },
  { key: "yearlyDiscount", label: "年付折扣", type: "number" },
  { key: "creditCarryOverRatio", label: "额度结转比", type: "number" },
  { key: "displayOrder", label: "排序", type: "number" },
  { key: "isActive", label: "启用", type: "boolean" },
];

function getFormFieldDefault(): Record<string, unknown> {
  return {
    name: "",
    monthlyPrice: 0,
    yearlyPrice: 0,
    monthlyCredits: 0,
    memberLimit: 1,
    clientSpaceLimit: 1,
    brandPackLimit: 1,
    seriesPackLimit: 3,
    projectLimit: 5,
    exportLimit: 10,
    batchEnabled: false,
    multiPlatformEnabled: false,
    reviewEnabled: true,
    exportEnabled: true,
    yearlyDiscount: 0,
    creditCarryOverRatio: 0,
    displayOrder: 0,
    isActive: true,
  };
}

export default function AdminPlansPage() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>(getFormFieldDefault());

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/plans");
      const data = await res.json();
      if (Array.isArray(data)) {
        setPlans(data);
      }
    } catch {
      toast("加载套餐列表失败", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const resetForm = () => {
    setForm(getFormFieldDefault());
    setEditingId(null);
    setShowCreate(false);
  };

  const handleEdit = (plan: PlanItem) => {
    setEditingId(plan.id);
    setShowCreate(false);
    const obj: Record<string, unknown> = {};
    for (const f of PLAN_FIELDS) {
      obj[f.key] = plan[f.key];
    }
    setForm(obj);
  };

  const handleSave = async () => {
    if (!form.name) {
      toast("套餐名称为必填项", "error");
      return;
    }
    try {
      const body = { ...form };
      if (editingId) {
        body.id = editingId;
      }
      const res = await fetch("/api/admin/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        toast(err.error || "保存失败", "error");
        return;
      }
      toast(editingId ? "套餐更新成功" : "套餐创建成功", "success");
      resetForm();
      await fetchPlans();
    } catch {
      toast("保存套餐失败", "error");
    }
  };

  const renderFormField = (field: { key: string; label: string; type: string }) => {
    if (field.type === "boolean") {
      return (
        <label key={field.key} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!form[field.key]}
            onChange={(e) => setForm({ ...form, [field.key]: e.target.checked })}
            className="w-4 h-4 accent-primary rounded focus:ring-primary/20 border-border bg-card"
          />
          <span className="text-sm text-muted-foreground">{field.label}</span>
        </label>
      );
    }
    return (
      <div key={field.key}>
        <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
          {field.label}
        </label>
        <Input
          type={field.type === "number" ? "number" : "text"}
          step={field.type === "number" ? "any" : undefined}
          value={String(form[field.key] ?? "")}
          onChange={(e) => {
            const val = field.type === "number" ? (parseFloat(e.target.value) || 0) : e.target.value;
            setForm({ ...form, [field.key]: val });
          }}
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">套餐配置</h1>
          <Button
            variant="primary"
            onClick={() => {
              resetForm();
              setShowCreate(true);
            }}
          >
            + 新建套餐
          </Button>
        </div>

        {(showCreate || editingId) && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">
                {editingId ? "编辑套餐" : "新建套餐"}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {PLAN_FIELDS.filter((f) => f.type !== "boolean").map(renderFormField)}
                </div>
                <div className="flex flex-wrap gap-4 pt-2">
                  {PLAN_FIELDS.filter((f) => f.type === "boolean").map(renderFormField)}
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <Button variant="primary" onClick={handleSave}>
                    {editingId ? "保存" : "创建"}
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
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">名称</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">月价</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">年价</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">月度额度</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">成员上限</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">功能</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">状态</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    加载中...
                  </td>
                </tr>
              ) : plans.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    暂无套餐数据，点击上方按钮新建
                  </td>
                </tr>
              ) : (
                plans.map((plan) => (
                  <tr key={plan.id} className="border-b border-border hover:bg-secondary transition-colors">
                    <td className="px-4 py-3 text-sm text-foreground font-medium">{plan.name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {plan.monthlyPrice > 0 ? `¥${(plan.monthlyPrice / 100).toFixed(2)}` : "免费"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {plan.yearlyPrice > 0 ? `¥${(plan.yearlyPrice / 100).toFixed(2)}` : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{plan.monthlyCredits}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{plan.memberLimit}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {plan.batchEnabled && <Badge variant="secondary" size="sm">批量</Badge>}
                        {plan.multiPlatformEnabled && <Badge variant="secondary" size="sm">多平台</Badge>}
                        {plan.reviewEnabled && <Badge variant="secondary" size="sm">审核</Badge>}
                        {plan.exportEnabled && <Badge variant="secondary" size="sm">导出</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={plan.isActive ? "success" : "outline"}>
                        {plan.isActive ? "启用" : "停用"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="link" size="sm" onClick={() => handleEdit(plan)}>
                        编辑
                      </Button>
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

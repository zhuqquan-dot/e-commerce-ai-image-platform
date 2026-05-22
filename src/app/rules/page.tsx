"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface SlotDef {
  slotType: string;
  required: boolean;
}

interface PlatformRule {
  id: string;
  platformName: string;
  platformRegion: string;
  platformType: string | null;
  defaultLanguage: string | null;
  status: string;
  maxImages: number;
  mainImageRatio: string;
  mainImageSize: string;
  allowedFormats: string;
  maxFileSizeMb: number;
  whiteBackgroundRequired: boolean;
  textAllowedOnMainImage: boolean;
  watermarkAllowed: boolean;
  borderAllowed: boolean;
  logoAllowed: boolean;
  maxOverlayTextLength: number | null;
  supportedLanguagesForPromptText: string;
  supportedSlots: string;
  forbiddenWords: string;
  absoluteTermsForbidden: boolean;
  medicalTermsForbidden: boolean;
  exportFileNamingRule: string | null;
  whiteBackgroundToleranceR?: number;
  whiteBackgroundToleranceG?: number;
  whiteBackgroundToleranceB?: number;
  textConstraints?: string;
  forbiddenElements?: string;
  priceOverlayZone?: string;
  exportDirectoryStructure?: string;
  exportSortOrder?: string;
  deliveryNotes?: string;
  versions?: string;
}

const A_TIER_PLATFORMS = new Set(["TAOBAO_TMALL", "DOUYIN", "AMAZON", "SHOPIFY"]);
const B_TIER_PLATFORMS = new Set(["JD", "PINDUODUO", "EBAY", "ETSY", "TIKTOK_SHOP", "ALIEXPRESS"]);

const COMPLETENESS_FIELDS: (keyof PlatformRule)[] = [
  "platformRegion", "platformType", "defaultLanguage", "maxImages", "mainImageRatio",
  "mainImageSize", "allowedFormats", "maxFileSizeMb", "whiteBackgroundRequired",
  "textAllowedOnMainImage", "watermarkAllowed", "borderAllowed", "logoAllowed",
  "absoluteTermsForbidden", "medicalTermsForbidden",
];

function calcCompleteness(rule: PlatformRule): number {
  const filled = COMPLETENESS_FIELDS.filter((key) => {
    const val = rule[key];
    if (val === null || val === undefined) return false;
    if (typeof val === "boolean") return true;
    if (typeof val === "number") return true;
    if (typeof val === "string" && val.trim() === "") return false;
    return true;
  }).length;
  return Math.round((filled / COMPLETENESS_FIELDS.length) * 100);
}

function completenessColor(pct: number): string {
  if (pct >= 80) return "#22c55e";
  if (pct >= 50) return "#eab308";
  return "#ef4444";
}

const PLATFORM_LABELS: Record<string, string> = {
  TAOBAO_TMALL: "淘宝/天猫",
  JD: "京东",
  PINDUODUO: "拼多多",
  DOUYIN: "抖音电商",
  AMAZON: "Amazon",
  EBAY: "eBay",
  ETSY: "Etsy",
  SHOPIFY: "Shopify",
  TIKTOK_SHOP: "TikTok Shop",
  ALIEXPRESS: "AliExpress",
};

const REGION_LABELS: Record<string, string> = {
  CN: "中国",
  global: "全球",
};

const TYPE_LABELS: Record<string, string> = {
  marketplace: "电商平台",
  social: "社交电商",
  independent: "独立站",
};

function parseJsonArray(s: string): string[] {
  try {
    const arr = JSON.parse(s);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function parseSlots(s: string): SlotDef[] {
  try {
    const arr = JSON.parse(s);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

const CLOSE_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const BOOLEAN_OPTIONS = [
  { value: "true", label: "是" },
  { value: "false", label: "否" },
];

const EDITABLE_FIELDS: {
  key: keyof PlatformRule;
  label: string;
  type: "text" | "number" | "boolean" | "json" | "nullable-number";
}[] = [
  { key: "platformRegion", label: "区域", type: "text" },
  { key: "platformType", label: "平台类型", type: "text" },
  { key: "defaultLanguage", label: "默认语言", type: "text" },
  { key: "status", label: "状态", type: "text" },
  { key: "maxImages", label: "最大张数", type: "number" },
  { key: "mainImageRatio", label: "主图比例", type: "text" },
  { key: "mainImageSize", label: "主图尺寸", type: "text" },
  { key: "maxFileSizeMb", label: "文件大小上限(MB)", type: "number" },
  { key: "maxOverlayTextLength", label: "最大叠加文字长度", type: "nullable-number" },
  { key: "exportFileNamingRule", label: "导出命名规则", type: "text" },
  { key: "whiteBackgroundToleranceR", label: "白底容差R", type: "nullable-number" },
  { key: "whiteBackgroundToleranceG", label: "白底容差G", type: "nullable-number" },
  { key: "whiteBackgroundToleranceB", label: "白底容差B", type: "nullable-number" },
  { key: "textConstraints", label: "文字约束 (JSON)", type: "json" },
  { key: "forbiddenElements", label: "禁止元素 (JSON)", type: "json" },
  { key: "priceOverlayZone", label: "价格叠加区", type: "text" },
  { key: "exportDirectoryStructure", label: "导出目录结构", type: "text" },
  { key: "exportSortOrder", label: "导出排序规则", type: "text" },
  { key: "deliveryNotes", label: "交付说明", type: "text" },
  { key: "versions", label: "版本记录 (JSON)", type: "json" },
  { key: "whiteBackgroundRequired", label: "强制白底", type: "boolean" },
  { key: "textAllowedOnMainImage", label: "主图允许文字", type: "boolean" },
  { key: "watermarkAllowed", label: "允许水印", type: "boolean" },
  { key: "borderAllowed", label: "允许边框", type: "boolean" },
  { key: "logoAllowed", label: "允许 Logo", type: "boolean" },
  { key: "absoluteTermsForbidden", label: "禁止绝对化用语", type: "boolean" },
  { key: "medicalTermsForbidden", label: "禁止医疗术语", type: "boolean" },
  { key: "allowedFormats", label: "允许格式 (JSON数组)", type: "json" },
  { key: "supportedLanguagesForPromptText", label: "支持语言 (JSON数组)", type: "json" },
  { key: "supportedSlots", label: "图位定义 (JSON)", type: "json" },
  { key: "forbiddenWords", label: "禁用词 (JSON数组)", type: "json" },
];

export default function RulesPage() {
  const [rules, setRules] = useState<PlatformRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<PlatformRule | null>(null);
  const [formData, setFormData] = useState<Record<string, string | boolean | number | null>>({});
  const [saving, setSaving] = useState(false);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/rules");
      if (!res.ok) throw new Error("加载失败");
      const data: PlatformRule[] = await res.json();
      setRules(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRules();
  }, [fetchRules]);

  function openEdit(rule: PlatformRule) {
    setEditing(rule);
    const fd: Record<string, string | boolean | number | null> = {};
    for (const field of EDITABLE_FIELDS) {
      if (field.type === "boolean") {
        fd[field.key] = !!rule[field.key];
      } else if (field.type === "nullable-number") {
        fd[field.key] = rule[field.key] ?? "";
      } else {
        fd[field.key] = rule[field.key] ?? "";
      }
    }
    setFormData(fd);
  }

  function handleFieldChange(key: string, value: string | boolean | number | null) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {};
      for (const field of EDITABLE_FIELDS) {
        let val = formData[field.key];
        if (val === "") {
          val = field.type === "nullable-number" ? null : "";
        }
        if (field.type === "number") {
          val = Number(val);
        }
        if (field.type === "nullable-number") {
          val = val === null ? null : Number(val);
        }
        body[field.key] = val;
      }

      const res = await fetch(`/api/rules/${editing.platformName}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "保存失败");
      }

      const updated = await res.json();
      setRules((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r))
      );
      setEditing(null);
    } catch (e) {
      alert(String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">平台规则中心</h1>
          <span className="text-sm text-muted-foreground">
            共 {rules.length} 个平台 / 配置化统一管理
          </span>
        </div>

        {!loading && rules.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5 mb-6">
            <h2 className="text-sm font-semibold text-foreground mb-3">规则完整性仪表盘</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-center">
                <div className="text-xs text-emerald-600 mb-0.5">A 层平台</div>
                <div className="text-lg font-bold text-emerald-700">
                  {rules.filter((r) => A_TIER_PLATFORMS.has(r.platformName)).length}
                </div>
                <div className="text-2xs text-emerald-500/70">淘宝·抖音·Amazon·Shopify</div>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-center">
                <div className="text-xs text-blue-600 mb-0.5">B 层平台</div>
                <div className="text-lg font-bold text-blue-700">
                  {rules.filter((r) => B_TIER_PLATFORMS.has(r.platformName)).length}
                </div>
                <div className="text-2xs text-blue-500/70">京东·拼多多·eBay·Etsy·TikTok·AliExpress</div>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-center">
                <div className="text-xs text-amber-600 mb-0.5">平均完整度</div>
                <div className="text-lg font-bold text-amber-700">
                  {Math.round(rules.reduce((s, r) => s + calcCompleteness(r), 0) / rules.length)}%
                </div>
                <div className="text-2xs text-amber-500/70">
                  {rules.filter((r) => calcCompleteness(r) >= 80).length} 个完备
                </div>
              </div>
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 text-center">
                <div className="text-xs text-rose-600 mb-0.5">字段填充率</div>
                <div className="text-lg font-bold text-rose-700">
                  {Math.round(
                    (rules.reduce((s, r) => {
                      const filled = COMPLETENESS_FIELDS.filter((key) => {
                        const val = r[key];
                        if (val === null || val === undefined) return false;
                        if (typeof val === "boolean") return true;
                        if (typeof val === "number") return true;
                        if (typeof val === "string" && val.trim() === "") return false;
                        return true;
                      }).length;
                      return s + filled;
                    }, 0) / (rules.length * COMPLETENESS_FIELDS.length)) * 100
                  )}%
                </div>
                <div className="text-2xs text-rose-500/70">{COMPLETENESS_FIELDS.length} 个关键字段</div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <Card className="p-12 text-center text-muted-foreground">
            <Spinner size="md" className="mx-auto mb-2" />
            <p>加载中...</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {rules.map((rule) => {
              const formats = parseJsonArray(rule.allowedFormats);
              const slots = parseSlots(rule.supportedSlots);

              return (
                <Card
                  key={rule.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => openEdit(rule)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-base font-semibold text-foreground">
                        {PLATFORM_LABELS[rule.platformName] || rule.platformName}
                      </h3>
                      <Badge variant={rule.status === "active" ? "success" : "outline"}>
                        {rule.status === "active" ? "启用" : rule.status}
                      </Badge>
                    </div>

                    <div className="space-y-1.5 text-sm text-muted-foreground">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground/70">平台标识</span>
                        <span className="font-mono text-xs">{rule.platformName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground/70">区域</span>
                        <span>{REGION_LABELS[rule.platformRegion] || rule.platformRegion}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground/70">类型</span>
                        <span>{TYPE_LABELS[rule.platformType || ""] || rule.platformType || "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground/70">主图尺寸</span>
                        <span className="font-medium">{rule.mainImageSize}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground/70">最大张数</span>
                        <span className="font-medium">{rule.maxImages} 张</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground/70">文件大小上限</span>
                        <span>{rule.maxFileSizeMb} MB</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground/70">白底要求</span>
                        <span
                          className={
                            rule.whiteBackgroundRequired
                              ? "text-destructive font-medium"
                              : "text-muted-foreground"
                          }
                        >
                          {rule.whiteBackgroundRequired ? "必须" : "无"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground/70">主图文字</span>
                        <span
                          className={
                            rule.textAllowedOnMainImage ? "text-emerald-600" : "text-destructive"
                          }
                        >
                          {rule.textAllowedOnMainImage ? "允许" : "禁止"}
                          {rule.maxOverlayTextLength != null
                            ? ` ≤${rule.maxOverlayTextLength}字`
                            : ""}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground/70">水印/边框/Logo</span>
                        <span className="text-xs">
                          {[
                            rule.watermarkAllowed ? "水印" : "",
                            rule.borderAllowed ? "边框" : "",
                            rule.logoAllowed ? "Logo" : "",
                          ]
                            .filter(Boolean)
                            .join("/") || "均禁止"}
                        </span>
                      </div>
                      {formats.length > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground/70">格式</span>
                          <span className="text-xs">{formats.join(", ")}</span>
                        </div>
                      )}
                      {slots.length > 0 && (
                        <div className="flex justify-between items-start">
                          <span className="text-muted-foreground/70 shrink-0">图位</span>
                          <span className="text-xs text-right">
                            {slots.map((s) => (
                              <Badge
                                key={s.slotType}
                                variant={s.required ? "primary" : "outline"}
                                className="ml-1"
                              >
                                {s.slotType}
                                {s.required ? "*" : ""}
                              </Badge>
                            ))}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-3 border-t border-border text-xs text-primary">
                      点击编辑规则
                    </div>

                    {(() => {
                      const pct = calcCompleteness(rule);
                      const color = completenessColor(pct);
                      return (
                        <div className="mt-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground">完整性</span>
                            <span className="text-xs font-mono font-medium" style={{ color }}>
                              {pct}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{ width: `${pct}%`, backgroundColor: color }}
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 pb-10 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setEditing(null)}
          />
          <div className="relative bg-card border border-border rounded-xl shadow-lg w-full max-w-2xl mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">
                编辑规则 - {PLATFORM_LABELS[editing.platformName] || editing.platformName}
              </h2>
              <button
                onClick={() => setEditing(null)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {CLOSE_ICON}
              </button>
            </div>

            <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                {EDITABLE_FIELDS.map((field) => (
                  <div
                    key={field.key}
                    className={field.type === "json" ? "col-span-2" : "col-span-1"}
                  >
                    {field.type === "boolean" ? (
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1.5 block">
                          {field.label}
                        </label>
                        <Select
                          value={formData[field.key] ? "true" : "false"}
                          onChange={(e) =>
                            handleFieldChange(field.key, e.target.value === "true")
                          }
                        >
                          {BOOLEAN_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </Select>
                      </div>
                    ) : field.type === "number" ? (
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1.5 block">
                          {field.label}
                        </label>
                        <Input
                          type="number"
                          value={String(formData[field.key] ?? "")}
                          onChange={(e) =>
                            handleFieldChange(field.key, Number(e.target.value))
                          }
                        />
                      </div>
                    ) : field.type === "nullable-number" ? (
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1.5 block">
                          {field.label}
                        </label>
                        <Input
                          type="number"
                          value={formData[field.key] != null ? String(formData[field.key]) : ""}
                          onChange={(e) =>
                            handleFieldChange(
                              field.key,
                              e.target.value === "" ? null : Number(e.target.value)
                            )
                          }
                          placeholder="留空表示无限制"
                        />
                      </div>
                    ) : field.type === "json" ? (
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1.5 block">
                          {field.label}
                        </label>
                        <Textarea
                          value={String(formData[field.key] ?? "")}
                          onChange={(e) => handleFieldChange(field.key, e.target.value)}
                          rows={3}
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1.5 block">
                          {field.label}
                        </label>
                        <Input
                          type="text"
                          value={String(formData[field.key] ?? "")}
                          onChange={(e) => handleFieldChange(field.key, e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
              <Button variant="ghost" onClick={() => setEditing(null)}>
                取消
              </Button>
              <Button variant="primary" loading={saving} onClick={handleSave}>
                保存
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ToastProvider, useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";

interface FormData {
  productName: string;
  category: string;
  sku: string;
  spu: string;
  marketRegion: string;
  primaryLanguage: string;
  clientSpaceId: string;
  brandPackId: string;
  seriesPackId: string;
  material: string;
  color: string;
  size: string;
  weight: string;
  capacity: string;
  model: string;
  compatibleModel: string;
  packageContents: string;
  coreSellingPoint1: string;
  coreSellingPoint2: string;
  coreSellingPoint3: string;
  differentiation: string;
  targetAudience: string;
  useCase: string;
  painPoint: string;
  mainColor: string;
  secondaryColor: string;
  shapeType: string;
  surfaceMaterial: string;
  textureFeature: string;
  logoPosition: string;
  labelPosition: string;
  mustNotChangeFeatures: string;
  frontRefImage: string;
  angle45RefImage: string;
  sideRefImage: string;
  backRefImage: string;
  topRefImage: string;
  packagingRefImage: string;
  detailRefImages: string;
  logoRefImage: string;
  accessoryRefImage: string;
}

const EMPTY_FORM: FormData = {
  productName: "",
  category: "",
  sku: "",
  spu: "",
  marketRegion: "CN",
  primaryLanguage: "zh-CN",
  clientSpaceId: "",
  brandPackId: "",
  seriesPackId: "",
  material: "",
  color: "",
  size: "",
  weight: "",
  capacity: "",
  model: "",
  compatibleModel: "",
  packageContents: "",
  coreSellingPoint1: "",
  coreSellingPoint2: "",
  coreSellingPoint3: "",
  differentiation: "",
  targetAudience: "",
  useCase: "",
  painPoint: "",
  mainColor: "",
  secondaryColor: "",
  shapeType: "",
  surfaceMaterial: "",
  textureFeature: "",
  logoPosition: "",
  labelPosition: "",
  mustNotChangeFeatures: "",
  frontRefImage: "",
  angle45RefImage: "",
  sideRefImage: "",
  backRefImage: "",
  topRefImage: "",
  packagingRefImage: "",
  detailRefImages: "",
  logoRefImage: "",
  accessoryRefImage: "",
};

const MARKET_REGIONS = [
  { value: "CN", label: "中国 (CN)" },
  { value: "US", label: "美国 (US)" },
  { value: "EU", label: "欧洲 (EU)" },
  { value: "ME", label: "中东 (ME)" },
  { value: "SEA", label: "东南亚 (SEA)" },
  { value: "JP", label: "日本 (JP)" },
  { value: "KR", label: "韩国 (KR)" },
];

const LANGUAGES = [
  { value: "zh-CN", label: "简体中文 (zh-CN)" },
  { value: "en", label: "英语 (en)" },
  { value: "ar", label: "阿拉伯语 (ar)" },
  { value: "ja", label: "日语 (ja)" },
  { value: "ko", label: "韩语 (ko)" },
];

function EditProductForm() {
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();

  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [productName, setProductName] = useState("");
  const [brandPacks, setBrandPacks] = useState<{ id: string; brandName: string }[]>([]);
  const [seriesPacks, setSeriesPacks] = useState<{ id: string; seriesName: string }[]>([]);

  const fetchBrandPacks = useCallback(async (spaceId: string) => {
    if (!spaceId) {
      setBrandPacks([]);
      return;
    }
    try {
      const res = await fetch(`/api/brand-packs?clientSpaceId=${encodeURIComponent(spaceId)}&pageSize=100`);
      if (res.ok) {
        const data = await res.json();
        setBrandPacks(data.list || []);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const fetchSeriesPacks = useCallback(async (bpId: string) => {
    if (!bpId) {
      setSeriesPacks([]);
      return;
    }
    try {
      const res = await fetch(`/api/series-packs?brandPackId=${encodeURIComponent(bpId)}&pageSize=100`);
      if (res.ok) {
        const data = await res.json();
        setSeriesPacks(data.list || []);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const fetchProduct = useCallback(async () => {
    try {
      const res = await fetch(`/api/products/${id}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "加载失败");
      }
      const data = await res.json();
      setProductName(data.productName || "");
      setForm({
        productName: data.productName || "",
        category: data.category || "",
        sku: data.sku || "",
        spu: data.spu || "",
        marketRegion: data.marketRegion || "CN",
        primaryLanguage: data.primaryLanguage || "zh-CN",
        clientSpaceId: data.clientSpaceId || "",
        brandPackId: data.brandPackId || "",
        seriesPackId: data.seriesPackId || "",
        material: data.material || "",
        color: data.color || "",
        size: data.size || "",
        weight: data.weight || "",
        capacity: data.capacity || "",
        model: data.model || "",
        compatibleModel: data.compatibleModel || "",
        packageContents: data.packageContents || "",
        coreSellingPoint1: data.coreSellingPoint1 || "",
        coreSellingPoint2: data.coreSellingPoint2 || "",
        coreSellingPoint3: data.coreSellingPoint3 || "",
        differentiation: data.differentiation || "",
        targetAudience: data.targetAudience || "",
        useCase: data.useCase || "",
        painPoint: data.painPoint || "",
        mainColor: data.mainColor || "",
        secondaryColor: data.secondaryColor || "",
        shapeType: data.shapeType || "",
        surfaceMaterial: data.surfaceMaterial || "",
        textureFeature: data.textureFeature || "",
        logoPosition: data.logoPosition || "",
        labelPosition: data.labelPosition || "",
        mustNotChangeFeatures: Array.isArray(data.mustNotChangeFeatures)
          ? data.mustNotChangeFeatures.join("\n")
          : data.mustNotChangeFeatures || "",
        frontRefImage: data.frontRefImage || "",
        angle45RefImage: data.angle45RefImage || "",
        sideRefImage: data.sideRefImage || "",
        backRefImage: data.backRefImage || "",
        topRefImage: data.topRefImage || "",
        packagingRefImage: data.packagingRefImage || "",
        detailRefImages: Array.isArray(data.detailRefImages)
          ? data.detailRefImages.join(", ")
          : data.detailRefImages || "",
        logoRefImage: data.logoRefImage || "",
        accessoryRefImage: data.accessoryRefImage || "",
      });
    } catch (e) {
      toast(String(e), "error");
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProduct();
  }, [fetchProduct]);

  useEffect(() => {
    if (!loading && form.clientSpaceId) {
      fetchBrandPacks(form.clientSpaceId);
    }
  }, [form.clientSpaceId, loading, fetchBrandPacks]);

  useEffect(() => {
    if (!loading && form.brandPackId) {
      fetchSeriesPacks(form.brandPackId);
    }
  }, [form.brandPackId, loading, fetchSeriesPacks]);

  function updateField(field: keyof FormData, value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "clientSpaceId") {
        next.brandPackId = "";
        next.seriesPackId = "";
        setBrandPacks([]);
        setSeriesPacks([]);
      }
      if (field === "brandPackId") {
        next.seriesPackId = "";
        setSeriesPacks([]);
      }
      return next;
    });
  }

  async function handleSave() {
    if (!form.productName.trim()) {
      toast("商品名称不能为空", "error");
      return;
    }
    if (!form.category.trim()) {
      toast("类目不能为空", "error");
      return;
    }
    if (!form.clientSpaceId.trim()) {
      toast("客户空间ID不能为空", "error");
      return;
    }
    if (!form.coreSellingPoint1.trim()) {
      toast("核心卖点1不能为空", "error");
      return;
    }
    if (!form.frontRefImage.trim()) {
      toast("正面参考图不能为空", "error");
      return;
    }

    setSaving(true);
    try {
      const body = {
        clientSpaceId: form.clientSpaceId.trim(),
        brandPackId: form.brandPackId.trim(),
        seriesPackId: form.seriesPackId.trim(),
        productName: form.productName.trim(),
        category: form.category.trim(),
        sku: form.sku.trim(),
        spu: form.spu.trim(),
        marketRegion: form.marketRegion,
        primaryLanguage: form.primaryLanguage,
        material: form.material.trim(),
        color: form.color.trim(),
        size: form.size.trim(),
        weight: form.weight.trim(),
        capacity: form.capacity.trim(),
        model: form.model.trim(),
        compatibleModel: form.compatibleModel.trim(),
        packageContents: form.packageContents.trim(),
        coreSellingPoint1: form.coreSellingPoint1.trim(),
        coreSellingPoint2: form.coreSellingPoint2.trim(),
        coreSellingPoint3: form.coreSellingPoint3.trim(),
        differentiation: form.differentiation.trim(),
        targetAudience: form.targetAudience.trim(),
        useCase: form.useCase.trim(),
        painPoint: form.painPoint.trim(),
        mainColor: form.mainColor.trim(),
        secondaryColor: form.secondaryColor.trim(),
        shapeType: form.shapeType.trim(),
        surfaceMaterial: form.surfaceMaterial.trim(),
        textureFeature: form.textureFeature.trim(),
        logoPosition: form.logoPosition.trim(),
        labelPosition: form.labelPosition.trim(),
        mustNotChangeFeatures: form.mustNotChangeFeatures
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        frontRefImage: form.frontRefImage.trim(),
        angle45RefImage: form.angle45RefImage.trim(),
        sideRefImage: form.sideRefImage.trim(),
        backRefImage: form.backRefImage.trim(),
        topRefImage: form.topRefImage.trim(),
        packagingRefImage: form.packagingRefImage.trim(),
        detailRefImages: form.detailRefImages
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        logoRefImage: form.logoRefImage.trim(),
        accessoryRefImage: form.accessoryRefImage.trim(),
      };

      const res = await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "保存失败");
      }

      toast("商品保存成功", "success");
    } catch (e) {
      toast(String(e), "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <Spinner size="lg" className="mb-4" />
          <p className="text-muted-foreground">加载中…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/products" className="hover:text-primary transition-colors">
          商品库
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">编辑商品：{productName}</span>
      </nav>

      <h1 className="text-xl font-bold text-foreground mb-8">编辑商品：{productName}</h1>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>基础信息</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  商品名称 <span className="text-destructive">*</span>
                </label>
                <Input value={form.productName} onChange={(e) => updateField("productName", e.target.value)} placeholder="输入商品名称" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  类目 <span className="text-destructive">*</span>
                </label>
                <Input value={form.category} onChange={(e) => updateField("category", e.target.value)} placeholder="输入类目" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">SKU</label>
                <Input value={form.sku} onChange={(e) => updateField("sku", e.target.value)} placeholder="输入 SKU" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">SPU</label>
                <Input value={form.spu} onChange={(e) => updateField("spu", e.target.value)} placeholder="输入 SPU" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">目标市场</label>
                <Select value={form.marketRegion} onChange={(e) => updateField("marketRegion", e.target.value)}>
                  {MARKET_REGIONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">主要语言</label>
                <Select value={form.primaryLanguage} onChange={(e) => updateField("primaryLanguage", e.target.value)}>
                  {LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  客户空间ID <span className="text-destructive">*</span>
                </label>
                <Input value={form.clientSpaceId} onChange={(e) => updateField("clientSpaceId", e.target.value)} placeholder="输入 clientSpaceId" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  品牌包
                </label>
                <Select
                  value={form.brandPackId}
                  onChange={(e) => updateField("brandPackId", e.target.value)}
                  disabled={!form.clientSpaceId.trim()}
                >
                  <option value="">不限</option>
                  {brandPacks.map((bp) => (
                    <option key={bp.id} value={bp.id}>{bp.brandName}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  系列包
                </label>
                <Select
                  value={form.seriesPackId}
                  onChange={(e) => updateField("seriesPackId", e.target.value)}
                  disabled={!form.brandPackId}
                >
                  <option value="">不限</option>
                  {seriesPacks.map((sp) => (
                    <option key={sp.id} value={sp.id}>{sp.seriesName}</option>
                  ))}
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>规格信息</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">材质</label>
                <Input value={form.material} onChange={(e) => updateField("material", e.target.value)} placeholder="输入材质" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">颜色</label>
                <Input value={form.color} onChange={(e) => updateField("color", e.target.value)} placeholder="输入颜色" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">尺寸</label>
                <Input value={form.size} onChange={(e) => updateField("size", e.target.value)} placeholder="输入尺寸" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">重量</label>
                <Input value={form.weight} onChange={(e) => updateField("weight", e.target.value)} placeholder="输入重量" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">容量</label>
                <Input value={form.capacity} onChange={(e) => updateField("capacity", e.target.value)} placeholder="输入容量" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">型号</label>
                <Input value={form.model} onChange={(e) => updateField("model", e.target.value)} placeholder="输入型号" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">兼容型号</label>
                <Input value={form.compatibleModel} onChange={(e) => updateField("compatibleModel", e.target.value)} placeholder="输入兼容型号" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">包装内容</label>
                <Input value={form.packageContents} onChange={(e) => updateField("packageContents", e.target.value)} placeholder="输入包装内容" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>卖点信息</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  核心卖点 1 <span className="text-destructive">*</span>
                </label>
                <Input value={form.coreSellingPoint1} onChange={(e) => updateField("coreSellingPoint1", e.target.value)} placeholder="输入核心卖点1" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">核心卖点 2</label>
                  <Input value={form.coreSellingPoint2} onChange={(e) => updateField("coreSellingPoint2", e.target.value)} placeholder="输入核心卖点2" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">核心卖点 3</label>
                  <Input value={form.coreSellingPoint3} onChange={(e) => updateField("coreSellingPoint3", e.target.value)} placeholder="输入核心卖点3" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">差异化优势</label>
                  <Input value={form.differentiation} onChange={(e) => updateField("differentiation", e.target.value)} placeholder="输入差异化优势" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">目标用户</label>
                  <Input value={form.targetAudience} onChange={(e) => updateField("targetAudience", e.target.value)} placeholder="输入目标用户" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">使用场景</label>
                  <Input value={form.useCase} onChange={(e) => updateField("useCase", e.target.value)} placeholder="输入使用场景" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">用户痛点</label>
                  <Input value={form.painPoint} onChange={(e) => updateField("painPoint", e.target.value)} placeholder="输入用户痛点" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>真值包</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">主色</label>
                <Input value={form.mainColor} onChange={(e) => updateField("mainColor", e.target.value)} placeholder="#000000 或 red" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">辅色</label>
                <Input value={form.secondaryColor} onChange={(e) => updateField("secondaryColor", e.target.value)} placeholder="#000000 或 blue" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">形状类型</label>
                <Input value={form.shapeType} onChange={(e) => updateField("shapeType", e.target.value)} placeholder="输入形状类型" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">表面材质</label>
                <Input value={form.surfaceMaterial} onChange={(e) => updateField("surfaceMaterial", e.target.value)} placeholder="输入表面材质" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">纹理特征</label>
                <Input value={form.textureFeature} onChange={(e) => updateField("textureFeature", e.target.value)} placeholder="输入纹理特征" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Logo 位置</label>
                <Input value={form.logoPosition} onChange={(e) => updateField("logoPosition", e.target.value)} placeholder="输入 Logo 位置" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">标签位置</label>
                <Input value={form.labelPosition} onChange={(e) => updateField("labelPosition", e.target.value)} placeholder="输入标签位置" />
              </div>
            </div>
            <div className="mt-4">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">不可变更特征</label>
              <Textarea value={form.mustNotChangeFeatures} onChange={(e) => updateField("mustNotChangeFeatures", e.target.value)} placeholder={"每行一个特征，换行分隔\n例如：\n瓶身形状不变\n品牌Logo不可移除"} rows={4} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>参考图</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    正面参考图 URL <span className="text-destructive">*</span>
                  </label>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">正面</Badge>
                </div>
                <Input value={form.frontRefImage} onChange={(e) => updateField("frontRefImage", e.target.value)} placeholder="输入图片 URL" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <label className="text-xs font-medium text-muted-foreground">45度参考图 URL</label>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">45度</Badge>
                  </div>
                  <Input value={form.angle45RefImage} onChange={(e) => updateField("angle45RefImage", e.target.value)} placeholder="输入图片 URL" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <label className="text-xs font-medium text-muted-foreground">侧面参考图 URL</label>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">侧面</Badge>
                  </div>
                  <Input value={form.sideRefImage} onChange={(e) => updateField("sideRefImage", e.target.value)} placeholder="输入图片 URL" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <label className="text-xs font-medium text-muted-foreground">背面参考图 URL</label>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">背面</Badge>
                  </div>
                  <Input value={form.backRefImage} onChange={(e) => updateField("backRefImage", e.target.value)} placeholder="输入图片 URL" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <label className="text-xs font-medium text-muted-foreground">顶部参考图 URL</label>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">顶部</Badge>
                  </div>
                  <Input value={form.topRefImage} onChange={(e) => updateField("topRefImage", e.target.value)} placeholder="输入图片 URL" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <label className="text-xs font-medium text-muted-foreground">包装参考图 URL</label>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">包装</Badge>
                  </div>
                  <Input value={form.packagingRefImage} onChange={(e) => updateField("packagingRefImage", e.target.value)} placeholder="输入图片 URL" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Logo 参考图 URL</label>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Logo</Badge>
                  </div>
                  <Input value={form.logoRefImage} onChange={(e) => updateField("logoRefImage", e.target.value)} placeholder="输入图片 URL" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <label className="text-xs font-medium text-muted-foreground">配件参考图 URL</label>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">配件</Badge>
                  </div>
                  <Input value={form.accessoryRefImage} onChange={(e) => updateField("accessoryRefImage", e.target.value)} placeholder="输入图片 URL" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <label className="text-xs font-medium text-muted-foreground">细节参考图 URL</label>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">细节</Badge>
                </div>
                <Input value={form.detailRefImages} onChange={(e) => updateField("detailRefImages", e.target.value)} placeholder="多个 URL 用英文逗号分隔" />
                <p className="text-xs text-muted-foreground/70 mt-1">多个 URL 用英文逗号「,」分隔</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 flex justify-end gap-3">
        <Link href="/products">
          <Button variant="ghost">返回</Button>
        </Link>
        <Button variant="primary" loading={saving} onClick={handleSave}>
          保存
        </Button>
      </div>
    </div>
  );
}

export default function EditProductPage() {
  return (
    <ToastProvider>
      <EditProductForm />
    </ToastProvider>
  );
}

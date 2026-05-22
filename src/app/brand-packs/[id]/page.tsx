"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"

interface BrandPackDetail {
  id: string
  clientSpaceId: string
  brandName: string
  brandPrimaryColor: string
  brandSecondaryColor: string
  brandFontPreference: string
  brandTone: string
  brandForbiddenWords: string[]
  brandVisualBoundary: string
  createdAt: string
  updatedAt: string
}

interface SeriesPackItem {
  id: string
  seriesName: string
}

interface ProductItem {
  id: string
  productName: string
}

export default function BrandPackDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [brandPack, setBrandPack] = useState<BrandPackDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [seriesPacks, setSeriesPacks] = useState<SeriesPackItem[]>([])
  const [products, setProducts] = useState<ProductItem[]>([])
  const [relationsLoading, setRelationsLoading] = useState(true)

  const fetchDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/brand-packs/${id}`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "加载失败")
      }
      const data = await res.json()
      setBrandPack(data)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [id])

  const fetchRelations = useCallback(async () => {
    try {
      const [seriesRes, productsRes] = await Promise.all([
        fetch(`/api/series-packs?brandPackId=${id}&pageSize=100`),
        fetch(`/api/products?brandPackId=${id}&pageSize=100`),
      ])

      if (seriesRes.ok) {
        const seriesData = await seriesRes.json()
        setSeriesPacks(seriesData.list || [])
      }
      if (productsRes.ok) {
        const productsData = await productsRes.json()
        setProducts(productsData.list || [])
      }
    } catch {
      /* ignore */
    } finally {
      setRelationsLoading(false)
    }
  }, [id])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDetail()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRelations()
  }, [fetchDetail, fetchRelations])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <Spinner size="lg" className="mb-4" />
          <p className="text-muted-foreground">加载中…</p>
        </div>
      </div>
    )
  }

  if (error || !brandPack) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-destructive text-lg mb-4">{error || "品牌包不存在"}</p>
        <Link href="/brand-packs">
          <Button variant="ghost">返回品牌包列表</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/brand-packs" className="hover:text-primary transition-colors">
          品牌包
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{brandPack.brandName}</span>
      </nav>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-foreground">{brandPack.brandName}</h1>
        <Link href="/brand-packs">
          <Button variant="ghost">返回列表</Button>
        </Link>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>品牌信息</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-muted-foreground block mb-1">客户空间ID</span>
                <Link
                  href={`/client-spaces?clientSpaceId=${brandPack.clientSpaceId}`}
                  className="text-sm text-primary hover:underline"
                >
                  {brandPack.clientSpaceId}
                </Link>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block mb-1">品牌名称</span>
                <span className="text-sm text-foreground">{brandPack.brandName}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block mb-1">品牌主色</span>
                <div className="flex items-center gap-2">
                  {brandPack.brandPrimaryColor ? (
                    <>
                      <div
                        className="w-5 h-5 rounded border border-border"
                        style={{ backgroundColor: brandPack.brandPrimaryColor }}
                      />
                      <span className="text-sm text-foreground font-mono">
                        {brandPack.brandPrimaryColor}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">未设置</span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block mb-1">品牌辅色</span>
                <div className="flex items-center gap-2">
                  {brandPack.brandSecondaryColor ? (
                    <>
                      <div
                        className="w-5 h-5 rounded border border-border"
                        style={{ backgroundColor: brandPack.brandSecondaryColor }}
                      />
                      <span className="text-sm text-foreground font-mono">
                        {brandPack.brandSecondaryColor}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">未设置</span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block mb-1">字体偏好</span>
                <span className="text-sm text-foreground">
                  {brandPack.brandFontPreference || "未设置"}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block mb-1">品牌调性</span>
                <span className="text-sm text-foreground">
                  {brandPack.brandTone || "未设置"}
                </span>
              </div>
              <div className="md:col-span-2">
                <span className="text-xs text-muted-foreground block mb-1">视觉边界</span>
                <span className="text-sm text-foreground">
                  {brandPack.brandVisualBoundary || "未设置"}
                </span>
              </div>
              <div className="md:col-span-2">
                <span className="text-xs text-muted-foreground block mb-1.5">禁用词</span>
                {Array.isArray(brandPack.brandForbiddenWords) &&
                brandPack.brandForbiddenWords.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {brandPack.brandForbiddenWords.map((word, i) => (
                      <Badge key={i} variant="destructive" size="md">
                        {word}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">无</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>关联系列资产包</CardTitle>
          </CardHeader>
          <CardContent>
            {relationsLoading ? (
              <div className="flex items-center gap-2 py-4">
                <Spinner size="sm" />
                <span className="text-sm text-muted-foreground">加载中…</span>
              </div>
            ) : seriesPacks.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">暂无关联的系列资产包</p>
            ) : (
              <ul className="divide-y divide-border">
                {seriesPacks.map((sp) => (
                  <li key={sp.id} className="py-2.5 flex items-center justify-between">
                    <span className="text-sm text-foreground">{sp.seriesName}</span>
                    <Link
                      href={`/series-packs`}
                      className="text-xs text-primary hover:underline"
                    >
                      查看 →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>关联商品</CardTitle>
          </CardHeader>
          <CardContent>
            {relationsLoading ? (
              <div className="flex items-center gap-2 py-4">
                <Spinner size="sm" />
                <span className="text-sm text-muted-foreground">加载中…</span>
              </div>
            ) : products.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">暂无关联的商品</p>
            ) : (
              <ul className="divide-y divide-border">
                {products.map((p) => (
                  <li key={p.id} className="py-2.5 flex items-center justify-between">
                    <span className="text-sm text-foreground">{p.productName}</span>
                    <Link
                      href={`/products/${p.id}`}
                      className="text-xs text-primary hover:underline"
                    >
                      查看 →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>元信息</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-muted-foreground block mb-1">创建时间</span>
                <span className="text-sm text-foreground">
                  {new Date(brandPack.createdAt).toLocaleString("zh-CN")}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block mb-1">更新时间</span>
                <span className="text-sm text-foreground">
                  {new Date(brandPack.updatedAt).toLocaleString("zh-CN")}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

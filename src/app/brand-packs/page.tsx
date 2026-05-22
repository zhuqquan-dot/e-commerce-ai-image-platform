"use client"

import { useCallback, useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { EmptyState } from "@/components/ui/empty-state"
import { SkeletonCard } from "@/components/ui/skeleton"

interface BrandPack {
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
}

interface ListResponse {
  list: BrandPack[]
  total: number
  page: number
  pageSize: number
}

interface BlockedReference {
  id: string
  seriesName?: string
  productName?: string
}

interface BlockedInfo {
  seriesPacks: BlockedReference[]
  products: BlockedReference[]
}

const emptyForm = {
  clientSpaceId: "",
  brandName: "",
  brandPrimaryColor: "",
  brandSecondaryColor: "",
  brandFontPreference: "",
  brandTone: "",
  brandForbiddenWords: "",
  brandVisualBoundary: "",
}

function BrandPacksPageContent() {
  const searchParams = useSearchParams()
  const filterClientSpaceId = searchParams.get("clientSpaceId") || ""

  const [list, setList] = useState<BrandPack[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [blockedInfo, setBlockedInfo] = useState<BlockedInfo | null>(null)
  const [modalClientSpaces, setModalClientSpaces] = useState<
    { value: string; label: string }[]
  >([])

  const pageSize = 12
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("pageSize", String(pageSize))
      if (filterClientSpaceId) params.set("clientSpaceId", filterClientSpaceId)

      const res = await fetch(`/api/brand-packs?${params}`)
      if (!res.ok) throw new Error("Failed")
      const data: ListResponse = await res.json()
      setList(data.list)
      setTotal(data.total)
    } catch {
      setList([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, filterClientSpaceId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchList()
  }, [fetchList])

  async function fetchClientSpacesForModal() {
    try {
      const res = await fetch("/api/client-spaces?pageSize=200")
      if (!res.ok) return
      const data = await res.json()
      const options = (data.list || data.data || []).map(
        (cs: { id: string; clientName: string }) => ({
          value: cs.id,
          label: cs.clientName,
        }),
      )
      setModalClientSpaces(options)
    } catch {
      /* ignore */
    }
  }

  async function openCreate() {
    await fetchClientSpacesForModal()
    setEditingId(null)
    setForm({ ...emptyForm })
    setShowModal(true)
  }

  function openEdit(item: BrandPack) {
    setEditingId(item.id)
    setForm({
      clientSpaceId: item.clientSpaceId,
      brandName: item.brandName,
      brandPrimaryColor: item.brandPrimaryColor || "",
      brandSecondaryColor: item.brandSecondaryColor || "",
      brandFontPreference: item.brandFontPreference || "",
      brandTone: item.brandTone || "",
      brandForbiddenWords: Array.isArray(item.brandForbiddenWords)
        ? item.brandForbiddenWords.join(", ")
        : "",
      brandVisualBoundary: item.brandVisualBoundary || "",
    })
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingId(null)
    setForm({ ...emptyForm })
  }

  async function handleSubmit() {
    if (!form.clientSpaceId || !form.brandName.trim()) return
    setSubmitting(true)
    try {
      const body = {
        ...form,
        brandForbiddenWords: form.brandForbiddenWords
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean),
      }

      const url = editingId
        ? `/api/brand-packs/${editingId}`
        : "/api/brand-packs"
      const method = editingId ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(editingId ? "Update failed" : "Create failed")
      closeModal()
      fetchList()
    } catch {
      /* ignore */
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("确定要删除该品牌包吗？")) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/brand-packs/${id}`, { method: "DELETE" })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || "删除失败")

      if (data.blocked) {
        setBlockedInfo(data.references)
        return
      }

      fetchList()
    } catch {
      /* ignore */
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">品牌包</h1>
          <p className="text-muted-foreground mt-1">管理品牌视觉规范</p>
        </div>
        <Button onClick={openCreate}>+ 新建品牌包</Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          title="暂无品牌包"
          description="点击「新建品牌包」来创建第一个品牌包"
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map((item) => (
              <Card key={item.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {item.brandPrimaryColor && (
                      <div
                        className="w-8 h-8 rounded-full border border-border flex-shrink-0"
                        style={{ backgroundColor: item.brandPrimaryColor }}
                        title={item.brandPrimaryColor}
                      />
                    )}
                    <Link
                      href={`/brand-packs/${item.id}`}
                      className="text-lg font-semibold text-foreground hover:text-primary transition-colors"
                    >
                      {item.brandName}
                    </Link>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => openEdit(item)}
                      className="text-primary hover:text-primary/80 text-sm"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deleting === item.id}
                      className="text-destructive hover:text-destructive/70 text-sm disabled:opacity-50"
                    >
                      {deleting === item.id ? "删除中..." : "删除"}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">字体偏好</span>
                    <span className="text-foreground">
                      {item.brandFontPreference || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">主色</span>
                    <span className="text-foreground font-mono text-xs">
                      {item.brandPrimaryColor || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">辅色</span>
                    <span className="text-foreground font-mono text-xs">
                      {item.brandSecondaryColor || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">品牌调性</span>
                    <span className="text-foreground text-xs">
                      {item.brandTone || "-"}
                    </span>
                  </div>
                </div>

                {Array.isArray(item.brandForbiddenWords) &&
                  item.brandForbiddenWords.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <span className="text-xs text-muted-foreground mb-1 block">
                        禁用词
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {item.brandForbiddenWords.map((word, i) => (
                          <span
                            key={i}
                            className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full"
                          >
                            {word}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
              </Card>
            ))}
          </div>
          <div className="flex items-center justify-center gap-4 mt-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              上一页
            </Button>
            <span className="px-3 py-1 text-sm text-muted-foreground self-center">
              {page} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              下一页
            </Button>
          </div>
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-lg">
            <h2 className="text-lg font-semibold mb-4">
              {editingId ? "编辑品牌包" : "新建品牌包"}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">客户空间</label>
                <Select
                  required
                  value={form.clientSpaceId}
                  onChange={(e) =>
                    setForm({ ...form, clientSpaceId: e.target.value })
                  }
                >
                  {modalClientSpaces.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">品牌名称</label>
                <Input
                  required
                  value={form.brandName}
                  onChange={(e) =>
                    setForm({ ...form, brandName: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">品牌主色</label>
                <Input
                  value={form.brandPrimaryColor}
                  onChange={(e) =>
                    setForm({ ...form, brandPrimaryColor: e.target.value })
                  }
                  placeholder="#FF6B6B"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">品牌辅色</label>
                <Input
                  value={form.brandSecondaryColor}
                  onChange={(e) =>
                    setForm({ ...form, brandSecondaryColor: e.target.value })
                  }
                  placeholder="#4ECDC4"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">字体偏好</label>
                <Input
                  value={form.brandFontPreference}
                  onChange={(e) =>
                    setForm({ ...form, brandFontPreference: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">品牌调性</label>
                <Input
                  value={form.brandTone}
                  onChange={(e) =>
                    setForm({ ...form, brandTone: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">禁用词</label>
                <Input
                  value={form.brandForbiddenWords}
                  onChange={(e) =>
                    setForm({ ...form, brandForbiddenWords: e.target.value })
                  }
                  placeholder="逗号分隔，例如：最高, 第一, 绝对"
                />
                <p className="text-xs text-muted-foreground mt-1">多个禁用词用逗号分隔</p>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">视觉边界</label>
                <Input
                  value={form.brandVisualBoundary}
                  onChange={(e) =>
                    setForm({ ...form, brandVisualBoundary: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="ghost"
                onClick={closeModal}
              >
                取消
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? "保存中..." : editingId ? "保存" : "创建"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {blockedInfo && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-destructive mb-2">无法删除</h2>
            <p className="text-sm text-muted-foreground mb-4">
              该品牌包被以下资源引用，请先解除引用后再删除：
            </p>

            {blockedInfo.seriesPacks.length > 0 && (
              <div className="mb-3">
                <h3 className="text-sm font-medium text-foreground mb-1.5">
                  系列资产包 ({blockedInfo.seriesPacks.length})
                </h3>
                <ul className="space-y-1">
                  {blockedInfo.seriesPacks.map((sp) => (
                    <li key={sp.id} className="text-sm text-muted-foreground">
                      <Link
                        href={`/series-packs`}
                        className="text-primary hover:underline"
                      >
                        {sp.seriesName || sp.id}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {blockedInfo.products.length > 0 && (
              <div className="mb-3">
                <h3 className="text-sm font-medium text-foreground mb-1.5">
                  商品 ({blockedInfo.products.length})
                </h3>
                <ul className="space-y-1">
                  {blockedInfo.products.map((p) => (
                    <li key={p.id} className="text-sm text-muted-foreground">
                      <Link
                        href={`/products/${p.id}`}
                        className="text-primary hover:underline"
                      >
                        {p.productName || p.id}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end mt-4">
              <Button variant="ghost" onClick={() => setBlockedInfo(null)}>
                知道了
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function BrandPacksPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">加载中...</div>}>
      <BrandPacksPageContent />
    </Suspense>
  )
}

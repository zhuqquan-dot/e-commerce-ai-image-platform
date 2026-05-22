"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"

interface ExportPlatform {
  platform: string
  taskCount: number
}

interface ExportRecord {
  id: string
  exportScope: string
  platformPackId: string | null
  status: string
  fileCount: number
  fileUrl: string | null
  generatedAt: string | null
  createdAt: string
  downloadUrl: string
  mappingCount: number
}

interface ExportHistoryItem {
  id: string
  createdAt: string
  exportScope: string
  status: string
  fileCount: number
  manifestSummary: {
    manifestId: string
    manifestCreatedAt: string
  } | null
}

interface ExportResult {
  exportPackId: string
  fileUrl: string
}

const PLATFORM_LABELS: Record<string, string> = {
  TAOBAO_TMALL: "淘宝/天猫",
  JD: "京东",
  PINDUODUO: "拼多多",
  DOUYIN: "抖音",
  AMAZON: "Amazon",
  EBAY: "eBay",
  ETSY: "Etsy",
  SHOPIFY: "Shopify",
  TIKTOK_SHOP: "TikTok Shop",
  ALIEXPRESS: "AliExpress",
}

const SCOPE_LABELS: Record<string, string> = {
  project: "整包导出（全部平台）",
  platform: "按平台导出",
  product: "按商品导出",
}

interface ExportPreview {
  template: string
  directory: string
}

const PLATFORM_EXPORT_PREVIEWS: Record<string, ExportPreview> = {
  AMAZON: { template: "{productName}_{slotType}.jpg", directory: "AMAZON/images/" },
  TAOBAO_TMALL: { template: "主图_{position}_{productName}.{ext}", directory: "TAOBAO_TMALL/images/" },
  DOUYIN: { template: "{productName}_{slotType}.jpg", directory: "DOUYIN/images/" },
  SHOPIFY: { template: "{productName}_{slotType}.{ext}", directory: "SHOPIFY/images/" },
  JD: { template: "{productName}_{slotType}.jpg", directory: "JD/images/" },
  PINDUODUO: { template: "{productName}_{slotType}.jpg", directory: "PINDUODUO/images/" },
  EBAY: { template: "{productName}_{slotType}.jpg", directory: "EBAY/images/" },
  ETSY: { template: "{productName}_{slotType}.jpg", directory: "ETSY/images/" },
  TIKTOK_SHOP: { template: "{productName}_{slotType}.jpg", directory: "TIKTOK_SHOP/images/" },
  ALIEXPRESS: { template: "{productName}_{slotType}.jpg", directory: "ALIEXPRESS/images/" },
}

const activePreview = (platform: string): ExportPreview => {
  return PLATFORM_EXPORT_PREVIEWS[platform] || { template: "{productName}_{slotType}.jpg", directory: "{platform}/images/" }
}

export default function ExportPage() {
  const params = useParams()
  const projectId = params.id as string

  const [scope, setScope] = useState<"project" | "platform" | "product">("project")
  const [platforms, setPlatforms] = useState<ExportPlatform[]>([])
  const [selectedPlatform, setSelectedPlatform] = useState("")
  const [history, setHistory] = useState<ExportRecord[]>([])
  const [exportHistory, setExportHistory] = useState<ExportHistoryItem[]>([])

  const [loadingPlatforms, setLoadingPlatforms] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [loadingExportHistory, setLoadingExportHistory] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState("")
  const [exportResult, setExportResult] = useState<ExportResult | null>(null)

  const fetchPlatforms = useCallback(async () => {
    setLoadingPlatforms(true)
    try {
      const res = await fetch(
        `/api/projects/${projectId}/export?info=platforms`,
      )
      if (!res.ok) throw new Error("Failed")
      const data = await res.json()
      setPlatforms(data.platforms || [])
    } catch {
      setPlatforms([])
    } finally {
      setLoadingPlatforms(false)
    }
  }, [projectId])

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/export`)
      if (!res.ok) throw new Error("Failed")
      const data = await res.json()
      setHistory(data.exports || [])
    } catch {
      setHistory([])
    } finally {
      setLoadingHistory(false)
    }
  }, [projectId])

  const fetchExportHistory = useCallback(async () => {
    setLoadingExportHistory(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/export-history`)
      if (!res.ok) throw new Error("Failed")
      const data = await res.json()
      setExportHistory(data.exportHistory || [])
    } catch {
      setExportHistory([])
    } finally {
      setLoadingExportHistory(false)
    }
  }, [projectId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPlatforms()
    fetchHistory()
    fetchExportHistory()
  }, [fetchPlatforms, fetchHistory, fetchExportHistory])

  async function handleExport() {
    if ((scope === "platform" || scope === "product") && !selectedPlatform) {
      setError("请选择导出范围")
      return
    }

    setExporting(true)
    setError("")
    setExportResult(null)

    try {
      const res = await fetch(`/api/projects/${projectId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope,
          scopeValue: scope === "platform" ? selectedPlatform : "{productId}",
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || data.error || "导出失败")
      }
      setExportResult(data)
      fetchHistory()
      fetchExportHistory()
    } catch (e) {
      setError(String(e))
    } finally {
      setExporting(false)
    }
  }

  const hasPlatforms = platforms.length > 0
  const hasHistory = history.length > 0

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-blue-600 transition-colors">
            首页
          </Link>
          <span>/</span>
          <Link
            href={`/projects/${projectId}/plan`}
            className="hover:text-blue-600 transition-colors"
          >
            项目
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">导出中心</span>
        </nav>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">导出中心</h1>
          <p className="text-sm text-gray-500 mt-1">项目 ID: {projectId}</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {exportResult && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-green-600 text-xl">✓</span>
              <h2 className="text-lg font-semibold text-green-800">导出成功</h2>
            </div>
            <p className="text-sm text-green-700 mb-3">
              导出包 ID: {exportResult.exportPackId}
            </p>
            <a
              href={exportResult.fileUrl}
              download
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              下载 ZIP 包
            </a>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">导出设置</h2>

          <details className="mb-6 text-sm">
            <summary className="cursor-pointer font-medium text-gray-600 hover:text-gray-800 py-1">
              命名规则说明 {(scope === "platform" || scope === "product") && selectedPlatform ? `· ${PLATFORM_LABELS[selectedPlatform] || selectedPlatform}` : ""}
            </summary>
            <div className="mt-2 p-3 bg-gray-50 border border-gray-100 rounded space-y-2">
              {selectedPlatform || scope !== "project" ? (
                (() => {
                  const preview = activePreview(selectedPlatform || "AMAZON");
                  return (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-500">命名模板</span>
                        <code className="text-xs font-mono bg-white px-2 py-0.5 rounded border border-gray-200">
                          {preview.template}
                        </code>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">导出目录</span>
                        <code className="text-xs font-mono bg-white px-2 py-0.5 rounded border border-gray-200">
                          {preview.directory}
                        </code>
                      </div>
                      <div className="pt-1 border-t border-gray-200">
                        <div className="text-gray-500 mb-1">目录结构示意</div>
                        <pre className="text-xs font-mono text-gray-600 bg-white p-2 rounded border border-gray-200 overflow-x-auto">
{`${activePreview(selectedPlatform || "AMAZON").directory}
├── images/
│   ├── product_name_main_white.jpg
│   ├── product_name_feature.jpg
│   └── ...
├── readme.txt
└── manifest.json`}
                        </pre>
                      </div>
                    </>
                  );
                })()
              ) : (
                <>
                  <div className="text-gray-500 mb-1">选择具体平台后查看命名规则</div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(PLATFORM_EXPORT_PREVIEWS).slice(0, 4).map(([code, preview]) => (
                      <div key={code} className="text-xs bg-white px-2 py-1 rounded border border-gray-200">
                        <span className="font-medium text-gray-600">{PLATFORM_LABELS[code] || code}:</span>{" "}
                        <code className="text-gray-500">{preview.template}</code>
                      </div>
                    ))}
                    <span className="text-xs text-gray-400 self-center">...还有 6 个平台</span>
                  </div>
                </>
              )}
            </div>
          </details>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              导出范围
            </label>
            <div className="flex flex-wrap gap-3">
              {(["project", "platform", "product"] as const).map((s) => (
                <label
                  key={s}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 cursor-pointer transition-colors ${
                    scope === s
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="scope"
                    value={s}
                    checked={scope === s}
                    onChange={() => setScope(s)}
                    className="sr-only"
                  />
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      scope === s ? "border-blue-500" : "border-gray-300"
                    }`}
                  >
                    {scope === s && (
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                    )}
                  </div>
                  <span className="text-sm font-medium">{SCOPE_LABELS[s]}</span>
                </label>
              ))}
            </div>
          </div>

          {scope === "platform" && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                选择平台
              </label>
              {loadingPlatforms ? (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full" />
                  加载平台列表...
                </div>
              ) : !hasPlatforms ? (
                <p className="text-sm text-gray-400">
                  暂无已审批通过的平台任务
                </p>
              ) : (
                <select
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="">-- 请选择平台 --</option>
                  {platforms.map((p) => (
                    <option key={p.platform} value={p.platform}>
                      {PLATFORM_LABELS[p.platform] || p.platform} (
                      {p.taskCount} 个任务)
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <button
            onClick={handleExport}
            disabled={exporting || (scope === "platform" && !selectedPlatform)}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {exporting && (
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            )}
            {exporting ? "生成导出包中..." : "生成导出包"}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              历史导出记录
            </h2>
          </div>

          {loadingHistory ? (
            <div className="px-6 py-12 text-center">
              <div className="animate-spin inline-block w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full mb-4" />
              <p className="text-gray-400">加载中...</p>
            </div>
          ) : !hasHistory ? (
            <div className="px-6 py-12 text-center">
              <div className="text-4xl mb-3">📁</div>
              <p className="text-gray-500">暂无导出记录</p>
              <p className="text-sm text-gray-400 mt-1">
                生成导出包后，记录将显示在这里
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      导出包 ID
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      范围
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      平台
                    </th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">
                      文件数
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      状态
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      时间
                    </th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((record) => (
                    <tr
                      key={record.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">
                        {record.id.substring(0, 12)}...
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                          {SCOPE_LABELS[record.exportScope] || record.exportScope}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {record.platformPackId
                          ? PLATFORM_LABELS[record.platformPackId] || record.platformPackId
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500">
                        {record.fileCount}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            record.status === "completed"
                              ? "bg-green-100 text-green-700"
                              : record.status === "generating"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {record.status === "completed"
                            ? "已完成"
                            : record.status === "generating"
                              ? "生成中"
                              : record.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {record.generatedAt
                          ? new Date(record.generatedAt).toLocaleString("zh-CN")
                          : record.createdAt
                            ? new Date(record.createdAt).toLocaleString("zh-CN")
                            : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {record.status === "completed" ? (
                          <a
                            href={record.downloadUrl}
                            download
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium inline-flex items-center gap-1"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                              />
                            </svg>
                            下载
                          </a>
                        ) : (
                          <span className="text-gray-300 text-sm">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {exportHistory.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mt-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                导出历史 (Manifest)
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      导出包 ID
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      范围
                    </th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">
                      文件数
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      状态
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      导出时间
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      Manifest ID
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {exportHistory.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">
                        {item.id.substring(0, 12)}...
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                          {SCOPE_LABELS[item.exportScope] || item.exportScope}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500">
                        {item.fileCount}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            item.status === "completed"
                              ? "bg-green-100 text-green-700"
                              : item.status === "generating"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {item.status === "completed"
                            ? "已完成"
                            : item.status === "generating"
                              ? "生成中"
                              : item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {new Date(item.createdAt).toLocaleString("zh-CN")}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                        {item.manifestSummary
                          ? item.manifestSummary.manifestId.substring(0, 12) + "..."
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

"use client";

import { useRef, useState, type DragEvent } from "react";
import Link from "next/link";
import { ToastProvider, useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ImportFailure {
  rowIndex: number;
  reasons: string[];
}

interface ImportResult {
  total: number;
  successCount: number;
  failureCount: number;
  failures: ImportFailure[];
}

function ImportPageInner() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [clientSpaceId, setClientSpaceId] = useState("");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  function handleFileSelect(selectedFile: File) {
    const ext = selectedFile.name.split(".").pop()?.toLowerCase();
    if (ext !== "xlsx" && ext !== "csv") {
      toast("仅支持 .xlsx 和 .csv 格式文件", "error");
      return;
    }
    setFile(selectedFile);
    setResult(null);
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelect(dropped);
  }

  async function handleImport() {
    if (!file) {
      toast("请先选择文件", "error");
      return;
    }
    if (!clientSpaceId.trim()) {
      toast("请输入客户空间ID", "error");
      return;
    }

    setUploading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("clientSpaceId", clientSpaceId.trim());

      const res = await fetch("/api/products/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "导入失败");
      }

      setResult(data);
      if (data.failureCount === 0) {
        toast(`导入成功，共 ${data.successCount} 条`, "success");
      } else {
        toast(
          `导入完成：成功 ${data.successCount} 条，失败 ${data.failureCount} 条`,
          data.failureCount > 0 ? "error" : "success"
        );
      }
    } catch (e) {
      toast(String(e), "error");
    } finally {
      setUploading(false);
    }
  }

  function handleClear() {
    setFile(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <div>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link
            href="/products"
            className="hover:text-primary transition-colors"
          >
            商品库
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">批量导入</span>
        </nav>

        <h1 className="text-2xl font-bold text-foreground mb-8">批量导入商品</h1>

        <div className="bg-card border border-border rounded-xl p-6 space-y-6">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              客户空间ID <span className="text-destructive">*</span>
            </label>
            <Input
              value={clientSpaceId}
              onChange={(e) => setClientSpaceId(e.target.value)}
              placeholder="输入 clientSpaceId"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              导入文件 <span className="text-destructive">*</span>
            </label>
            <div
              className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors cursor-pointer ${
                dragging
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary hover:bg-secondary"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.csv"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                }}
                className="hidden"
              />
              {file ? (
                <div className="space-y-1">
                  <div className="text-primary font-medium">{file.name}</div>
                  <div className="text-sm text-muted-foreground/70">
                    {(file.size / 1024).toFixed(1)} KB
                  </div>
                  <div className="text-xs text-muted-foreground/70">
                    点击重新选择或拖拽新文件
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-4xl text-muted-foreground/50">📄</div>
                  <div className="text-muted-foreground font-medium">
                    拖拽文件到此处，或点击选择文件
                  </div>
                  <div className="text-sm text-muted-foreground/70">
                    支持 .xlsx / .csv 格式
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="primary"
              loading={uploading}
              disabled={!file}
              onClick={handleImport}
              className="flex-1"
            >
              开始导入
            </Button>
            <Button
              variant="ghost"
              disabled={uploading}
              onClick={handleClear}
            >
              清除
            </Button>
          </div>
        </div>

        {result && (
          <div className="mt-6 bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              导入结果
            </h2>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-secondary rounded-lg">
                <div className="text-2xl font-bold text-foreground">
                  {result.total}
                </div>
                <div className="text-sm text-muted-foreground/70">总计</div>
              </div>
              <div className="text-center p-4 bg-emerald-50 rounded-lg">
                <div className="text-2xl font-bold text-emerald-600">
                  {result.successCount}
                </div>
                <div className="text-sm text-emerald-600">成功</div>
              </div>
              <div className="text-center p-4 bg-destructive/10 rounded-lg">
                <div className="text-2xl font-bold text-destructive">
                  {result.failureCount}
                </div>
                <div className="text-sm text-destructive">失败</div>
              </div>
            </div>

            {result.failures.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-destructive mb-3">
                  失败明细
                </h3>
                <div className="border border-destructive/20 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-destructive/10">
                        <th className="text-left px-4 py-2 font-medium text-destructive">
                          行号
                        </th>
                        <th className="text-left px-4 py-2 font-medium text-destructive">
                          错误原因
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.failures.map((f) => (
                        <tr
                          key={f.rowIndex}
                          className="border-t border-destructive/20"
                        >
                          <td className="px-4 py-2 text-destructive font-mono">
                            第 {f.rowIndex} 行
                          </td>
                          <td className="px-4 py-2 text-destructive">
                            {f.reasons.join("；")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-center">
          <Link href="/products">
            <Button variant="outline">返回商品库</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ImportPage() {
  return (
    <ToastProvider>
      <ImportPageInner />
    </ToastProvider>
  );
}

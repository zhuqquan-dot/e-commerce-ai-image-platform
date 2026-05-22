"use client";

import { ToastProvider } from "@/components/toast";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/auth/api-guard";
import { PluginRegistryService } from "@/ecosystem/plugin-registry-service";

const pluginRegistryService = new PluginRegistryService();

async function handleDELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await pluginRegistryService.removePlugin(id);
    return NextResponse.json({ success: true, message: "插件已删除" });
  } catch (error) {
    return NextResponse.json(
      { error: "删除插件失败", message: String(error) },
      { status: 500 }
    );
  }
}

export const DELETE = requireAuth(requireRole("owner", "admin")(handleDELETE));

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/auth/api-guard";
import { PluginRegistryService } from "@/ecosystem/plugin-registry-service";

const pluginRegistryService = new PluginRegistryService();

async function handlePUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const plugin = await pluginRegistryService.enablePlugin(id);
    return NextResponse.json(plugin);
  } catch (error) {
    return NextResponse.json(
      { error: "启用插件失败", message: String(error) },
      { status: 500 }
    );
  }
}

export const PUT = requireAuth(requireRole("owner", "admin")(handlePUT));

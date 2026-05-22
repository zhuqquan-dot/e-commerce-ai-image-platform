import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireRole } from "@/auth/api-guard";
import { PluginRegistryService } from "@/ecosystem/plugin-registry-service";

const pluginRegistryService = new PluginRegistryService();

const pluginCreateSchema = z.object({
  name: z.string().min(1, "名称必填"),
  description: z.string().optional(),
  entryRoute: z.string().optional(),
  lifecycleHooks: z.array(z.string()).optional(),
  requiredPermissions: z.array(z.string()).optional(),
  version: z.string().optional(),
});

async function handleGET() {
  try {
    const list = await pluginRegistryService.listPlugins();
    return NextResponse.json({ list });
  } catch (error) {
    return NextResponse.json(
      { error: "查询插件列表失败", message: String(error) },
      { status: 500 }
    );
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = pluginCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "校验失败", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const plugin = await pluginRegistryService.registerPlugin(parsed.data);
    return NextResponse.json(plugin, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "注册插件失败", message: String(error) },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(handleGET);
export const POST = requireAuth(requireRole("owner", "admin")(handlePOST));

import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export class ApiKeyService {
  async createApiKey(
    workspaceId: string,
    name: string,
    rateLimit?: number
  ) {
    const key = "mircioo_" + crypto.randomBytes(32).toString("hex");
    const keyHash = crypto.createHash("sha256").update(key).digest("hex");
    const keyPrefix = key.substring(0, 8);
    const limit = rateLimit ?? 100;

    const apiKey = await prisma.apiKey.create({
      data: {
        workspaceId,
        name,
        keyHash,
        keyPrefix,
        rateLimit: limit,
      },
    });

    return {
      id: apiKey.id,
      name: apiKey.name,
      key,
      keyPrefix: apiKey.keyPrefix,
      status: apiKey.status,
      rateLimit: apiKey.rateLimit,
    };
  }

  async listApiKeys(workspaceId: string) {
    const keys = await prisma.apiKey.findMany({
      where: { workspaceId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        status: true,
        rateLimit: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return keys;
  }

  async disableApiKey(id: string) {
    return prisma.apiKey.update({
      where: { id },
      data: { status: "disabled" },
    });
  }

  async deleteApiKey(id: string) {
    return prisma.apiKey.delete({
      where: { id },
    });
  }

  async validateApiKey(apiKey: string) {
    const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

    const record = await prisma.apiKey.findFirst({
      where: { keyHash, status: "active" },
    });

    if (!record) {
      return { valid: false as const };
    }

    if (record.expiresAt && record.expiresAt < new Date()) {
      return { valid: false as const };
    }

    await prisma.apiKey.update({
      where: { id: record.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      valid: true as const,
      workspaceId: record.workspaceId,
      apiKeyId: record.id,
    };
  }
}

import { prisma } from "@/lib/prisma";

export function logApiCall(data: {
  apiKeyId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  ip?: string;
  userAgent?: string;
}) {
  prisma.apiCallLog.create({ data }).catch(() => {});
}

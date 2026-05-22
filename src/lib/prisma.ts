import { PrismaClient } from "@/generated/prisma";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "node:path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export function createPrismaClient() {
  const dbUrl = process.env["DATABASE_URL"] ?? "file:./dev.db";
  const dbPath = dbUrl.startsWith("file:")
    ? dbUrl.replace("file:", "").replace(/^\.\//, "")
    : dbUrl;
  const absoluteDbPath = path.resolve(dbPath);

  const adapter = new PrismaBetterSqlite3({ url: absoluteDbPath });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

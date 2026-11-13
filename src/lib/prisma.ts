import { PrismaClient } from "@prisma/client";

if (!process.env.DATABASE_URL) {
  console.error("CRITICAL: DATABASE_URL is missing in environment variables!");
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

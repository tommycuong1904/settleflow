import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const testDatasourceUrl =
  process.env.NODE_ENV === "test" ? process.env.SETTLEFLOW_TEST_DATABASE_URL : undefined;

export const db = globalForPrisma.prisma ?? new PrismaClient(
  testDatasourceUrl ? { datasourceUrl: testDatasourceUrl } : undefined,
);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

import { PrismaClient } from "@prisma/client";
import { getTestDatabaseUrl } from "@/test/support/test-db";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

// Fail closed under NODE_ENV=test: require the dedicated isolated test database
// instead of silently falling back to DATABASE_URL (the development database).
const testDatasourceUrl =
  process.env.NODE_ENV === "test" ? getTestDatabaseUrl() : undefined;

export const db = globalForPrisma.prisma ?? new PrismaClient(
  testDatasourceUrl ? { datasourceUrl: testDatasourceUrl } : undefined,
);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { PrismaClient } from "@prisma/client";

const execFileAsync = promisify(execFile);

export class TestDatabaseConfigurationError extends Error {}

function requireTestMode(): void {
  if (process.env.NODE_ENV !== "test") {
    throw new TestDatabaseConfigurationError(
      'Test database operations require NODE_ENV="test".',
    );
  }
}

export function getTestDatabaseUrl(): string {
  requireTestMode();
  const value = process.env.SETTLEFLOW_TEST_DATABASE_URL;
  if (!value) {
    throw new TestDatabaseConfigurationError("Test database URL is required.");
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new TestDatabaseConfigurationError("Test database URL is invalid.");
  }

  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    throw new TestDatabaseConfigurationError("Test database URL must use PostgreSQL.");
  }

  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  if (!localHosts.has(parsed.hostname)) {
    throw new TestDatabaseConfigurationError("Test database host is not allowed.");
  }

  const databaseName = decodeURIComponent(parsed.pathname.slice(1));
  if (!databaseName || !databaseName.endsWith("_test")) {
    throw new TestDatabaseConfigurationError('Test database name must end with "_test".');
  }

  return value;
}

export function createTestPrismaClient(): PrismaClient {
  const datasourceUrl = getTestDatabaseUrl();
  return new PrismaClient({ datasourceUrl });
}

export async function deployTestMigrations(): Promise<void> {
  const datasourceUrl = getTestDatabaseUrl();
  await execFileAsync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["prisma", "migrate", "deploy"],
    {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: datasourceUrl, NODE_ENV: "test" },
      maxBuffer: 1024 * 1024,
    },
  );
}

export async function withTestDatabase<T>(
  operation: (db: PrismaClient) => Promise<T>,
): Promise<T> {
  const db = createTestPrismaClient();
  try {
    return await operation(db);
  } finally {
    await db.$disconnect();
  }
}

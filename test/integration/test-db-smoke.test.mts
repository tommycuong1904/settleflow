import assert from "node:assert/strict";
import { test } from "node:test";
import { PrismaClient } from "@prisma/client";
import {
  TestDatabaseConfigurationError,
  createTestPrismaClient,
  deployTestMigrations,
  getTestDatabaseUrl,
} from "../support/test-db";

function withEnv(values: Record<string, string | undefined>, callback: () => void): void {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(values)) {
    previous.set(key, process.env[key]);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    callback();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("missing test URL fails closed", () => {
  withEnv({ NODE_ENV: "test", SETTLEFLOW_TEST_DATABASE_URL: undefined }, () => {
    assert.throws(() => getTestDatabaseUrl(), TestDatabaseConfigurationError);
  });
});

test("development database name is rejected", () => {
  withEnv({ NODE_ENV: "test", SETTLEFLOW_TEST_DATABASE_URL: "postgresql://user:pass@localhost:5432/settleflow" }, () => {
    assert.throws(() => getTestDatabaseUrl(), /must end with/);
  });
});

test("non-test database name is rejected", () => {
  withEnv({ NODE_ENV: "test", SETTLEFLOW_TEST_DATABASE_URL: "postgresql://user:pass@localhost:5432/foo" }, () => {
    assert.throws(() => getTestDatabaseUrl(), /must end with/);
  });
});

test("unsafe remote host is rejected", () => {
  withEnv({ NODE_ENV: "test", SETTLEFLOW_TEST_DATABASE_URL: "postgresql://user:pass@example.com:5432/settleflow_test" }, () => {
    assert.throws(() => getTestDatabaseUrl(), /host is not allowed/);
  });
});

test("valid test target is accepted without exposing credentials", () => {
  withEnv({ NODE_ENV: "test", SETTLEFLOW_TEST_DATABASE_URL: "postgresql://user:secret@localhost:5432/settleflow_test" }, () => {
    assert.equal(getTestDatabaseUrl(), process.env.SETTLEFLOW_TEST_DATABASE_URL);
  });
});

test("database smoke test runs only when a dedicated test database is configured", { skip: !process.env.SETTLEFLOW_TEST_DATABASE_URL }, async (t) => {
  await deployTestMigrations();
  const db: PrismaClient = createTestPrismaClient();
  try {
    await db.$queryRaw`SELECT 1`;
    t.diagnostic("Dedicated test database connected and migrations deployed.");
  } finally {
    await db.$disconnect();
  }
});

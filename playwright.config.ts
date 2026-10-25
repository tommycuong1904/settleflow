import { defineConfig, devices } from "@playwright/test";

const testDatabaseUrl = process.env.SETTLEFLOW_TEST_DATABASE_URL;
const authenticatedSuiteEnabled = Boolean(testDatabaseUrl);
const useDevelopmentServer = process.env.SETTLEFLOW_E2E_DEV_SERVER === "true";
const serverPort = authenticatedSuiteEnabled ? 3101 : 3000;

export default defineConfig({
  testDir: "./test/e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${serverPort}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: authenticatedSuiteEnabled
      ? useDevelopmentServer
        ? "NODE_ENV=development SETTLEFLOW_NEXT_DIST_DIR=.next-e2e npx next dev --hostname 127.0.0.1 --port 3101"
        : "NODE_ENV=production npx next start --hostname 127.0.0.1 --port 3101"
      : "NODE_ENV=development npx next dev --hostname 127.0.0.1 --port 3000",
    url: `http://127.0.0.1:${serverPort}`,
    reuseExistingServer: !process.env.CI && (!authenticatedSuiteEnabled || useDevelopmentServer),
    env: authenticatedSuiteEnabled
      ? { DATABASE_URL: testDatabaseUrl!, SETTLEFLOW_AUTH_SECRET: "e2e-test-session-secret" }
      : {},
  },
});

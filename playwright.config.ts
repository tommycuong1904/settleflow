import { defineConfig, devices } from "@playwright/test";

const testDatabaseUrl = process.env.SETTLEFLOW_TEST_DATABASE_URL;
const authenticatedSuiteEnabled = Boolean(testDatabaseUrl);

export default defineConfig({
  testDir: "./test/e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: authenticatedSuiteEnabled ? "http://127.0.0.1:3101" : "http://127.0.0.1:3000",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: authenticatedSuiteEnabled
      ? "NODE_ENV=production npx next start --hostname 127.0.0.1 --port 3101"
      : "NODE_ENV=development npx next dev --hostname 127.0.0.1 --port 3000",
    url: authenticatedSuiteEnabled ? "http://127.0.0.1:3101" : "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI && !authenticatedSuiteEnabled,
    env: authenticatedSuiteEnabled
      ? { DATABASE_URL: testDatabaseUrl!, SETTLEFLOW_AUTH_SECRET: "e2e-test-session-secret" }
      : {},
  },
});

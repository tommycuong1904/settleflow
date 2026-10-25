/**
 * Checks the non-secret staging configuration contract before deployment.
 * It never connects to the database/RPC, reads wallet keys, or enables payments.
 */

type Check = { label: string; passed: boolean; detail: string };

const environment = process.env as Record<string, string | undefined>;
const checks: Check[] = [];

function add(label: string, passed: boolean, detail: string) {
  checks.push({ label, passed, detail });
}

function required(name: string) {
  const value = environment[name]?.trim();
  add(name, Boolean(value), value ? "configured" : "missing");
  return value;
}

const databaseUrl = required("DATABASE_URL");
if (databaseUrl) {
  try {
    const database = new URL(databaseUrl);
    add("DATABASE_URL database name", !database.pathname.replace(/^\//, "").endsWith("_test"), "must not target a *_test database");
  } catch {
    add("DATABASE_URL format", false, "must be a valid connection URL");
  }
}

const authSecret = required("SETTLEFLOW_AUTH_SECRET");
if (authSecret) {
  add("SETTLEFLOW_AUTH_SECRET strength", /^[a-f0-9]{64,}$/i.test(authSecret), "must be a staging-only hex value with at least 64 characters");
}

add(
  "SETTLEFLOW_REAL_EXECUTION_AUTHORIZATION",
  environment.SETTLEFLOW_REAL_EXECUTION_AUTHORIZATION === "disabled",
  "must be exactly disabled during staging provisioning",
);
add(
  "NEXT_PUBLIC_ARC_EXECUTION_MODE",
  environment.NEXT_PUBLIC_ARC_EXECUTION_MODE === "mock",
  "must be mock during staging provisioning",
);
add(
  "NEXT_PUBLIC_ARC_CHAIN_ID",
  environment.NEXT_PUBLIC_ARC_CHAIN_ID === "5042002",
  "must be Arc Testnet chain ID 5042002",
);

for (const name of ["NEXT_PUBLIC_ARC_RPC_URL", "NEXT_PUBLIC_ARC_EXPLORER_URL"] as const) {
  const value = required(name);
  if (value) {
    try {
      add(`${name} protocol`, new URL(value).protocol === "https:", "must use HTTPS");
    } catch {
      add(`${name} format`, false, "must be a valid HTTPS URL");
    }
  }
}

required("NEXT_PUBLIC_GOOGLE_CLIENT_ID");

const webhookUrl = environment.SETTLEFLOW_WEBHOOK_URL?.trim();
if (!webhookUrl) {
  add("SETTLEFLOW_WEBHOOK_URL", true, "disabled (allowed for initial staging)");
} else {
  try {
    add("SETTLEFLOW_WEBHOOK_URL", ["https:", "http:"].includes(new URL(webhookUrl).protocol), "must be a staging-only HTTP(S) endpoint");
  } catch {
    add("SETTLEFLOW_WEBHOOK_URL", false, "must be a valid HTTP(S) URL or unset");
  }
}

const publicSecretNames = Object.keys(environment).filter((name) =>
  name.startsWith("NEXT_PUBLIC_") && /(PRIVATE_KEY|AUTH_SECRET|DATABASE_URL)/.test(name),
);
add(
  "No public secrets",
  publicSecretNames.length === 0,
  publicSecretNames.length === 0 ? "no forbidden NEXT_PUBLIC_* variables found" : "remove public secret variables",
);

const serverKeyPresent = Boolean(environment.ARC_SERVER_PRIVATE_KEY?.trim());
add(
  "ARC_SERVER_PRIVATE_KEY",
  !serverKeyPresent,
  serverKeyPresent
    ? "present: only allowed for a separately authorized server-executor/Circle test"
    : "absent (expected for browser-wallet staging)",
);

for (const check of checks) {
  console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}: ${check.detail}`);
}

const failed = checks.filter((check) => !check.passed);
if (failed.length > 0) {
  console.error(`\nStaging readiness failed: ${failed.length} check(s) need attention. No payment configuration was changed.`);
  process.exitCode = 1;
} else {
  console.log("\nStaging configuration passes the static readiness checks. This does not authorize any transaction.");
}

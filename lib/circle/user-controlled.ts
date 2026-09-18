import { randomUUID } from "node:crypto";

const CIRCLE_API_URL = "https://api.circle.com";
export const CIRCLE_ARC_TESTNET = "ARC-TESTNET";

type CircleEnvelope<T> = { data: T };

export type CircleSession = {
  userToken: string;
  encryptionKey: string;
};

export type CircleChallenge = {
  id: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETE" | "FAILED" | "EXPIRED";
  type: string;
  correlationIds?: string[];
  errorMessage?: string;
};

export type CircleWallet = {
  id: string;
  address: string;
  blockchain: string;
  accountType: "SCA" | "EOA";
  scaCore?: string;
};

export type CircleTransaction = {
  id: string;
  state: "INITIATED" | "PENDING_RISK_SCREENING" | "QUEUED" | "SENT" | "CONFIRMED" | "COMPLETE" | "FAILED" | "CANCELLED";
  blockchain: string;
  sourceAddress?: string;
  destinationAddress?: string;
  amounts?: string[];
  txHash?: string;
  errorReason?: string;
};

export class CircleConfigurationError extends Error {
  constructor() {
    super("CIRCLE_USER_CONTROLLED_NOT_CONFIGURED");
  }
}

export class CircleApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: number | undefined,
    message: string,
  ) {
    super(message);
  }
}

export function getCircleUserControlledConfig() {
  const apiKey = process.env.CIRCLE_USER_CONTROLLED_API_KEY;
  const appId = process.env.NEXT_PUBLIC_CIRCLE_USER_CONTROLLED_APP_ID;
  const enabled = process.env.CIRCLE_USER_CONTROLLED_ENABLED === "true";
  if (!enabled || !apiKey || !appId) throw new CircleConfigurationError();
  return { apiKey, appId };
}

export function isCircleUserControlledConfigured(): boolean {
  try {
    getCircleUserControlledConfig();
    return true;
  } catch {
    return false;
  }
}

async function circleRequest<T>(
  path: string,
  options: { method?: "GET" | "POST"; body?: unknown; userToken?: string } = {},
): Promise<T> {
  const { apiKey } = getCircleUserControlledConfig();
  const response = await fetch(`${CIRCLE_API_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-Request-Id": randomUUID(),
      ...(options.userToken ? { "X-User-Token": options.userToken } : {}),
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as
    | CircleEnvelope<T>
    | { code?: number; message?: string }
    | null;
  if (!response.ok || !payload || !("data" in payload)) {
    const error = payload && "message" in payload ? payload.message : `Circle request failed (${response.status}).`;
    const code = payload && "code" in payload ? payload.code : undefined;
    throw new CircleApiError(response.status, code, error ?? `Circle request failed (${response.status}).`);
  }
  return payload.data;
}

export async function ensureCircleUser(userId: string): Promise<void> {
  try {
    await circleRequest<{ user: { userId: string } }>("/v1/w3s/users", {
      method: "POST",
      body: { userId },
    });
  } catch (error) {
    // Circle reports an existing external user as a conflict / known API code.
    if (error instanceof CircleApiError && (error.status === 409 || error.code === 155101)) return;
    throw error;
  }
}

export async function createCircleUserSession(userId: string): Promise<CircleSession> {
  await ensureCircleUser(userId);
  return circleRequest<CircleSession>("/v1/w3s/users/token", {
    method: "POST",
    body: { userId },
  });
}

export async function getCircleChallenge(userToken: string, challengeId: string): Promise<CircleChallenge> {
  const result = await circleRequest<{ challenge: CircleChallenge }>(
    `/v1/w3s/user/challenges/${encodeURIComponent(challengeId)}`,
    { userToken },
  );
  return result.challenge;
}

export async function getCircleWallet(userToken: string, walletId: string): Promise<CircleWallet> {
  const result = await circleRequest<{ wallet: CircleWallet }>(
    `/v1/w3s/wallets/${encodeURIComponent(walletId)}`,
    { userToken },
  );
  return result.wallet;
}

export async function listCircleWallets(userToken: string): Promise<CircleWallet[]> {
  const result = await circleRequest<{ wallets: CircleWallet[] }>("/v1/w3s/wallets", { userToken });
  return result.wallets;
}

export async function createCircleWalletInitializationChallenge(
  userToken: string,
  idempotencyKey: string,
): Promise<string> {
  const result = await circleRequest<{ challengeId: string }>("/v1/w3s/user/initialize", {
    method: "POST",
    userToken,
    body: {
      idempotencyKey,
      accountType: "SCA",
      blockchains: [CIRCLE_ARC_TESTNET],
    },
  });
  return result.challengeId;
}

export async function createCircleTransferChallenge(input: {
  userToken: string;
  walletId: string;
  destinationAddress: string;
  amount: string;
  tokenAddress: string;
  idempotencyKey: string;
}): Promise<string> {
  const result = await circleRequest<{ challengeId: string }>("/v1/w3s/user/transactions/transfer", {
    method: "POST",
    userToken: input.userToken,
    body: {
      idempotencyKey: input.idempotencyKey,
      walletId: input.walletId,
      destinationAddress: input.destinationAddress,
      amounts: [input.amount],
      tokenAddress: input.tokenAddress,
      blockchain: CIRCLE_ARC_TESTNET,
      feeLevel: "MEDIUM",
    },
  });
  return result.challengeId;
}

export async function getCircleTransaction(userToken: string, transactionId: string): Promise<CircleTransaction> {
  const result = await circleRequest<{ transaction: CircleTransaction }>(
    `/v1/w3s/transactions/${encodeURIComponent(transactionId)}`,
    { userToken },
  );
  return result.transaction;
}

export function selectArcSmartWallet(wallets: CircleWallet[]): CircleWallet | null {
  return wallets.find((wallet) => wallet.blockchain === CIRCLE_ARC_TESTNET && wallet.accountType === "SCA") ?? null;
}

export function assertArcSmartWallet(wallet: CircleWallet): void {
  if (wallet.blockchain !== CIRCLE_ARC_TESTNET || wallet.accountType !== "SCA") {
    throw new Error("CIRCLE_ARC_SMART_WALLET_REQUIRED");
  }
}

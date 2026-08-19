import { db } from "@/lib/db/client";

export type ContributorListItem = {
  id: string;
  displayName: string;
  walletAddress: string;
  email?: string;
  role?: string;
  notes?: string;
  status: "active" | "archived";
  createdAt: string;
  payoutCount: number;
  activePayoutCount: number;
  totalSettledUsdc: number;
};

export type CreateContributorInput = {
  workspaceId: string;
  name: string;
  walletAddress: string;
  email?: string;
  role?: string;
  notes?: string;
};

function isValidEvmAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address.trim());
}

export async function listContributors(input?: {
  workspaceId?: string;
  status?: "active" | "archived";
  search?: string;
}): Promise<ContributorListItem[]> {
  const contributors = await db.contributor.findMany({
    where: {
      workspaceId: input?.workspaceId,
      status: input?.status,
      ...(input?.search
        ? {
            OR: [
              { name: { contains: input.search, mode: "insensitive" } },
              { walletAddress: { contains: input.search, mode: "insensitive" } },
              { role: { contains: input.search, mode: "insensitive" } },
              { email: { contains: input.search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      walletAddress: true,
      role: true,
      notes: true,
      status: true,
      createdAt: true,
      payouts: {
        select: {
          id: true,
          status: true,
          totalAmountUsdc: true,
        },
      },
    },
  });

  return contributors.map((c) => {
    const payouts = c.payouts || [];
    const activePayouts = payouts.filter((p) =>
      ["active", "partially_released"].includes(p.status),
    );
    const completedPayouts = payouts.filter((p) => p.status === "completed");
    const totalSettled = completedPayouts.reduce(
      (sum, p) => sum + Number(p.totalAmountUsdc),
      0,
    );

    return {
      id: c.id,
      displayName: c.name,
      walletAddress: c.walletAddress,
      email: c.email || undefined,
      role: c.role || undefined,
      notes: c.notes || undefined,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
      payoutCount: payouts.length,
      activePayoutCount: activePayouts.length,
      totalSettledUsdc: totalSettled,
    };
  });
}

export async function createContributor(
  input: CreateContributorInput,
): Promise<ContributorListItem> {
  const name = input.name.trim();
  const walletAddress = input.walletAddress.trim();

  if (!name) {
    throw new Error("Contributor name is required.");
  }

  if (!isValidEvmAddress(walletAddress)) {
    throw new Error("Invalid EVM wallet address. Must start with 0x and have 40 hexadecimal characters.");
  }

  const existing = await db.contributor.findFirst({
    where: {
      workspaceId: input.workspaceId,
      walletAddress: { equals: walletAddress, mode: "insensitive" },
    },
  });

  if (existing) {
    throw new Error("A contributor with this wallet address already exists in this workspace.");
  }

  const created = await db.contributor.create({
    data: {
      workspaceId: input.workspaceId,
      name,
      walletAddress,
      email: input.email?.trim() || null,
      role: input.role?.trim() || null,
      notes: input.notes?.trim() || null,
      status: "active",
    },
  });

  return {
    id: created.id,
    displayName: created.name,
    walletAddress: created.walletAddress,
    email: created.email || undefined,
    role: created.role || undefined,
    notes: created.notes || undefined,
    status: created.status,
    createdAt: created.createdAt.toISOString(),
    payoutCount: 0,
    activePayoutCount: 0,
    totalSettledUsdc: 0,
  };
}

import { Prisma } from "@prisma/client";
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

export type UpdateContributorInput = {
  name?: string;
  walletAddress?: string;
  email?: string | null;
  role?: string | null;
  notes?: string | null;
  status?: "active" | "archived";
};

type ContributorRow = {
  id: string;
  name: string;
  email: string | null;
  walletAddress: string;
  role: string | null;
  notes: string | null;
  status: "active" | "archived";
  createdAt: Date;
  payouts?: Array<{ id: string; status: string; totalAmountUsdc: unknown }>;
};

function toContributorListItem(c: ContributorRow): ContributorListItem {
  const payouts = c.payouts ?? [];
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

  return contributors.map(toContributorListItem);
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

  return toContributorListItem(created);
}

export async function updateContributor(
  contributorId: string,
  input: UpdateContributorInput,
  workspaceId?: string,
): Promise<ContributorListItem> {
  const existing = await db.contributor.findUnique({
    where: { id: contributorId },
    select: { id: true, workspaceId: true },
  });
  if (!existing) throw new Error("CONTRIBUTOR_NOT_FOUND");
  if (workspaceId && existing.workspaceId !== workspaceId) {
    throw new Error("CONTRIBUTOR_WORKSPACE_MISMATCH");
  }

  const data: Prisma.ContributorUpdateInput = {};

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new Error("Contributor name is required.");
    data.name = name;
  }

  if (input.walletAddress !== undefined) {
    const walletAddress = input.walletAddress.trim();
    if (!isValidEvmAddress(walletAddress)) {
      throw new Error("Invalid EVM wallet address. Must start with 0x and have 40 hexadecimal characters.");
    }
    const duplicate = await db.contributor.findFirst({
      where: {
        workspaceId: existing.workspaceId,
        walletAddress: { equals: walletAddress, mode: "insensitive" },
        id: { not: contributorId },
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new Error("A contributor with this wallet address already exists in this workspace.");
    }
    data.walletAddress = walletAddress;
  }

  if (input.email !== undefined) data.email = input.email?.trim() || null;
  if (input.role !== undefined) data.role = input.role?.trim() || null;
  if (input.notes !== undefined) data.notes = input.notes?.trim() || null;
  if (input.status !== undefined) data.status = input.status;

  const updated = await db.contributor.update({
    where: { id: contributorId },
    data,
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
        select: { id: true, status: true, totalAmountUsdc: true },
      },
    },
  });

  return toContributorListItem(updated);
}

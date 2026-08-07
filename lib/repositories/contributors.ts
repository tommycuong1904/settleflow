import { db } from "@/lib/db/client";

export type ContributorListItem = {
  id: string;
  displayName: string;
  walletAddress: string;
  status: "active" | "archived";
};

type ContributorRecord = {
  id: string;
  name: string;
  walletAddress: string;
  status: "active" | "archived";
};

function toListItem(contributor: ContributorRecord): ContributorListItem {
  return {
    id: contributor.id,
    displayName: contributor.name,
    walletAddress: contributor.walletAddress,
    status: contributor.status,
  };
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
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      walletAddress: true,
      status: true,
    },
  });

  return contributors.map(toListItem);
}

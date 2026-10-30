/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client");

const db = new PrismaClient();

// --- Constants ---
const WS_ID = "ws-demo";
const LEGACY_CREATOR_ID = "user-owner";
const DEMO_OWNER_ID = "user-owner-tommycuong";
const REVIEWER_ID = "user-reviewer";
const CONTRIB_USER_ID = "user-contrib";
const RETIRED_PAYOUT_IDS = ["payout-1", "payout-2"];
const RETIRED_MILESTONE_IDS = ["ms-1", "ms-2", "ms-3", "ms-4"];

const contributors = [
  ["contrib-1", "Lena Tran", "0x7A12c84Ba6A5d2b116f45D3f9a3E0cA4B0Cd4b91", "Brand designer"],
  ["contrib-2", "Marcus Vale", "0x1A98bF14A4e5B9A68d8d9B4e6f2246F51C3D4A20", "Security QA"],
  ["contrib-3", "Nora Kim", "0x6B175474E89094C44Da98b954EedeAC495271d0F", "Growth writer"],
];

async function main() {
  console.log("🌱 Seeding SettleFlow DB...");

  // --- Workspace ---
  await db.workspace.upsert({
    where: { id: WS_ID },
    update: { name: "SettleFlow Demo", slug: "settleflow-demo" },
    create: { id: WS_ID, name: "SettleFlow Demo", slug: "settleflow-demo" },
  });

  // --- Users ---
  const users = [
    [LEGACY_CREATOR_ID, "Alex Chen (Owner)", "owner@settleflow.xyz"],
    [REVIEWER_ID, "Sarah QA (Reviewer)", "reviewer@settleflow.xyz"],
    [CONTRIB_USER_ID, "David Builder (Contributor)", "contributor@settleflow.xyz"],
    ["user-owner-local", "Demo Owner", "owner@settleflow.local"],
    ["user-reviewer-local", "Demo Reviewer", "reviewer@settleflow.local"],
    ["user-contrib-local", "Nora Kim (linked)", "nora@settleflow.local"],
    [DEMO_OWNER_ID, "Tommy Cuong", "tommycuong1904@gmail.com"],
    ["user-google-owner", "Alex Turner", "alex.turner@gmail.com"],
  ];

  for (const [id, displayName, email] of users) {
    await db.user.upsert({
      where: { id },
      update: { displayName, email },
      create: { id, displayName, email },
    });
  }

  // --- Workspace Members ---
  const members = [
    [DEMO_OWNER_ID, "owner"],
    [REVIEWER_ID, "reviewer"],
    [CONTRIB_USER_ID, "contributor"],
    ["user-reviewer-local", "reviewer"],
    ["user-contrib-local", "contributor"],
  ];

  // The demo workspace intentionally has one financial authority. Remove
  // obsolete seeded Owner memberships while retaining their User records for
  // payout provenance and historical test data.
  await db.workspaceMember.deleteMany({
    where: {
      workspaceId: WS_ID,
      role: "owner",
      userId: { not: DEMO_OWNER_ID },
    },
  });

  for (const [userId, role] of members) {
    await db.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: WS_ID, userId } },
      update: {},
      create: { workspaceId: WS_ID, userId, role },
    });
  }

  // --- Contributors ---
  for (const [id, name, walletAddress, role] of contributors) {
    await db.contributor.upsert({
      where: { id },
      update: { name, walletAddress, role, workspaceId: WS_ID, status: "active" },
      create: {
        id,
        workspaceId: WS_ID,
        name,
        walletAddress,
        role,
        ...(id === "contrib-3" ? { linkedUserId: CONTRIB_USER_ID } : {}),
      },
    });
  }

  // Retire the two old fixtures from every seeded database. Their numeric
  // route IDs were confusing in the UI and Payout 2 carried inconsistent
  // payment data. Delete dependent records first because several financial
  // relations intentionally use Restrict in the production schema.
  await db.$transaction(async (tx) => {
    await tx.activityLog.deleteMany({
      where: {
        OR: [
          { payoutId: { in: RETIRED_PAYOUT_IDS } },
          { milestoneId: { in: RETIRED_MILESTONE_IDS } },
        ],
      },
    });
    await tx.transactionProof.deleteMany({
      where: {
        OR: [
          { payoutId: { in: RETIRED_PAYOUT_IDS } },
          { milestoneId: { in: RETIRED_MILESTONE_IDS } },
        ],
      },
    });
    await tx.paymentAttempt.deleteMany({ where: { milestoneId: { in: RETIRED_MILESTONE_IDS } } });
    await tx.release.deleteMany({
      where: {
        OR: [
          { payoutId: { in: RETIRED_PAYOUT_IDS } },
          { milestoneId: { in: RETIRED_MILESTONE_IDS } },
        ],
      },
    });
    await tx.milestoneReview.deleteMany({ where: { milestoneId: { in: RETIRED_MILESTONE_IDS } } });
    await tx.milestoneSubmission.deleteMany({ where: { milestoneId: { in: RETIRED_MILESTONE_IDS } } });
    await tx.milestone.deleteMany({ where: { id: { in: RETIRED_MILESTONE_IDS } } });
    await tx.payout.deleteMany({ where: { id: { in: RETIRED_PAYOUT_IDS } } });
  });

  // ============================================================
  // Payout 3: "Landing Page Polish" — draft (not active yet)
  //   ms-5: pending
  // ============================================================
  await db.payout.upsert({
    where: { id: "payout-3" },
    update: {},
    create: {
      id: "payout-3",
      workspaceId: WS_ID,
      contributorId: "contrib-1",
      createdByUserId: LEGACY_CREATOR_ID,
      title: "Landing Page Polish",
      description: "Visual refinements and responsive fixes for the landing page.",
      totalAmountUsdc: 300,
      status: "draft",
      targetWalletAddress: "0x7A12c84Ba6A5d2b116f45D3f9a3E0cA4B0Cd4b91",
    },
  });

  await db.milestone.upsert({
    where: { id: "ms-5" },
    update: {},
    create: {
      id: "ms-5",
      payoutId: "payout-3",
      title: "Responsive layout fixes",
      description: "Fix mobile breakpoints and spacing issues across all sections.",
      amountUsdc: 150,
      sequence: 1,
      status: "pending",
    },
  });

  console.log("✅ Seed complete.");
  console.log("   Workspace:", WS_ID);
  console.log("   Active owner: Tommy Cuong (1)");
  console.log("   Member roles: owner, reviewer, contributor");
  console.log("   Contribs: 3 (Lena, Marcus, Nora)");
  console.log("   Payouts:  1 (draft)");
  console.log("   Milestones: 1 (pending)");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

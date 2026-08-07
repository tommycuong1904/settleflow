/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client");

const db = new PrismaClient();

// --- Constants ---
const WS_ID = "ws-demo";
const OWNER_ID = "user-owner";
const REVIEWER_ID = "user-reviewer";
const CONTRIB_USER_ID = "user-contrib";

const contributors = [
  ["contrib-1", "Lena Tran", "0x7A12c84Ba6A5d2b116f45D3f9a3E0cA4B0Cd4b91", "Brand designer"],
  ["contrib-2", "Marcus Vale", "0x1A98bF14A4e5B9A68d8d9B4e6f2246F51C3D4A20", "Security QA"],
  ["contrib-3", "Nora Kim", "0x91C2d1a2F17c28f2F44d8B3bB7D873A5D1C8a191", "Growth writer"],
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
    [OWNER_ID, "Demo Owner", "owner@settleflow.local"],
    [REVIEWER_ID, "Demo Reviewer", "reviewer@settleflow.local"],
    [CONTRIB_USER_ID, "Nora Kim (linked)", "nora@settleflow.local"],
  ];

  for (const [id, displayName, email] of users) {
    await db.user.upsert({
      where: { id },
      update: { displayName },
      create: { id, displayName, email },
    });
  }

  // --- Workspace Members ---
  const members = [
    [OWNER_ID, "owner"],
    [REVIEWER_ID, "reviewer"],
    [CONTRIB_USER_ID, "contributor"],
  ];

  for (const [userId, role] of members) {
    await db.workspaceMember.upsert({
      where: { workspaceId_userId_role: { workspaceId: WS_ID, userId, role } },
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

  // ============================================================
  // Payout 1: "Smart Contract QA" — active, 2 milestones
  //   milestone-1: approved (ready for release)
  //   milestone-2: pending  (not yet submitted)
  // ============================================================
  await db.payout.upsert({
    where: { id: "payout-1" },
    update: {},
    create: {
      id: "payout-1",
      workspaceId: WS_ID,
      contributorId: "contrib-2",
      createdByUserId: OWNER_ID,
      title: "Smart Contract QA Support",
      description: "Security review and QA for Arc contract integration.",
      totalAmountUsdc: 450,
      status: "active",
      targetWalletAddress: "0x1A98bF14A4e5B9A68d8d9B4e6f2246F51C3D4A20",
    },
  });

  // Milestone 1 — approved (release-test target)
  await db.milestone.upsert({
    where: { id: "ms-1" },
    update: {},
    create: {
      id: "ms-1",
      payoutId: "payout-1",
      title: "QA checklist and threat review",
      description: "Review contract logic and produce issue checklist.",
      amountUsdc: 200,
      sequence: 1,
      status: "approved",
      approvedAt: new Date("2026-07-20T12:00:00Z"),
    },
  });

  // Milestone 2 — pending
  await db.milestone.upsert({
    where: { id: "ms-2" },
    update: {},
    create: {
      id: "ms-2",
      payoutId: "payout-1",
      title: "Retest patched contract build",
      description: "Validate resolved issues and produce final QA note.",
      amountUsdc: 250,
      sequence: 2,
      status: "pending",
    },
  });

  // ============================================================
  // Payout 2: "Growth Content Sprint" — partially_released
  //   ms-3: released (already done)
  //   ms-4: submitted (awaiting review)
  // ============================================================
  await db.payout.upsert({
    where: { id: "payout-2" },
    update: {},
    create: {
      id: "payout-2",
      workspaceId: WS_ID,
      contributorId: "contrib-3",
      createdByUserId: OWNER_ID,
      title: "Growth Content Sprint",
      description: "Content creation for launch thread and docs.",
      totalAmountUsdc: 500,
      status: "partially_released",
      targetWalletAddress: "0x91C2d1a2F17c28f2F44d8B3bB7D873A5D1C8a191",
    },
  });

  // Milestone 3 — released (already paid)
  await db.milestone.upsert({
    where: { id: "ms-3" },
    update: {},
    create: {
      id: "ms-3",
      payoutId: "payout-2",
      title: "Thread outline",
      description: "Prepare content structure for launch thread.",
      amountUsdc: 100,
      sequence: 1,
      status: "released",
      releasedAt: new Date("2026-07-18T15:00:00Z"),
    },
  });

  // Milestone 4 — submitted (awaiting review)
  await db.milestone.upsert({
    where: { id: "ms-4" },
    update: {},
    create: {
      id: "ms-4",
      payoutId: "payout-2",
      title: "Launch thread draft",
      description: "Write the full launch thread copy.",
      amountUsdc: 200,
      sequence: 2,
      status: "submitted",
      submittedAt: new Date("2026-07-20T09:00:00Z"),
    },
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
      createdByUserId: OWNER_ID,
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
  console.log("   Users:    owner, reviewer, contributor (3)");
  console.log("   Members:  owner, reviewer, contributor (3)");
  console.log("   Contribs: 3 (Lena, Marcus, Nora)");
  console.log("   Payouts:  3 (active, partially_released, draft)");
  console.log("   Milestones: 5 (pending, submitted, approved, released, pending)");
  console.log("");
  console.log("   Release-ready: payout-1 / ms-1 (approved, 200 USDC → Marcus)");
  console.log("   Test conflict: payout-1 / ms-1 (double-release)");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

import type { Contributor } from "@/lib/models/contributor";

export const mockContributors: Contributor[] = [
  {
    id: "contrib-1",
    name: "Lena Tran",
    walletAddress: "0x7A12c84Ba6A5d2b116f45D3f9a3E0cA4B0Cd4b91",
    role: "Brand designer",
  },
  {
    id: "contrib-2",
    name: "Marcus Vale",
    walletAddress: "0x1A98bF14A4e5B9A68d8d9B4e6f2246F51C3D4A20",
    role: "Security QA",
  },
  {
    id: "contrib-3",
    name: "Nora Kim",
    walletAddress: "0x91C2d1a2F17c28f2F44d8B3bB7D873A5D1C8a191",
    role: "Growth writer",
  },
];

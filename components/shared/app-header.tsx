"use client";

import React from "react";
import { Button } from "@/components/shared/button";
import { ExternalLink } from "lucide-react";

export function AppHeader() {
  return (
    <div className="sf-app-header">
      {/* Get test USDC button with placeholder icon */}
        <Button variant="ghost" href="https://faucet.circle.com/">
          <span className="sf-icon-blank" aria-hidden="true" /> Get test USDC <ExternalLink className="ml-1" size={12} aria-hidden="true" />
        </Button>

      {/* Network status indicator – styled like a button */}
      <Button variant="ghost">Arc Testnet</Button>

      {/* Wallet connected button */}
      <Button>Ví đã kết nối</Button>
    </div>
  );
}

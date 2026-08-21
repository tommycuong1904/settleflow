import Link from "next/link";
import type { ReactNode } from "react";

export function Footer() {
  return (
    <footer className="sf-footer">
      <div className="sf-container">
        <a href="/" className="sf-wordmark">
          <span>Settle</span>Flow
        </a>
        <p>Milestone-based USDC payouts, with approval built in.</p>
        <div>
          <a href="https://settleflow-dev.vercel.app">Live app</a>
          <a href="https://github.com/tommycuong1904/settleflow">GitHub</a>
          <a href="#">Demo</a>
        </div>
      </div>
    </footer>
  );
}

import Link from "next/link";

export function Footer() {
  return (
    <footer className="sf-footer">
      <div className="sf-container">
        <Link href="/" className="sf-wordmark">
          <span>Settle</span>Flow
        </Link>
        <p>Milestone-based USDC payouts, with approval built in.</p>
      </div>
    </footer>
  );
}

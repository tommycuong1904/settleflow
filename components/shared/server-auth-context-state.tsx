import { Mail, ShieldAlert, AlertTriangle } from "lucide-react";

type ServerAuthContextStateProps = {
  kind: "auth-context-required" | "auth-role-ambiguous" | "authenticated-forbidden";
};

export function ServerAuthContextState({ kind }: ServerAuthContextStateProps) {
  const roleConflict = kind === "auth-role-ambiguous";
  const forbidden = kind === "authenticated-forbidden";

  return (
    <div className="min-h-[60vh] bg-white flex items-center justify-center py-16 px-4">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 text-center space-y-4 shadow-sm">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 border border-neutral-200 text-neutral-900">
          {forbidden ? (
            <ShieldAlert size={22} />
          ) : roleConflict ? (
            <AlertTriangle size={22} />
          ) : (
            <Mail size={22} />
          )}
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 font-mono">
            {forbidden ? "ACCESS DENIED" : roleConflict ? "ROLE CONFLICT" : "WORKSPACE INVITATION REQUIRED"}
          </p>
          <h1 className="text-xl font-bold text-black tracking-tight mt-1">
            {forbidden
              ? "You do not have access to this payout"
              : roleConflict
              ? "Your workspace role needs attention"
              : "No active workspace membership"}
          </h1>
        </div>

        <p className="text-xs text-neutral-600 leading-relaxed max-w-sm mx-auto">
          {forbidden
            ? "Your account is authenticated, but this payout is not available for your current role."
            : roleConflict
            ? "Your account has conflicting roles for this workspace. No workspace data was loaded."
            : "Your account is signed in, but it is not currently connected to a usable workspace. Please ask your workspace administrator for an invitation link to get started."}
        </p>
      </div>
    </div>
  );
}

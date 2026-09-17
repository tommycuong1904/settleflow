"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/lib/context/wallet-context";
import { AlertCircle, Clock, CheckCircle2, ArrowRight } from "lucide-react";

type InviteDetails = {
  workspaceName: string;
  role: string;
  email?: string | null;
  status: string;
  isExpired: boolean;
  isValid: boolean;
  invitedBy: string;
};

export default function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const router = useRouter();
  const { token } = use(searchParams);
  const { isConnected, email: userEmail, openAuthModal } = useWallet();

  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [loading, setLoading] = useState(() => Boolean(token));
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token) return;

    void fetch(`/api/v1/invitations/${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Invitation not found.");
        }
        return res.json() as Promise<InviteDetails>;
      })
      .then((data) => {
        setInvite(data);
        setError(null);
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const displayedError = token ? error : "No invitation token provided.";

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/invitations/${encodeURIComponent(token)}/accept`, {
        method: "POST",
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || "Failed to accept invitation.");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to accept invitation.";
      setError(msg);
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex justify-center items-center py-24 bg-white">
        <p className="text-xs font-mono tracking-wider uppercase text-neutral-500 animate-pulse">
          Loading invitation details...
        </p>
      </div>
    );
  }

  if (displayedError || !invite) {
    return (
      <div className="min-h-[60vh] bg-white flex items-center justify-center py-16 px-4">
        <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 text-center space-y-4 shadow-sm">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 border border-neutral-200 text-neutral-900">
            <AlertCircle size={22} />
          </div>
          <h1 className="text-lg font-semibold text-neutral-900 tracking-tight">Invitation Error</h1>
          <p className="text-xs text-neutral-600 leading-relaxed">{displayedError || "Invalid invitation link."}</p>
          <button
            className="w-full mt-4 py-2.5 px-4 rounded-full border border-black bg-black text-white text-xs font-semibold hover:bg-neutral-800 transition-all"
            onClick={() => router.push("/")}
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  if (!invite.isValid) {
    return (
      <div className="min-h-[60vh] bg-white flex items-center justify-center py-16 px-4">
        <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 text-center space-y-4 shadow-sm">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 border border-neutral-200 text-neutral-900">
            <Clock size={22} />
          </div>
          <h1 className="text-lg font-semibold text-neutral-900 tracking-tight">
            {invite.isExpired ? "Invitation Expired" : "Invitation Unavailable"}
          </h1>
          <p className="text-xs text-neutral-600 leading-relaxed">
            {invite.isExpired
              ? "This invitation link has expired. Please ask the workspace administrator for a new invitation link."
              : `This invitation is no longer active (${invite.status}).`}
          </p>
          <button
            className="w-full mt-4 py-2.5 px-4 rounded-full border border-black bg-black text-white text-xs font-semibold hover:bg-neutral-800 transition-all"
            onClick={() => router.push("/")}
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] bg-white flex items-center justify-center py-16 px-4">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 space-y-6 shadow-sm">
        {/* Workspace Avatar / Icon */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black text-white font-bold text-xl">
            {invite.workspaceName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 font-mono">
              WORKSPACE INVITATION
            </p>
            <h1 className="text-xl font-bold text-black tracking-tight mt-1">
              Join {invite.workspaceName}
            </h1>
          </div>
        </div>

        {/* Invitation Summary Card */}
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-xs space-y-2.5">
          <div className="flex justify-between items-center pb-2 border-b border-neutral-200">
            <span className="text-neutral-500">Invited by:</span>
            <span className="font-semibold text-black">{invite.invitedBy}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-neutral-500">Assigned Role:</span>
            <span className="font-mono uppercase font-bold text-black tracking-wider px-2 py-0.5 rounded bg-white border border-neutral-300">
              {invite.role}
            </span>
          </div>
        </div>

        {/* Auth State & Action Button */}
        <div className="pt-2">
          {!isConnected ? (
            <div className="space-y-3 text-center">
              <p className="text-xs text-neutral-500">Please sign in to accept this invitation.</p>
              <button
                className="w-full py-3 px-4 rounded-full border border-black bg-black text-white text-xs font-semibold hover:bg-neutral-800 transition-all flex items-center justify-center gap-2"
                onClick={openAuthModal}
              >
                Sign in to Accept Invitation
                <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-xs flex justify-between items-center">
                <span className="text-neutral-500">Signed in as:</span>
                <span className="font-mono text-black font-medium truncate max-w-[200px]">
                  {userEmail || "Connected User"}
                </span>
              </div>

              {invite.email && userEmail?.toLowerCase() !== invite.email.toLowerCase() && (
                <div className="p-3 rounded-xl border border-amber-300 bg-amber-50 text-xs text-amber-900">
                  Notice: Invitation was sent to <strong className="font-mono">{invite.email}</strong>.
                </div>
              )}

              <button
                className="w-full py-3 px-4 rounded-full border border-black bg-black text-white text-xs font-semibold hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                onClick={handleAccept}
                disabled={accepting}
              >
                {accepting ? (
                  "Joining Workspace..."
                ) : (
                  <>
                    Accept & Join {invite.workspaceName}
                    <CheckCircle2 size={14} />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

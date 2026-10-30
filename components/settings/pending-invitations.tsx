"use client";

import { LoaderCircle, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/shared/button";
import { useToast } from "@/lib/context/toast-context";
import { getFrontendAuthErrorMessage } from "@/lib/runtime/auth-error-classification";

type Invitation = { id: string; role: string; email: string | null; expiresAt: string };

export function PendingInvitations() {
  const { toast } = useToast();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetch("/api/v1/invitations", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({})) as { data?: Invitation[]; error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Unable to load invitations.");
        return payload.data ?? [];
      })
      .then((data) => { if (active) setInvitations(data.filter((invitation) => invitation.role === "contributor")); })
      .catch((loadError) => { if (active) setError(getFrontendAuthErrorMessage(loadError, "Unable to load invitations.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function revoke(invitation: Invitation) {
    setRevokingId(invitation.id);
    try {
      const response = await fetch(`/api/v1/invitations/${invitation.id}/revoke`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to revoke invitation.");
      setInvitations((current) => current.filter((item) => item.id !== invitation.id));
      setConfirmId(null);
      toast({ variant: "success", title: "Invitation revoked", description: "This link can no longer be used." });
    } catch (revokeError) {
      setError(getFrontendAuthErrorMessage(revokeError, "Unable to revoke invitation."));
    } finally {
      setRevokingId(null);
    }
  }

  if (!loading && !error && invitations.length === 0) return null;
  return <section className="rounded-xl border border-[var(--border-soft)] p-6 sm:p-8">
    <h2 className="text-base font-semibold text-[var(--foreground)]">Pending invitations</h2>
    <p className="mt-1 text-xs text-[var(--text-muted)]">Revoke a link if it was sent to the wrong person or is no longer needed.</p>
    {loading ? <div className="mt-4 flex items-center gap-2 text-sm text-[var(--text-muted)]"><LoaderCircle size={15} className="animate-spin" /> Loading invitations…</div> : null}
    {error ? <p role="alert" className="mt-4 rounded-xl border border-amber-300/50 bg-amber-50/70 p-3 text-sm text-amber-900">{error}</p> : null}
    {invitations.length ? <div className="mt-4 divide-y divide-[var(--border-soft)] rounded-xl border border-[var(--border-soft)]">{invitations.map((invitation) => {
      const confirming = confirmId === invitation.id;
      return <div key={invitation.id} className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate text-sm font-medium text-[var(--foreground)]">{invitation.email || "Link invitation"}</p><p className="mt-0.5 text-xs text-[var(--text-muted)]">{invitation.role} · expires {new Date(invitation.expiresAt).toLocaleDateString()}</p></div><div className="flex gap-2">{confirming ? <><Button type="button" variant="secondary" size="sm" onClick={() => setConfirmId(null)} disabled={revokingId === invitation.id}>Cancel</Button><Button type="button" variant="danger" size="sm" onClick={() => void revoke(invitation)} disabled={revokingId === invitation.id}>{revokingId === invitation.id ? "Revoking…" : "Revoke"}</Button></> : <Button type="button" variant="secondary" size="sm" icon={<X size={13} />} onClick={() => setConfirmId(invitation.id)}>Revoke</Button>}</div></div>;
    })}</div> : null}
  </section>;
}

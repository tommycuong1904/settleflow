"use client";

import { LoaderCircle, UserMinus, Users } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/shared/button";
import { useToast } from "@/lib/context/toast-context";
import { getFrontendAuthErrorMessage } from "@/lib/runtime/auth-error-classification";

type WorkspaceMember = {
  userId: string;
  role: "owner" | "ops" | "reviewer" | "contributor";
  createdAt: string;
  user: { displayName: string | null; email: string | null };
};

export function WorkspaceMembers({ workspaceId }: { workspaceId: string }) {
  const { toast } = useToast();
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmUserId, setConfirmUserId] = useState<string | null>(null);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);
    void fetch(`/api/v1/workspaces/${workspaceId}/members`, { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({})) as { data?: WorkspaceMember[]; error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Unable to load workspace members.");
        return payload.data ?? [];
      })
      .then((data) => { if (active) setMembers(data); })
      .catch((loadError) => { if (active) setError(getFrontendAuthErrorMessage(loadError, "Unable to load workspace members.")); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [workspaceId]);

  async function removeMember(member: WorkspaceMember) {
    setRemovingUserId(member.userId);
    setError(null);
    try {
      const response = await fetch(`/api/v1/workspaces/${workspaceId}/members/${member.userId}`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to remove this member.");
      setMembers((current) => current.filter((item) => item.userId !== member.userId));
      setConfirmUserId(null);
      toast({ variant: "success", title: "Contributor access removed", description: "They can no longer access this workspace." });
    } catch (removeError) {
      setError(getFrontendAuthErrorMessage(removeError, "Unable to remove this member."));
    } finally {
      setRemovingUserId(null);
    }
  }

  return (
    <section className="rounded-xl border border-[var(--border-soft)] p-6 sm:p-8">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] text-[var(--text-muted)]"><Users size={20} /></div>
        <div>
          <h2 className="text-base font-semibold text-[var(--foreground)]">Workspace members</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Owners manage payments. Contributor access can be removed here.</p>
        </div>
      </div>

      {isLoading ? <div className="mt-5 flex items-center gap-2 text-sm text-[var(--text-muted)]"><LoaderCircle size={15} className="animate-spin" /> Loading members…</div> : null}
      {error ? <p role="alert" className="mt-5 rounded-xl border border-amber-300/50 bg-amber-50/70 p-3 text-sm text-amber-900">{error}</p> : null}
      {!isLoading && !error ? <div className="mt-5 divide-y divide-[var(--border-soft)] rounded-xl border border-[var(--border-soft)]">
        {members.map((member) => {
          const name = member.user.displayName || member.user.email || "Workspace member";
          const isContributor = member.role === "contributor";
          const confirming = confirmUserId === member.userId;
          return <div key={member.userId} className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[var(--foreground)]">{name}</p>
              {member.user.email && member.user.email !== name ? <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">{member.user.email}</p> : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-muted)] px-2.5 py-1 text-[11px] font-medium capitalize text-[var(--foreground)]">{member.role}</span>
              {isContributor ? confirming ? <>
                <Button type="button" variant="secondary" size="sm" onClick={() => setConfirmUserId(null)} disabled={removingUserId === member.userId}>Cancel</Button>
                <Button type="button" variant="danger" size="sm" onClick={() => void removeMember(member)} disabled={removingUserId === member.userId}>{removingUserId === member.userId ? "Removing…" : "Remove access"}</Button>
              </> : <Button type="button" variant="secondary" size="sm" icon={<UserMinus size={13} />} onClick={() => setConfirmUserId(member.userId)}>Remove</Button> : null}
            </div>
          </div>;
        })}
      </div> : null}
    </section>
  );
}

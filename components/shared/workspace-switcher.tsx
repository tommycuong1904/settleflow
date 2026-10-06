"use client";

import { Check, ChevronDown, LoaderCircle, Pencil, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type WorkspaceMembership = {
  id: string;
  name: string;
  role: string;
  personalLabel: string | null;
};

export function WorkspaceSwitcher({ activeWorkspaceId }: { activeWorkspaceId?: string }) {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<WorkspaceMembership[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [editingWorkspaceId, setEditingWorkspaceId] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState("");
  const [isSavingLabel, setIsSavingLabel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    void fetch("/api/v1/workspaces", { cache: "no-store" })
      .then(async (response) => response.ok ? await response.json() as { data?: WorkspaceMembership[] } : null)
      .then((payload) => {
        if (active) setWorkspaces(payload?.data ?? []);
      })
      .catch(() => {
        if (active) setWorkspaces([]);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? workspaces[0];
  if (!activeWorkspace) return null;
  const canSwitchWorkspaces = workspaces.length > 1;
  const workspaceLabel = (workspace: WorkspaceMembership) => workspace.personalLabel || workspace.name;

  async function switchWorkspace(workspaceId: string) {
    if (workspaceId === activeWorkspaceId || isSwitching) {
      setIsOpen(false);
      return;
    }

    setIsSwitching(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/workspaces/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to switch workspace.");
      setIsOpen(false);
      router.replace("/dashboard");
      router.refresh();
    } catch (switchError) {
      setError(switchError instanceof Error ? switchError.message : "Unable to switch workspace.");
    } finally {
      setIsSwitching(false);
    }
  }

  function startLabelEdit(workspace: WorkspaceMembership) {
    setEditingWorkspaceId(workspace.id);
    setLabelDraft(workspace.personalLabel ?? "");
    setError(null);
  }

  async function savePersonalLabel(workspace: WorkspaceMembership, personalLabel: string | null) {
    if (isSavingLabel) return;
    setIsSavingLabel(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/workspaces/${workspace.id}/membership-label`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personalLabel }),
      });
      const payload = await response.json().catch(() => ({})) as { data?: { personalLabel?: string | null }; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to save workspace label.");
      setWorkspaces((current) => current.map((item) => item.id === workspace.id
        ? { ...item, personalLabel: payload.data?.personalLabel ?? null }
        : item));
      setEditingWorkspaceId(null);
    } catch (labelError) {
      setError(labelError instanceof Error ? labelError.message : "Unable to save workspace label.");
    } finally {
      setIsSavingLabel(false);
    }
  }

  return (
    <div ref={menuRef} className="relative px-4 pb-4">
      <p className="mb-2 px-1 text-[10px] font-semibold tracking-[0.14em] text-[var(--text-muted)]">
        CURRENT WORKSPACE
      </p>
      <button
        type="button"
        onClick={() => canSwitchWorkspaces && setIsOpen((open) => !open)}
        className="flex w-full items-center gap-2 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] px-3 py-2 text-left transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-strong)] disabled:cursor-default disabled:hover:border-[var(--border-soft)] disabled:hover:bg-[var(--surface-muted)]"
        aria-haspopup={canSwitchWorkspaces ? "menu" : undefined}
        aria-expanded={canSwitchWorkspaces ? isOpen : undefined}
        disabled={!canSwitchWorkspaces}
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold text-[var(--foreground)]">{workspaceLabel(activeWorkspace)}</span>
          <span className="block pt-0.5 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
            {activeWorkspace.role}{activeWorkspace.personalLabel ? ` · ${activeWorkspace.name}` : ""}
          </span>
        </span>
        {isSwitching ? <LoaderCircle size={14} className="animate-spin text-[var(--text-muted)]" /> : canSwitchWorkspaces ? <ChevronDown size={14} className="text-[var(--text-muted)]" /> : null}
      </button>

      {isOpen ? (
        <div className="absolute left-4 right-4 z-50 mt-2 overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] p-1 shadow-xl" role="menu">
          {workspaces.map((workspace) => (
            <div key={workspace.id} className="rounded-lg">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void switchWorkspace(workspace.id)}
                  disabled={isSwitching || isSavingLabel}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-[var(--surface-muted)] disabled:opacity-50"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-[var(--foreground)]">{workspaceLabel(workspace)}</span>
                    <span className="block pt-0.5 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                      {workspace.role}{workspace.personalLabel ? ` · ${workspace.name}` : ""}
                    </span>
                  </span>
                  {workspace.id === activeWorkspaceId ? <Check size={14} className="shrink-0 text-[var(--foreground)]" /> : null}
                </button>
                <button
                  type="button"
                  onClick={() => startLabelEdit(workspace)}
                  disabled={isSwitching || isSavingLabel}
                  className="rounded-md p-2 text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] disabled:opacity-50"
                  aria-label={`Rename ${workspaceLabel(workspace)} for me`}
                  title="Rename for me"
                >
                  <Pencil size={13} />
                </button>
              </div>
              {editingWorkspaceId === workspace.id ? (
                <form
                  className="space-y-2 px-3 pb-3 pt-1"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void savePersonalLabel(workspace, labelDraft.trim() || null);
                  }}
                >
                  <label className="block text-[10px] font-medium text-[var(--text-muted)]" htmlFor={`workspace-label-${workspace.id}`}>
                    Label for you
                  </label>
                  <input
                    id={`workspace-label-${workspace.id}`}
                    value={labelDraft}
                    onChange={(event) => setLabelDraft(event.target.value)}
                    minLength={2}
                    maxLength={48}
                    placeholder={workspace.name}
                    autoFocus
                    className="w-full rounded-md border border-[var(--border-soft)] bg-[var(--input-background)] px-2.5 py-1.5 text-xs text-[var(--foreground)] outline-none focus:border-[var(--border-strong)]"
                  />
                  <div className="flex items-center gap-2">
                    <button type="submit" disabled={isSavingLabel} className="rounded-md bg-[var(--foreground)] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--background)] disabled:opacity-50">
                      {isSavingLabel ? "Saving..." : "Save label"}
                    </button>
                    {workspace.personalLabel ? (
                      <button
                        type="button"
                        onClick={() => void savePersonalLabel(workspace, null)}
                        disabled={isSavingLabel}
                        className="inline-flex items-center gap-1 rounded-md px-1.5 py-1.5 text-[10px] text-[var(--text-muted)] hover:text-[var(--foreground)] disabled:opacity-50"
                      >
                        <RotateCcw size={11} /> Reset
                      </button>
                    ) : null}
                  </div>
                </form>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      {error ? <p className="pt-1 text-[10px] text-rose-600">{error}</p> : null}
    </div>
  );
}

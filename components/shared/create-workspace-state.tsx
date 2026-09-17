"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ArrowRight } from "lucide-react";

export function CreateWorkspaceState() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const createWorkspace = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/v1/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(body?.error || "Could not create the workspace.");
      router.replace("/dashboard");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create the workspace.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[60vh] bg-white flex items-center justify-center py-16 px-4">
      <form onSubmit={createWorkspace} className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 text-center space-y-5 shadow-sm">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 border border-neutral-200 text-neutral-900">
          <Building2 size={22} />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 font-mono">CREATE YOUR WORKSPACE</p>
          <h1 className="text-xl font-bold text-black tracking-tight mt-1">Start your payout workspace</h1>
        </div>
        <p className="text-xs text-neutral-600 leading-relaxed">Create a workspace for your team. Your signed-in account will be its Owner.</p>
        <label className="block text-left text-xs font-semibold text-neutral-700" htmlFor="workspace-name">
          Workspace name
          <input
            id="workspace-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            minLength={2}
            maxLength={80}
            required
            autoFocus
            placeholder="e.g. Acme Protocol"
            className="mt-2 w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm text-black outline-none focus:border-black"
          />
        </label>
        {error ? <p className="text-xs text-red-700" role="alert">{error}</p> : null}
        <button type="submit" disabled={submitting} className="w-full py-3 px-4 rounded-full border border-black bg-black text-white text-xs font-semibold hover:bg-neutral-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
          {submitting ? "Creating workspace..." : "Create workspace"}
          {!submitting ? <ArrowRight size={14} /> : null}
        </button>
      </form>
    </div>
  );
}

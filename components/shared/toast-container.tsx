"use client";

import React, { useEffect, useState } from "react";
import { useToast } from "@/lib/context/toast-context";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  X,
} from "lucide-react";

const VARIANT_STYLES = {
  success: {
    border: "border-emerald-500/40",
    bg: "bg-emerald-950/70",
    icon: <CheckCircle2 size={17} className="text-emerald-400 shrink-0" />,
    title: "text-emerald-200",
    glow: "shadow-[0_0_20px_rgba(16,185,129,0.15)]",
  },
  error: {
    border: "border-rose-500/40",
    bg: "bg-rose-950/70",
    icon: <XCircle size={17} className="text-rose-400 shrink-0" />,
    title: "text-rose-200",
    glow: "shadow-[0_0_20px_rgba(244,63,94,0.15)]",
  },
  warning: {
    border: "border-amber-500/40",
    bg: "bg-amber-950/70",
    icon: <AlertTriangle size={17} className="text-amber-400 shrink-0" />,
    title: "text-amber-200",
    glow: "shadow-[0_0_20px_rgba(245,158,11,0.12)]",
  },
  info: {
    border: "border-cyan-500/40",
    bg: "bg-cyan-950/60",
    icon: <Info size={17} className="text-cyan-400 shrink-0" />,
    title: "text-cyan-200",
    glow: "shadow-[0_0_20px_rgba(34,211,238,0.12)]",
  },
};

function ToastItem({
  id,
  variant,
  title,
  description,
  onDismiss,
}: {
  id: string;
  variant: keyof typeof VARIANT_STYLES;
  title: string;
  description?: string;
  onDismiss: (id: string) => void;
}) {
  const [visible, setVisible] = useState(false);

  // Animate in on mount
  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const styles = VARIANT_STYLES[variant];

  return (
    <div
      className={`
        flex items-start gap-3 w-full max-w-sm rounded-2xl border px-4 py-3
        backdrop-blur-xl text-sm
        transition-all duration-300 ease-out
        ${styles.border} ${styles.bg} ${styles.glow}
        ${visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"}
      `}
      role="alert"
    >
      {styles.icon}

      <div className="flex-1 min-w-0 space-y-0.5">
        <p className={`font-semibold leading-snug ${styles.title}`}>{title}</p>
        {description && (
          <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
        )}
      </div>

      <button
        onClick={() => {
          setVisible(false);
          setTimeout(() => onDismiss(id), 300);
        }}
        className="shrink-0 rounded-full p-0.5 text-slate-500 hover:text-slate-300 transition-colors mt-0.5"
        aria-label="Dismiss notification"
      >
        <X size={13} />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-[100] flex flex-col-reverse gap-2.5 items-end pointer-events-none"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem
            id={t.id}
            variant={t.variant}
            title={t.title}
            description={t.description}
            onDismiss={dismiss}
          />
        </div>
      ))}
    </div>
  );
}

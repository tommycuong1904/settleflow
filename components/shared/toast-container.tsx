"use client";

import React, { useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useToast } from "@/lib/context/toast-context";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  X,
} from "lucide-react";

const subscribeToClient = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

const VARIANT_ICONS: Record<string, React.ReactNode> = {
  success: <CheckCircle2 size={18} className="text-white shrink-0 mt-0.5" />,
  info: <CheckCircle2 size={18} className="text-white shrink-0 mt-0.5" />,
  error: <XCircle size={18} className="text-white shrink-0 mt-0.5" />,
  warning: <AlertTriangle size={18} className="text-white shrink-0 mt-0.5" />,
};

function ToastItem({
  id,
  variant,
  title,
  description,
  onDismiss,
}: {
  id: string;
  variant: string;
  title: string;
  description?: string;
  onDismiss: (id: string) => void;
}) {
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => onDismiss(id), 200);
  };

  const isError = variant === "error";
  const isWarning = variant === "warning";

  // Theme styles: Solid green theme by default for success/info (Role Switched)
  const bgStyle = isError
    ? "#dc2626"
    : isWarning
    ? "#d97706"
    : "#059669"; // Solid Emerald Green (#059669)

  const borderStyle = isError
    ? "rgba(255, 255, 255, 0.25)"
    : isWarning
    ? "rgba(255, 255, 255, 0.25)"
    : "rgba(255, 255, 255, 0.22)";

  const shadowStyle = isError
    ? "0 12px 36px -4px rgba(220, 38, 38, 0.4), 0 4px 12px rgba(0, 0, 0, 0.15)"
    : isWarning
    ? "0 12px 36px -4px rgba(217, 119, 6, 0.4), 0 4px 12px rgba(0, 0, 0, 0.15)"
    : "0 12px 36px -4px rgba(5, 150, 105, 0.38), 0 4px 12px rgba(0, 0, 0, 0.15)";

  return (
    <div
      className={`sf-toast-item ${isClosing ? "sf-toast-item--closing" : ""}`}
      style={{
        backgroundColor: bgStyle,
        borderColor: borderStyle,
        boxShadow: shadowStyle,
      }}
      role="alert"
    >
      {VARIANT_ICONS[variant] || VARIANT_ICONS.success}

      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            color: "#ffffff",
            fontWeight: 600,
            fontSize: "13px",
            lineHeight: 1.4,
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </p>
        {description && (
          <p
            style={{
              margin: "2px 0 0 0",
              color: "rgba(255, 255, 255, 0.92)",
              fontSize: "11px",
              lineHeight: 1.5,
              fontWeight: 400,
            }}
          >
            {description}
          </p>
        )}
      </div>

      <button
        onClick={handleClose}
        style={{
          flexShrink: 0,
          background: "transparent",
          border: "none",
          color: "rgba(255, 255, 255, 0.8)",
          padding: "4px",
          borderRadius: "9999px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginTop: "-2px",
          marginRight: "-4px",
          transition: "color 0.15s, background-color 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.18)";
          e.currentTarget.style.color = "#ffffff";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
          e.currentTarget.style.color = "rgba(255, 255, 255, 0.8)";
        }}
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts, dismiss } = useToast();
  const mounted = useSyncExternalStore(
    subscribeToClient,
    getClientSnapshot,
    getServerSnapshot,
  );

  if (!mounted) return null;

  const content = (
    <div
      className="sf-toast-container"
      aria-live="polite"
      aria-label="Notifications"
      style={{
        position: "fixed",
        left: "16px",
        right: "16px",
        bottom: "calc(24px + env(safe-area-inset-bottom, 12px))",
        zIndex: 2147483647,
        display: "flex",
        flexDirection: "column-reverse",
        alignItems: "center",
        gap: "10px",
        width: "auto",
        maxWidth: "none",
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => (
        <ToastItem
          key={t.id}
          id={t.id}
          variant={t.variant}
          title={t.title}
          description={t.description}
          onDismiss={dismiss}
        />
      ))}
    </div>
  );

  return createPortal(content, document.body);
}

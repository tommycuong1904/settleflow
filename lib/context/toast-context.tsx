"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type ToastVariant = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  durationMs?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  toast: (opts: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

let _counter = 0;
let _toasts: Toast[] = [];
const _listeners = new Set<() => void>();
const EMPTY_TOASTS: Toast[] = [];

function notify() {
  _listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Ignore listener error
    }
  });
}

export function showGlobalToast(opts: Omit<Toast, "id">) {
  const id = `toast-${++_counter}-${Date.now()}`;
  const duration = opts.durationMs ?? 3500;
  const newToast: Toast = { ...opts, id };

  _toasts = [newToast, ..._toasts].slice(0, 5);
  notify();

  setTimeout(() => {
    dismissGlobalToast(id);
  }, duration);

  return id;
}

export function dismissGlobalToast(id: string) {
  const beforeLen = _toasts.length;
  _toasts = _toasts.filter((t) => t.id !== id);
  if (_toasts.length !== beforeLen) {
    notify();
  }
}

function subscribe(listener: () => void) {
  _listeners.add(listener);
  return () => {
    _listeners.delete(listener);
  };
}

function getSnapshot() {
  return _toasts;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const toasts = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_TOASTS);

  const toast = useCallback((opts: Omit<Toast, "id">) => {
    showGlobalToast(opts);
  }, []);

  const dismiss = useCallback((id: string) => {
    dismissGlobalToast(id);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      toasts: _toasts,
      toast: showGlobalToast,
      dismiss: dismissGlobalToast,
    };
  }
  return ctx;
}

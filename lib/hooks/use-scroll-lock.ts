import { useEffect } from "react";

/**
 * Locks body scroll while a modal/dialog is open.
 * Restores original overflow on cleanup.
 */
export function useScrollLock(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen]);
}

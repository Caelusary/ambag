"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function Dialog({
  title,
  children,
  actions,
  onClose,
}: {
  title: string;
  children: ReactNode;
  actions: ReactNode;
  onClose: () => void;
}) {
  // Latest onClose without re-running the effect: callers pass an inline function, and a re-run
  // would steal focus back to the opener on every keystroke.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Captured on the first render, before an autoFocus field inside the dialog takes focus.
  const [opener] = useState(() =>
    typeof document === "undefined" ? null : (document.activeElement as HTMLElement | null),
  );

  // Escape closes it, and focus goes back to whatever opened it (the Reject button), so keyboard
  // users land where they left off instead of at the top of the page.
  // Tab and Shift+Tab cycle inside the dialog instead of wandering to the page behind it.
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), textarea, input, select, a[href], [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, [opener]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="w-full max-w-[400px] rounded-[var(--radius-card)] bg-surface p-5 shadow-lg"
      >
        <div className="mb-3 font-heading text-lg text-text">{title}</div>
        <div className="mb-5 text-sm text-text">{children}</div>
        <div className="flex gap-3">{actions}</div>
      </div>
    </div>
  );
}

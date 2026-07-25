import type { ReactNode } from "react";

export function Dialog({
  title,
  children,
  actions,
}: {
  title: string;
  children: ReactNode;
  actions: ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 p-4 sm:items-center"
    >
      <div className="w-full max-w-[360px] rounded-[var(--radius-card)] bg-surface p-5 shadow-lg">
        <div className="mb-3 font-heading text-lg text-text">{title}</div>
        <div className="mb-5 text-sm text-text">{children}</div>
        <div className="flex gap-3">{actions}</div>
      </div>
    </div>
  );
}

import type { ReactNode } from "react";

// No background here: callers pick bg-surface on the page or bg-bg inside a dialog,
// so the field always contrasts with whatever it sits on.
export const FIELD_CONTROL =
  "min-h-11 w-full rounded-[var(--radius-base)] border border-neutral-300 px-3 py-2.5 text-[15px] text-text transition-colors hover:border-neutral-400 focus:border-accent-500";

export function FieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium text-neutral-800">
      {children}
    </label>
  );
}

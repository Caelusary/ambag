import type { ReactNode } from "react";

// No background here: callers pick bg-surface on the page or bg-bg inside a dialog,
// so the field always contrasts with whatever it sits on.
export const FIELD_CONTROL =
  "w-full rounded-[var(--radius-base)] border border-neutral-300 p-3 text-sm text-text outline-none focus:border-accent-500";

export function FieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-xs font-semibold text-neutral-700">
      {children}
    </label>
  );
}

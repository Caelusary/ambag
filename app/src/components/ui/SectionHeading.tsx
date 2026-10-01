import type { ReactNode } from "react";

/** A list's heading, with how many items it holds when that's worth knowing at a glance. */
export function SectionHeading({
  id,
  count,
  children,
}: {
  id?: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <h2 id={id} className="mb-3 flex items-center gap-2 font-heading text-[17px] text-text">
      {children}
      {count != null && (
        <span
          aria-hidden="true"
          className="rounded-[var(--radius-pill)] bg-neutral-200 px-2 py-0.5 font-body text-xs font-semibold text-neutral-800 tabular-nums"
        >
          {count}
        </span>
      )}
    </h2>
  );
}

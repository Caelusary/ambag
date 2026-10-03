"use client";

import type { TaskStatus } from "@/lib/types";

const BUCKETS: { label: string; statuses: TaskStatus[]; swatch: string }[] = [
  { label: "Accepted", statuses: ["accepted"], swatch: "bg-accent-2-600" },
  { label: "In review", statuses: ["submitted"], swatch: "bg-accent-500" },
  { label: "In progress", statuses: ["assigned", "seen", "rejected"], swatch: "bg-accent-300" },
  { label: "Open", statuses: ["open"], swatch: "bg-neutral-300" },
];

/** Where the whole group's work stands, as one bar. Shared by the pool and the professor's view. */
export function GroupProgress({
  tasks,
  className = "",
}: {
  tasks: { status: TaskStatus }[];
  className?: string;
}) {
  const total = tasks.length;
  const counts = BUCKETS.map((b) => tasks.filter((t) => b.statuses.includes(t.status)).length);
  const accepted = counts[0];

  return (
    <section
      aria-labelledby="progress-heading"
      className={`rounded-[var(--radius-card)] border border-neutral-200 bg-surface p-4 shadow-sm lg:p-5 ${className}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="progress-heading" className="font-heading text-[17px] text-text">
          Project progress
        </h2>
        <p className="text-sm text-neutral-700 tabular-nums">
          <span className="font-semibold text-text">{accepted}</span> of {total} accepted
        </p>
      </div>

      <div
        role="img"
        aria-label={BUCKETS.map((b, i) => `${b.label}: ${counts[i]}`).join(", ")}
        className="mt-3 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-neutral-200"
      >
        {BUCKETS.map((b, i) =>
          counts[i] > 0 ? (
            <span
              key={b.label}
              className={`${b.swatch} h-full first:rounded-l-full last:rounded-r-full`}
              style={{ width: `${(counts[i] / total) * 100}%` }}
            />
          ) : null,
        )}
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-neutral-700">
        {BUCKETS.map((b, i) => (
          <li key={b.label} className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className={`h-2 w-2 rounded-full ${b.swatch}`} />
            {b.label}
            <span className="font-semibold text-text tabular-nums">{counts[i]}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

import { CircleCheck, Clock } from "lucide-react";
import { formatDeadline, type TaskStatus } from "@/lib/types";
import { HOUR_MS, SWAP_CUTOFF_HOURS } from "@/lib/constants";

/**
 * The deadline, coloured by how much it matters right now: brick once it's passed, terracotta
 * inside the swap cutoff, plain otherwise. Accepted work shows as done instead.
 */
export function DueBadge({
  deadlineAt,
  now,
  status,
}: {
  deadlineAt: number;
  now: number;
  status: TaskStatus;
}) {
  if (status === "accepted") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-accent-2-700">
        <CircleCheck size={13} strokeWidth={2.5} aria-hidden="true" />
        Done
      </span>
    );
  }

  const diff = deadlineAt - now;
  const text = formatDeadline(deadlineAt, now);
  const label =
    diff < 0 ? text[0].toUpperCase() + text.slice(1) : `Due ${text.replace(/^due /, "")}`;
  const tone =
    diff < 0
      ? "bg-danger-100 text-danger-700 px-2 py-0.5 font-semibold"
      : diff < SWAP_CUTOFF_HOURS * HOUR_MS
        ? "bg-accent-100 text-accent-800 px-2 py-0.5 font-semibold"
        : "bg-neutral-100 text-neutral-800 px-2 py-0.5 font-medium";

  return (
    <span className={`inline-flex items-center gap-1 rounded-[var(--radius-pill)] text-xs ${tone}`}>
      <Clock size={12} strokeWidth={2.5} aria-hidden="true" />
      {label}
    </span>
  );
}

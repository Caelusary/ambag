import type { StatusMeta } from "@/lib/types";

const CLASS_MAP: Record<StatusMeta["tagClass"], string> = {
  outline: "border border-neutral-400 text-neutral-700",
  neutral: "bg-neutral-200 text-neutral-800",
  accent: "bg-accent-100 text-accent-800",
  "accent-2": "bg-accent-2-100 text-accent-2-800",
};

export function Tag({
  children,
  variant = "neutral",
}: {
  children: React.ReactNode;
  variant?: StatusMeta["tagClass"];
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-[var(--radius-pill)] px-2.5 py-1 text-[11px] font-semibold leading-none whitespace-nowrap ${CLASS_MAP[variant]}`}
    >
      {children}
    </span>
  );
}

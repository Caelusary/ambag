import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  elevated = false,
  interactive = false,
  tinted,
}: {
  children: ReactNode;
  className?: string;
  elevated?: boolean;
  interactive?: boolean;
  tinted?: "accent" | "accent-2" | "danger";
}) {
  const tint =
    tinted === "accent"
      ? "bg-accent-100 border-accent-200"
      : tinted === "accent-2"
        ? "bg-accent-2-100 border-accent-2-200"
        : tinted === "danger"
          ? "bg-danger-100 border-danger-600/25"
          : "bg-surface border-neutral-200";

  return (
    <div
      className={`rounded-[var(--radius-card)] border p-4 lg:p-5 ${tint} ${elevated ? "shadow-sm" : ""} ${
        interactive
          ? "cursor-pointer transition-[transform,box-shadow] duration-200 ease-[var(--ease-out)] hover:-translate-y-px hover:shadow-md active:translate-y-0 active:scale-[0.99]"
          : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

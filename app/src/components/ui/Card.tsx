import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  elevated = false,
  bordered = false,
  interactive = false,
  tinted,
}: {
  children: ReactNode;
  className?: string;
  elevated?: boolean;
  bordered?: boolean;
  interactive?: boolean;
  tinted?: "accent" | "accent-2";
}) {
  const tint =
    tinted === "accent"
      ? "bg-accent-100 border-accent-200"
      : tinted === "accent-2"
        ? "bg-accent-2-100 border-accent-2-200"
        : "bg-surface border-neutral-200";

  return (
    <div
      className={`rounded-[var(--radius-card)] border p-4 ${tint} ${elevated ? "shadow-sm" : ""} ${
        bordered ? "!border-danger-600/40" : ""
      } ${
        interactive
          ? "cursor-pointer transition-[transform,box-shadow] duration-200 ease-[var(--ease-out)] hover:-translate-y-px hover:shadow-md active:translate-y-0 active:scale-[0.99]"
          : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

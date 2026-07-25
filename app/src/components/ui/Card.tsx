import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  elevated = false,
  bordered = false,
  onClick,
  interactive = false,
  tinted,
}: {
  children: ReactNode;
  className?: string;
  elevated?: boolean;
  bordered?: boolean;
  onClick?: () => void;
  interactive?: boolean;
  tinted?: "accent" | "accent-2";
}) {
  const tint =
    tinted === "accent"
      ? "bg-accent-100"
      : tinted === "accent-2"
        ? "bg-accent-2-100"
        : "bg-surface";
  const clickable = interactive || !!onClick;

  return (
    <div
      onClick={onClick}
      className={`rounded-[var(--radius-card)] p-4 ${tint} ${elevated ? "shadow-md" : "shadow-sm"} ${
        bordered ? "border border-accent-300" : ""
      } ${clickable ? "cursor-pointer transition-transform active:scale-[0.98]" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

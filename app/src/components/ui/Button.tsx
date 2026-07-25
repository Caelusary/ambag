import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

const VARIANT_CLASS: Record<Variant, string> = {
  primary: "bg-accent-500 text-white hover:bg-accent-600 disabled:bg-neutral-300 disabled:text-neutral-500",
  secondary: "bg-accent-100 text-accent-800 hover:bg-accent-200 disabled:bg-neutral-200 disabled:text-neutral-500",
  ghost: "bg-transparent text-text hover:bg-neutral-200",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  block?: boolean;
}

export function Button({
  variant = "primary",
  block = false,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`rounded-[var(--radius-pill)] px-5 py-3 text-[15px] font-semibold transition-colors disabled:cursor-not-allowed ${
        VARIANT_CLASS[variant]
      } ${block ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

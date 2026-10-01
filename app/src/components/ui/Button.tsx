import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary";
type Size = "md" | "sm";

const VARIANT_CLASS: Record<Variant, string> = {
  primary:
    "bg-accent-500 text-white shadow-sm hover:bg-accent-600 disabled:bg-neutral-300 disabled:text-neutral-600 disabled:shadow-none",
  secondary:
    "bg-accent-100 text-accent-800 hover:bg-accent-200 disabled:bg-neutral-200 disabled:text-neutral-600",
};

const SIZE_CLASS: Record<Size, string> = {
  md: "min-h-11 px-5 py-2.5 text-[15px]",
  sm: "min-h-9 px-4 py-1.5 text-sm",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  block = false,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-pill)] font-semibold transition-[background-color,transform] duration-150 ease-[var(--ease-out)] active:scale-[0.97] disabled:cursor-not-allowed disabled:active:scale-100 ${
        VARIANT_CLASS[variant]
      } ${SIZE_CLASS[size]} ${block ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

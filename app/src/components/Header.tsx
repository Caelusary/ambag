"use client";

import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export function Header({
  title,
  subtitle,
  showBack,
  onBack,
  rightSlot,
}: {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightSlot?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-10 flex-shrink-0 border-b border-neutral-300 bg-bg px-3 py-3">
      <div className="grid grid-cols-[40px_1fr_40px] items-center gap-2">
        <div className="flex justify-start">
          {showBack && (
            <button
              onClick={onBack}
              aria-label="Back"
              className="flex h-9 w-9 items-center justify-center rounded-full text-text transition-colors hover:bg-neutral-200"
            >
              <ArrowLeft size={20} strokeWidth={2.75} />
            </button>
          )}
        </div>
        <div className="min-w-0 text-center">
          <div className="truncate font-heading text-[18px] leading-tight text-text">{title}</div>
          {subtitle && <div className="mt-0.5 truncate text-xs text-neutral-700">{subtitle}</div>}
        </div>
        <div className="flex justify-end">{rightSlot}</div>
      </div>
    </header>
  );
}

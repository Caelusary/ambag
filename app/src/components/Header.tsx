"use client";

import { ArrowLeft } from "lucide-react";
import { DemoUserSwitch } from "./DemoUserSwitch";

export function Header({
  title,
  subtitle,
  showBack,
  onBack,
  brand,
}: {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  /** Top-level sections: on phones, the wordmark sits above the title and the description hides. */
  brand?: boolean;
}) {
  // Centred like a native app bar on phones, with the account switcher on the right. On desktop
  // it's a left-aligned page heading, and the sidebar carries the brand and the switcher.
  return (
    <header className="sticky top-0 z-10 flex-shrink-0 border-b border-neutral-200 bg-bg/95 px-3 py-3 backdrop-blur lg:px-10 lg:py-5">
      <div className="mx-auto grid max-w-[1080px] grid-cols-[40px_1fr_40px] items-center gap-2 lg:flex lg:gap-3">
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
        <div className="min-w-0 text-center lg:text-left">
          {brand && (
            <div className="font-heading text-[12px] leading-none text-accent-700 lg:hidden">
              Ambag
            </div>
          )}
          <h1 className="truncate font-heading text-[18px] leading-tight text-text lg:text-[28px]">
            {title}
          </h1>
          {subtitle && (
            <div
              className={`mt-0.5 truncate text-xs text-neutral-700 lg:mt-1 lg:block lg:text-sm ${
                brand ? "hidden" : ""
              }`}
            >
              {subtitle}
            </div>
          )}
        </div>
        <div className="flex justify-end lg:hidden">
          <DemoUserSwitch variant="compact" />
        </div>
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, isNavActive } from "./nav";

/** Phone and tablet navigation. From the lg breakpoint up, the Sidebar takes over. */
export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Sections"
      className="sticky bottom-0 z-10 flex flex-shrink-0 border-t border-neutral-200 bg-surface px-1.5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2.5 lg:hidden"
    >
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isNavActive(href, pathname);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 flex-1 flex-col items-center gap-1 transition-colors ${
              active ? "font-bold text-accent-800" : "font-medium text-neutral-700"
            }`}
          >
            <span
              className={`flex h-7 w-12 items-center justify-center rounded-[var(--radius-pill)] transition-colors ${
                active ? "bg-accent-100" : ""
              }`}
            >
              <Icon size={20} strokeWidth={2.5} aria-hidden="true" />
            </span>
            <span className="text-[11px]">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

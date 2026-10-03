"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountMenu } from "./AccountMenu";
import { Wordmark } from "./ui/Logo";
import { useSpace } from "@/lib/space";
import { NAV_ITEMS, isNavActive } from "./nav";

/** Desktop navigation, shown from the lg breakpoint up in place of the bottom TabBar. */
export function Sidebar() {
  const { base, groupName } = useSpace();
  const pathname = usePathname().slice(base.length) || "/";

  return (
    <aside className="sticky top-0 hidden h-dvh flex-col border-r border-neutral-200 bg-surface px-4 pt-6 pb-6 lg:flex">
      <Link href={`${base}/pool`} aria-label="Ambag, task pool" className="px-3">
        <Wordmark />
      </Link>
      <p className="mt-2.5 truncate px-3 text-sm font-semibold text-neutral-800">{groupName}</p>

      <nav aria-label="Sections" className="mt-8 flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isNavActive(href, pathname);
          return (
            <Link
              key={href}
              href={`${base}${href}`}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-[var(--radius-base)] px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-accent-500 font-semibold text-white shadow-sm"
                  : "font-medium text-neutral-800 hover:bg-neutral-100 hover:text-text"
              }`}
            >
              <Icon size={18} strokeWidth={2.5} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-[var(--radius-card)] border border-neutral-200 bg-bg/60 p-3">
        <AccountMenu variant="full" />
      </div>
    </aside>
  );
}

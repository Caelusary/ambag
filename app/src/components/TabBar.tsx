"use client";

import { BarChart3, CheckSquare, Link2, ListChecks } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/pool", label: "Pool", icon: ListChecks },
  { href: "/review", label: "Review", icon: CheckSquare },
  { href: "/ledger", label: "Ledger", icon: BarChart3 },
  { href: "/share", label: "Share", icon: Link2 },
] as const;

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-10 flex flex-shrink-0 border-t border-neutral-300 bg-bg px-1.5 pb-4 pt-2.5">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 flex-col items-center gap-1 py-1 transition-colors ${
              active ? "font-bold text-accent-700" : "font-medium text-neutral-700"
            }`}
          >
            <Icon size={20} strokeWidth={2.75} />
            <span className="text-[11px]">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

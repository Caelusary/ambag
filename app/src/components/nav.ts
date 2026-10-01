import { BarChart3, CheckSquare, Link2, ListChecks } from "lucide-react";

/** The four top-level sections, shared by the phone tab bar and the desktop sidebar. */
export const NAV_ITEMS = [
  { href: "/pool", label: "Pool", icon: ListChecks },
  { href: "/review", label: "Review", icon: CheckSquare },
  { href: "/ledger", label: "Ledger", icon: BarChart3 },
  { href: "/share", label: "Share", icon: Link2 },
] as const;

/** Task pages belong to the pool, so the pool stays highlighted while one is open. */
export function isNavActive(href: string, pathname: string): boolean {
  if (href === "/pool") return pathname === "/pool" || pathname.startsWith("/task/");
  return pathname === href;
}

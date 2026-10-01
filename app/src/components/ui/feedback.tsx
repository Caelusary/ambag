import type { ReactNode } from "react";

/** Muted one-line message for empty lists and blocked actions. */
export function Notice({ children }: { children: ReactNode }) {
  return <div className="text-sm text-neutral-700">{children}</div>;
}

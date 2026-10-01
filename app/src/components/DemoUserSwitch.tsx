"use client";

import { DEMO_ACCOUNTS, useStore } from "@/lib/store";
import { Avatar } from "./ui/Avatar";

/**
 * Switches which demo account you're using, so both sides of a rule can be tried: Jamie as a
 * member, Maya as the leader who reviews. Goes away once there are real accounts.
 *
 * "full" is a labelled select for the desktop sidebar. "compact" is the avatar in the phone
 * header: a transparent native select sits over it, so tapping opens the phone's own picker.
 */
export function DemoUserSwitch({ variant }: { variant: "full" | "compact" }) {
  const { currentUser, setCurrentUser } = useStore();

  const select = (className: string) => (
    <select
      id={`viewing-as-${variant}`}
      aria-label="Viewing as"
      value={currentUser}
      onChange={(e) => setCurrentUser(e.target.value)}
      className={className}
    >
      {DEMO_ACCOUNTS.map((a) => (
        <option key={a.name} value={a.name}>
          {a.name} ({a.role})
        </option>
      ))}
    </select>
  );

  if (variant === "compact") {
    return (
      <div className="relative h-9 w-9 rounded-full ring-2 ring-surface">
        <Avatar name={currentUser} size="lg" />
        {select("absolute inset-0 h-full w-full cursor-pointer opacity-0")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="viewing-as-full" className="text-xs text-neutral-700">
        Viewing as
      </label>
      <div className="flex items-center gap-2.5">
        <Avatar name={currentUser} size="lg" />
        {select(
          "min-h-10 w-full min-w-0 cursor-pointer rounded-[var(--radius-base)] border border-neutral-300 bg-bg px-2.5 py-2 text-sm font-semibold text-text transition-colors hover:border-neutral-400",
        )}
      </div>
    </div>
  );
}

"use client";

import { useStore } from "@/lib/store-context";
import { Avatar } from "./ui/Avatar";

/**
 * Switches which demo account you're using, so both sides of a rule can be tried: Jamie as a
 * member, Maya as the leader who reviews. Goes away once there are real accounts.
 *
 * "full" is a labelled select for the desktop sidebar. "compact" is the avatar in the phone
 * header: a transparent native select sits over it, so tapping opens the phone's own picker.
 */
export function DemoUserSwitch({ variant }: { variant: "full" | "compact" }) {
  const { currentUser, memberName, switchableAccounts, setCurrentUser } = useStore();

  const select = (className: string) => (
    <select
      id={`viewing-as-${variant}`}
      aria-label="Viewing as"
      value={currentUser}
      onChange={(e) => setCurrentUser(e.target.value)}
      className={className}
    >
      {switchableAccounts.map((a) => (
        <option key={a.id} value={a.id}>
          {a.name} ({a.role})
        </option>
      ))}
    </select>
  );

  if (variant === "compact") {
    return (
      <div className="relative h-9 w-9 rounded-full ring-2 ring-surface">
        <Avatar name={memberName(currentUser)} size="lg" />
        {select("absolute -inset-1 cursor-pointer opacity-0")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <Avatar name={memberName(currentUser)} size="md" />
        <label htmlFor="viewing-as-full" className="text-xs text-neutral-700">
          Viewing as
        </label>
      </div>
      {select(
        "min-h-11 w-full min-w-0 cursor-pointer rounded-[var(--radius-base)] border border-neutral-300 bg-bg px-3 py-2 text-sm font-semibold text-text transition-colors hover:border-neutral-400",
      )}
    </div>
  );
}

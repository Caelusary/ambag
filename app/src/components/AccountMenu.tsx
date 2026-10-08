"use client";

import Link from "next/link";
import { useRef } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { logout } from "@/actions/auth";
import { useStore } from "@/lib/store-context";
import { useSpace } from "@/lib/space";
import { Avatar } from "./ui/Avatar";
import { DemoUserSwitch } from "./DemoUserSwitch";

const NEW_GROUP = "__new";
const LOG_OUT = "__logout";

/**
 * Who you are and which group you're in. The demo offers its account switch and a way to sign up;
 * a real group offers the switch between your groups, joining another, and logging out.
 *
 * "full" sits in the desktop sidebar. "compact" is the avatar in the phone header, with a native
 * select over it so tapping opens the phone's own picker.
 */
export function AccountMenu({ variant }: { variant: "full" | "compact" }) {
  const { kind, groupId, groups } = useSpace();
  const { currentUser, memberName } = useStore();
  const router = useRouter();
  const logoutForm = useRef<HTMLFormElement>(null);

  if (kind === "demo") {
    if (variant === "compact") return <DemoUserSwitch variant="compact" />;
    return (
      <div className="flex flex-col gap-3">
        <DemoUserSwitch variant="full" />
        <p className="text-xs leading-relaxed text-neutral-700">
          Nothing here is saved.{" "}
          <Link
            href="/signup"
            className="font-semibold text-accent-700 underline underline-offset-2"
          >
            Sign up
          </Link>{" "}
          to run your own group.
        </p>
      </div>
    );
  }

  const name = memberName(currentUser);

  function choose(value: string) {
    if (value === LOG_OUT) logoutForm.current?.requestSubmit();
    else if (value === NEW_GROUP) router.push("/onboarding");
    else router.push(`/${value}/pool`);
  }

  const options = (
    <>
      {groups.map((g) => (
        <option key={g.id} value={g.id}>
          {g.name}
        </option>
      ))}
      <option value={NEW_GROUP}>Create or join a group…</option>
      {variant === "compact" && <option value={LOG_OUT}>Log out</option>}
    </>
  );

  const form = <form ref={logoutForm} action={logout} className="hidden" />;

  if (variant === "compact") {
    return (
      <div className="relative h-9 w-9 rounded-full ring-2 ring-surface">
        <Avatar name={name} size="lg" />
        <select
          id="account-compact"
          aria-label={`${name}: switch group or log out`}
          value={groupId ?? ""}
          onChange={(e) => choose(e.target.value)}
          className="absolute -inset-1 cursor-pointer opacity-0"
        >
          {options}
        </select>
        {form}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <Avatar name={name} size="lg" />
        <span className="min-w-0 truncate text-sm font-semibold text-text">{name}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="group-switch" className="text-xs text-neutral-700">
          Group
        </label>
        <select
          id="group-switch"
          value={groupId ?? ""}
          onChange={(e) => choose(e.target.value)}
          className="min-h-11 w-full min-w-0 cursor-pointer rounded-[var(--radius-base)] border border-neutral-300 bg-bg px-3 py-2 text-sm font-semibold text-text transition-colors hover:border-neutral-400"
        >
          {options}
        </select>
      </div>
      <form action={logout}>
        <button
          type="submit"
          className="inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-neutral-800 transition-colors hover:text-text"
        >
          <LogOut size={15} strokeWidth={2.5} aria-hidden="true" />
          Log out
        </button>
      </form>
    </div>
  );
}

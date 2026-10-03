import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "@/actions/auth";
import { createGroup, joinGroup } from "@/actions/groups";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { AUTH_INPUT, AUTH_LABEL, AuthCard } from "@/components/auth/AuthCard";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { fetchMyGroups } from "@/lib/group-data";

/** After sign-up, and from the group switcher: start a group, or join one with a code. */
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const groups = await fetchMyGroups(await createClient(), user.id);

  return (
    <AuthCard
      title={groups.length > 0 ? "Add a group" : "Set up your group"}
      subtitle="Leading the project? Create the group. Otherwise, ask your leader for the code."
      error={error}
      footer={
        <form action={logout}>
          <button
            type="submit"
            className="font-semibold text-accent-700 underline underline-offset-2"
          >
            Log out
          </button>
        </form>
      }
    >
      <form action={joinGroup} className="flex flex-col gap-4">
        <label className={AUTH_LABEL}>
          Invite code
          <input
            name="code"
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            required
            maxLength={12}
            placeholder="8 letters and numbers"
            className={`${AUTH_INPUT} font-semibold tracking-[0.12em] uppercase placeholder:font-normal placeholder:tracking-normal placeholder:normal-case placeholder:text-neutral-600`}
          />
        </label>
        <SubmitButton block pendingLabel="Joining…">
          Join group
        </SubmitButton>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-neutral-700">
        <span className="h-px flex-1 bg-neutral-200" />
        or start a new one
        <span className="h-px flex-1 bg-neutral-200" />
      </div>

      <form action={createGroup} className="flex flex-col gap-4">
        <label className={AUTH_LABEL}>
          Group name
          <input
            name="name"
            type="text"
            required
            maxLength={60}
            placeholder="e.g. Capstone, Section B"
            className={`${AUTH_INPUT} placeholder:text-neutral-600`}
          />
          <span className="text-xs font-normal text-neutral-700">
            You&apos;ll lead it: you add tasks, review proof and decide swaps.
          </span>
        </label>
        <SubmitButton block variant="secondary" pendingLabel="Creating…">
          Create group
        </SubmitButton>
      </form>

      {groups.length > 0 && (
        <div className="mt-6 border-t border-neutral-200 pt-5">
          <p className="mb-2 text-xs text-neutral-700">Your groups</p>
          <ul className="flex flex-col gap-1">
            {groups.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/${g.id}/pool`}
                  className="block rounded-[var(--radius-base)] px-3 py-2 text-sm font-semibold text-text transition-colors hover:bg-neutral-100"
                >
                  {g.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </AuthCard>
  );
}

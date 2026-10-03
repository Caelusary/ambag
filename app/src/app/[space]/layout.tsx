import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Shell } from "@/components/Shell";
import { StoreProvider } from "@/lib/store";
import { LiveStoreProvider } from "@/lib/live-store-loader";
import { SpaceProvider } from "@/lib/space";
import { ClockProvider, EPOCH } from "@/lib/clock";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { fetchGroupSnapshot, fetchMyGroups } from "@/lib/group-data";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * One set of pages, two backings: /demo/... runs the in-memory demo, and /<group id>/... runs a
 * real group the signed-in user belongs to.
 */
export default async function SpaceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ space: string }>;
}) {
  const { space } = await params;

  if (space === "demo") {
    return (
      <SpaceProvider
        value={{
          kind: "demo",
          base: "/demo",
          groupId: null,
          groupName: "Demo group",
          inviteCode: null,
          groups: [],
        }}
      >
        <ClockProvider origin={EPOCH}>
          <StoreProvider>
            <Shell>{children}</Shell>
          </StoreProvider>
        </ClockProvider>
      </SpaceProvider>
    );
  }

  if (!UUID_RE.test(space)) notFound();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const [snapshot, groups] = await Promise.all([
    fetchGroupSnapshot(supabase, space),
    fetchMyGroups(supabase, user.id),
  ]);
  // RLS hides groups you're not in, so a stranger's group id looks the same as a missing one.
  if (!snapshot) notFound();

  return (
    <SpaceProvider
      value={{
        kind: "live",
        base: `/${space}`,
        groupId: space,
        groupName: snapshot.group.name,
        inviteCode: snapshot.group.inviteCode,
        groups,
      }}
    >
      {/* The server's clock, so the first frame's deadlines match what the client then shows. */}
      <ClockProvider origin={snapshot.fetchedAt}>
        <LiveStoreProvider initial={snapshot} userId={user.id}>
          <Shell>{children}</Shell>
        </LiveStoreProvider>
      </ClockProvider>
    </SpaceProvider>
  );
}

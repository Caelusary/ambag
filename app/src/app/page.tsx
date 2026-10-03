import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { fetchMyGroups } from "@/lib/group-data";

/** Sends you to your most recent group, or to create or join one. proxy.ts handles signed out. */
export default async function RootPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const groups = await fetchMyGroups(await createClient(), user.id);
  redirect(groups.length > 0 ? `/${groups[0].id}/pool` : "/onboarding");
}

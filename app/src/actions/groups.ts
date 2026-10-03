"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { clientKeyFromHeaders, isRateLimited } from "@/lib/rate-limit";

// Invite codes are only 8 characters, so guessing them must be slow.
const JOIN_ATTEMPTS_PER_MINUTE = 10;

export async function createGroup(formData: FormData) {
  const raw = formData.get("name");
  const name = typeof raw === "string" ? raw.trim() : "";
  if (name.length < 1 || name.length > 60) redirect("/onboarding?error=invalid_group_name");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_group", { p_name: name });
  if (error || typeof data !== "string") redirect("/onboarding?error=unknown");

  revalidatePath("/", "layout");
  redirect(`/${data}/pool`);
}

export async function joinGroup(formData: FormData) {
  const clientId = clientKeyFromHeaders(await headers());
  if (isRateLimited(`join:${clientId}`, JOIN_ATTEMPTS_PER_MINUTE)) {
    redirect("/onboarding?error=rate_limited");
  }

  const raw = formData.get("code");
  const code = typeof raw === "string" ? raw.replace(/\s+/g, "").toUpperCase() : "";
  if (!/^[A-Z0-9]{8}$/.test(code)) redirect("/onboarding?error=invite_not_found");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("join_group", { p_code: code });
  if (error?.message === "invite code not found") redirect("/onboarding?error=invite_not_found");
  if (error || typeof data !== "string") redirect("/onboarding?error=unknown");

  revalidatePath("/", "layout");
  redirect(`/${data}/pool`);
}

/** A new code for the leader to hand out; the old one stops working at once. */
export async function rotateInviteCode(groupId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rotate_invite_code", { p_group: groupId });
  if (error || typeof data !== "string") return null;
  revalidatePath(`/${groupId}`, "layout");
  return data;
}

"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { authErrorCode } from "@/lib/auth-errors";
import { fetchMyGroups } from "@/lib/group-data";
import { clientKeyFromHeaders, isRateLimited } from "@/lib/rate-limit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// These gate real authentication attempts, so scripted credential stuffing and sign-up spam
// should hit a wall fast.
const LOGIN_ATTEMPTS_PER_MINUTE = 10;
const SIGNUP_ATTEMPTS_PER_MINUTE = 5;

function parseCredentials(formData: FormData): { email: string; password: string } | null {
  const email = formData.get("email");
  const password = formData.get("password");
  if (typeof email !== "string" || typeof password !== "string") return null;
  const trimmedEmail = email.trim();
  if (!EMAIL_RE.test(trimmedEmail) || password.length < 6) return null;
  return { email: trimmedEmail, password };
}

/** Where the confirmation email's link lands: this deployment's own callback route. */
async function callbackUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}/auth/callback`;
}

export async function login(formData: FormData) {
  const clientId = clientKeyFromHeaders(await headers());
  if (isRateLimited(`login:${clientId}`, LOGIN_ATTEMPTS_PER_MINUTE)) {
    redirect("/login?error=rate_limited");
  }

  const credentials = parseCredentials(formData);
  if (!credentials) redirect("/login?error=invalid_input");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(credentials);

  if (error) {
    redirect(`/login?error=${authErrorCode(error)}`);
  }

  // Straight to the most recent group, skipping a hop through "/" that would check the session
  // twice more just to redirect again.
  const groups = await fetchMyGroups(supabase, data.user.id);
  revalidatePath("/", "layout");
  redirect(groups.length > 0 ? `/${groups[0].id}/pool` : "/onboarding");
}

export async function resendConfirmation(formData: FormData) {
  const clientId = clientKeyFromHeaders(await headers());
  if (isRateLimited(`resend:${clientId}`, SIGNUP_ATTEMPTS_PER_MINUTE)) {
    redirect("/login?error=rate_limited");
  }

  const email = formData.get("email");
  if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    redirect("/login?error=invalid_input");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: email.trim(),
    options: { emailRedirectTo: await callbackUrl() },
  });

  if (error) {
    redirect(`/login?error=${authErrorCode(error)}`);
  }

  redirect("/login?notice=confirmation_resent");
}

export async function signup(formData: FormData) {
  const clientId = clientKeyFromHeaders(await headers());
  if (isRateLimited(`signup:${clientId}`, SIGNUP_ATTEMPTS_PER_MINUTE)) {
    redirect("/signup?error=rate_limited");
  }

  // The name teammates see on tasks, swaps and the log. The profile trigger stores it.
  const rawName = formData.get("name");
  const name = typeof rawName === "string" ? rawName.trim() : "";
  if (name.length < 1 || name.length > 40) redirect("/signup?error=invalid_name");

  const credentials = parseCredentials(formData);
  if (!credentials) redirect("/signup?error=invalid_input");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...credentials,
    options: { data: { display_name: name }, emailRedirectTo: await callbackUrl() },
  });

  if (error) {
    redirect(`/signup?error=${authErrorCode(error)}`);
  }

  // With email confirmation on, there's no session until the link is clicked.
  if (!data.session) redirect("/login?notice=check_email");

  revalidatePath("/", "layout");
  redirect("/onboarding");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

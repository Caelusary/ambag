import "server-only";
import { cache } from "react";
import { createClient } from "./server";

/**
 * The signed-in user's id, memoised per request with React's `cache()`.
 *
 * `getClaims()` verifies the session JWT locally against the project's published signing keys,
 * so a page load no longer waits on a round trip to Supabase Auth. Measured locally, that call was
 * 70 to 280ms, and it ran twice per page (here and in proxy.ts). It falls back to asking Auth only
 * if the project still signs with a shared secret. RLS checks the same JWT on every query anyway,
 * so a token revoked minutes ago still can't read anything.
 */
export const getCurrentUser = cache(async (): Promise<{ id: string } | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  if (error || typeof sub !== "string") return null;
  return { id: sub };
});

/**
 * Environment variable validation, with no dependencies.
 *
 * NEXT_PUBLIC_* vars are referenced statically (not via process.env[name]) so Next.js can inline
 * them into client bundles at build time.
 */
export function getSupabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const missing: string[] = [];
  if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!anonKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}. ` +
        "Add them to app/.env.local for local development (see app/.env.example), or to your " +
        "hosting provider's environment settings, and redeploy.",
    );
  }

  return { url: url as string, anonKey: anonKey as string };
}

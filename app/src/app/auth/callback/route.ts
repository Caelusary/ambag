import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Where the sign-up confirmation email's link lands. It trades the one-time code for a session
 * cookie, then sends a brand-new account on to create or join a group.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const url = request.nextUrl.clone();
  url.search = "";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }
  }

  url.pathname = "/login";
  url.searchParams.set("error", "link_expired");
  return NextResponse.redirect(url);
}

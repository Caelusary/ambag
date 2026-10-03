import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseEnv } from "@/lib/env";

/** Pages that never look at the session, so there's nothing to check or refresh. */
function ignoresSession(pathname: string): boolean {
  return (
    // The demo runs entirely in the browser, with no account behind it.
    pathname === "/demo" ||
    pathname.startsWith("/demo/") ||
    // Share links are gated by their unguessable token, not by a session.
    pathname.startsWith("/s/")
  );
}

/** Pages anyone can open without an account. */
function isPublic(pathname: string): boolean {
  return pathname === "/login" || pathname === "/signup" || pathname.startsWith("/auth/");
}

export async function proxy(request: NextRequest) {
  if (ignoresSession(request.nextUrl.pathname)) return NextResponse.next();

  let supabaseResponse = NextResponse.next({ request });

  const { url: supabaseUrl, anonKey } = getSupabaseEnv();
  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // getClaims() refreshes an expired session (writing the new cookies above), then verifies the JWT
  // locally against the project's signing keys instead of calling Supabase Auth on every request,
  // including every prefetch. It can throw on a stale or rotated refresh-token cookie, such as an
  // old tab left open across a rotation; treat that as signed out on purpose, so an uncaught error
  // can't skip the redirect below.
  let user: { id: string } | null = null;
  try {
    const { data } = await supabase.auth.getClaims();
    const sub = data?.claims?.sub;
    user = typeof sub === "string" ? { id: sub } : null;
  } catch {
    user = null;
  }

  const pathname = request.nextUrl.pathname;
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  if (!user && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  // Everything under /_next is the framework's own (assets, images, the dev reload socket), so the
  // session check skips it along with the app icons and static files.
  matcher: ["/((?!_next/|icon|apple-icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

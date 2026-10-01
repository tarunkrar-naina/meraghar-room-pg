import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getPublicEnv } from "@/lib/env";

const PUBLIC_PATHS = ["/login", "/signup", "/forgot-password"];

/** Auth-protected routes for logged-in users. */
const PROTECTED_PATHS = [
  "/dashboard",
  "/add-property",
  "/edit-property",
  "/favorites",
  "/post-requirement",
];

const ADMIN_PREFIX = "/admin";
/** The dedicated admin login must stay reachable while signed out. */
const ADMIN_LOGIN = "/admin/login";

/** Drops a trailing slash so "/admin/" and "/admin" compare equal. */
function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

export async function proxy(request: NextRequest) {
  const env = getPublicEnv();

  const rawPath = request.nextUrl.pathname;
  // `trailingSlash: true` means /admin/login/ is canonical, while the constants
  // above are written without it. Normalise once so every comparison below is
  // slash-insensitive (otherwise /admin/login/ -> /admin/login loops forever).
  const pathname = normalizePath(rawPath);

  let supabaseResponse = NextResponse.next({ request });
  supabaseResponse.headers.set("x-pathname", rawPath);

  if (!env.isSupabaseConfigured) {
    return supabaseResponse;
  }

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        supabaseResponse.headers.set("x-pathname", rawPath);
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresh the auth session on every request - do NOT run on static assets.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  const isAdminArea =
    pathname === ADMIN_PREFIX || pathname.startsWith(`${ADMIN_PREFIX}/`);

  // Redirect logged-in users away from auth pages. Someone who is already signed
  // in and opens /admin/login belongs in the panel - the layout then decides
  // whether they are an admin or not.
  if (user) {
    const url = request.nextUrl.clone();
    if (pathname === ADMIN_LOGIN) {
      url.pathname = ADMIN_PREFIX;
      return NextResponse.redirect(url);
    }
    if (PUBLIC_PATHS.some((p) => pathname === p)) {
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  // Require login for protected routes. Admin goes to its own login, which also
  // handles the second factor - sending them to /login would skip it entirely.
  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (!user && isAdminArea && pathname !== ADMIN_LOGIN) {
    const url = request.nextUrl.clone();
    url.pathname = ADMIN_LOGIN;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|[\\w-]+\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|json|map|webmanifest)|favicon.ico).*)",
  ],
};

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isDashboardRoute = createRouteMatcher(["/dashboard(.*)"]);
const isProtectedApiRoute = createRouteMatcher([
  "/api/bookmarks(.*)",
  "/api/comments(.*)",
  "/api/history(.*)",
  "/api/likes(.*)",
  "/api/notifications(.*)",
  "/api/ratings(.*)",
  "/api/reviews(.*)",
  "/api/playlists(.*)",
  "/api/upload(.*)",
]);

// Next.js 16: exported as `proxy` (named export) per the new proxy.ts convention.
// clerkMiddleware wraps our handler and returns a NextProxy-compatible function.
export const proxy = clerkMiddleware(async (auth, request: NextRequest) => {
  const url = request.nextUrl.pathname;

  // --- Admin route protection (via separate admin cookie, NOT Clerk) ---
  if (isAdminRoute(request)) {
    // Allow /admin/login through
    if (url === "/admin/login") {
      return addSecurityHeaders(NextResponse.next());
    }

    const adminToken = request.cookies.get("admin_token")?.value;
    if (!adminToken) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    // Token validity is checked at the admin API level with JWT
    return addSecurityHeaders(NextResponse.next());
  }

  // --- Dashboard requires Clerk auth ---
  if (isDashboardRoute(request)) {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }
  }

  // --- Protected API routes require Clerk auth ---
  if (isProtectedApiRoute(request)) {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return addSecurityHeaders(NextResponse.next());
});

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("X-Request-ID", crypto.randomUUID());
  return response;
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};

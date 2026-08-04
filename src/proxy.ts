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
  // NOTE: /api/upload is NOT here — it uses requireAdmin() (JWT), not Clerk auth
]);

// Routes that Clerk should NOT intercept (admin uses its own JWT cookie)
const isPublicRoute = createRouteMatcher([
  "/admin(.*)",
  "/api/admin(.*)",
  "/api/health",
]);

// Next.js 16: exported as `proxy` (named export) per the new proxy.ts convention.
// clerkMiddleware wraps our handler and returns a NextProxy-compatible function.
// publicRoutes: routes where Clerk does NOT enforce its own auth/handshake
export const proxy = clerkMiddleware(async (auth, request: NextRequest) => {
  const url = request.nextUrl.pathname;

  // --- Let Clerk skip its handshake for admin routes entirely ---
  if (isPublicRoute(request)) {
    // Admin route protection (via separate admin cookie, NOT Clerk)
    if (url === "/admin/login") {
      return addSecurityHeaders(NextResponse.next());
    }
    // Protect all other /admin/* pages: require admin_token cookie
    if (url.startsWith("/admin")) {
      const adminToken = request.cookies.get("admin_token")?.value;
      if (!adminToken) {
        return NextResponse.redirect(new URL("/admin/login", request.url));
      }
    }
    // /api/admin/* routes pass through (they validate JWT in the handler)
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
    // Skip Next.js internals, static files, admin routes (admin uses own JWT auth), and Clerk routes
    "/((?!_next|admin|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Run for non-admin API routes only
    "/api/((?!admin).*)",
    "/(trpc)(.*)",
  ],
};

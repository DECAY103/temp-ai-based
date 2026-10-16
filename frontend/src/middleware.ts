/**
 * middleware.ts — Next.js Edge Middleware for RBAC route protection.
 * Owner: Person 1 (M.2)
 *
 * Rules:
 *  /candidate/*  → requires role: "candidate" or "admin"
 *  /recruiter/*  → requires role: "recruiter" or "admin"
 *  /auth/*       → public (no token needed)
 *
 * TODO (Person 1 — M.2):
 *  - Decode JWT from cookie (use jose or next-auth for edge-compatible JWT decode).
 *  - Check role claim and redirect to /auth/login if missing or wrong role.
 *  - Add token expiry check.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const searchParams = request.nextUrl.searchParams;

  const isLogoutOrSwitch =
    searchParams.has("logout") || searchParams.has("deleted") || searchParams.has("switch");
  const loggedInCookie = request.cookies.get("logged_in")?.value;
  const token = request.cookies.get("access_token")?.value;
  const role = request.cookies.get("user_role")?.value;

  // If visiting /auth/login with explicit logout/deleted/switch OR client deleted logged_in cookie:
  if (pathname === "/auth/login") {
    if (isLogoutOrSwitch || !loggedInCookie) {
      const response = NextResponse.next();
      response.cookies.delete("access_token");
      response.cookies.delete("logged_in");
      response.cookies.delete("user_role");
      return response;
    }
  }

  // If user is actively authenticated and visits login/verify without an explicit logout intent,
  // redirect them directly to their role-specific portal
  if (token && loggedInCookie && !isLogoutOrSwitch && (pathname === "/auth/login" || pathname === "/auth/verify")) {
    const destination = role === "admin" ? "/admin" : role === "candidate" ? "/candidate" : "/recruiter";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  // Protected portal routes: /candidate, /recruiter, /admin, /processing
  const hasAuth = Boolean(token || loggedInCookie);
  if (!hasAuth && !pathname.startsWith("/auth")) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // Route-level role enforcement
  if (role) {
    if (pathname.startsWith("/admin") && role !== "admin") {
      return NextResponse.redirect(new URL(role === "candidate" ? "/candidate" : "/recruiter", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/candidate/:path*",
    "/recruiter/:path*",
    "/processing/:path*",
    "/admin/:path*",
    "/auth/login",
    "/auth/verify",
  ],
};

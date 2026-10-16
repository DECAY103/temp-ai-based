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

  const token = request.cookies.get("access_token")?.value || request.cookies.get("logged_in")?.value;
  const role = request.cookies.get("user_role")?.value;

  // If user is already authenticated and visits /auth/login or /auth/verify,
  // redirect them directly to their role-specific portal
  if (token && (pathname === "/auth/login" || pathname === "/auth/verify")) {
    const destination = role === "admin" ? "/admin" : role === "candidate" ? "/candidate" : "/recruiter";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  // Protected portal routes: /candidate, /recruiter, /admin, /processing
  if (!token && !pathname.startsWith("/auth")) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
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

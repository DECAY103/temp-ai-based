import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const cleanUrl = backendUrl.replace(/\/+$/, "").replace(/\/api$/, "");

  try {
    const authHeader = request.headers.get("Authorization");
    const cookieHeader = request.headers.get("Cookie");
    await fetch(`${cleanUrl}/api/auth/logout`, {
      method: "POST",
      headers: {
        ...(authHeader ? { Authorization: authHeader } : {}),
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    }).catch(() => {});
  } catch {
    // Ignore backend connectivity errors during logout
  }

  const response = NextResponse.json({ message: "Successfully logged out." });
  response.cookies.delete("access_token");
  response.cookies.delete("logged_in");
  response.cookies.delete("user_role");
  return response;
}

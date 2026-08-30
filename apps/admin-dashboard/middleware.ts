import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware that redirects / to /dashboard or /login based on token presence.
 * Runs server-side BEFORE the page renders — no blank screen, no client useEffect delay.
 */
export function middleware(request: NextRequest) {
  // Only handle the root path
  if (request.nextUrl.pathname !== "/") {
    return NextResponse.next();
  }

  const token = request.cookies.get("sa_access_token")?.value;

  if (token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/"],
};

import { NextRequest, NextResponse } from 'next/server';
import { sessionSecret, verifySessionToken } from '@/lib/auth/session-token';

/**
 * Middleware to protect admin routes.
 * The session cookie is signed, so a hand-written cookie is rejected here
 * before the page (or its API calls) ever renders.
 */

const SESSION_COOKIE_NAME = 'admin_session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /admin routes (except /admin/login)
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const secret = sessionSecret();
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = secret ? await verifySessionToken(sessionCookie, secret) : null;

    if (!session) {
      const loginUrl = new URL('/admin/login', request.url);
      const response = NextResponse.redirect(loginUrl);
      if (sessionCookie) {
        response.cookies.delete(SESSION_COOKIE_NAME);
      }
      return response;
    }
  }

  // Allow the request to proceed
  return NextResponse.next();
}

// Configure which routes the middleware applies to
export const config = {
  matcher: ['/admin/:path*'],
};

import { NextRequest, NextResponse } from 'next/server';
import { sessionSecret, verifySessionToken } from '@/lib/auth/session-token';

const SESSION_COOKIE_NAME = 'admin_session';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const secret = sessionSecret();
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = secret ? await verifySessionToken(sessionCookie, secret) : null;
    if (!session) {
      const response = NextResponse.redirect(new URL('/admin/login', request.url));
      if (sessionCookie) response.cookies.delete(SESSION_COOKIE_NAME);
      return response;
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ['/admin/:path*'] };

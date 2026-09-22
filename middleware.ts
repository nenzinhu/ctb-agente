import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Middleware to protect admin routes
 * Redirects to login if no valid session exists
 */

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /admin routes (except /admin/login)
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('admin_session');

    if (!sessionCookie) {
      // No session, redirect to login
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    try {
      const session = JSON.parse(sessionCookie.value);

      // Check if session has expired
      if (session.expiresAt < Date.now()) {
        // Expired session, redirect to login
        const loginUrl = new URL('/admin/login', request.url);
        const response = NextResponse.redirect(loginUrl);
        response.cookies.delete('admin_session');
        return response;
      }
    } catch (error) {
      console.error('Error parsing session:', error);
      // Invalid session, redirect to login
      const loginUrl = new URL('/admin/login', request.url);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('admin_session');
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

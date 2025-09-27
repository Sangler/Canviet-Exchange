import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple auth gate using a cookie set by the login page (auth_token)
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get('auth_token')?.value;
  const isAuthenticated = Boolean(token);

  // Protect admin routes when not authenticated
  if (pathname.startsWith('/admin')) {
    if (!isAuthenticated) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Prevent access to auth pages when already logged in
  if (pathname === '/login' || pathname === '/register') {
    if (isAuthenticated) {
      const url = req.nextUrl.clone();
      url.pathname = '/admin';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/login', '/register'],
};

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkRateLimit } from '@/lib/middleware/rateLimiter';
import { loginRateLimitMiddleware } from '@/lib/middleware/login-rate-limiter';

const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.vercel.app",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https: res.cloudinary.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https: wss:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),
};

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/register', '/api/auth/seed'];

function shouldApplySecurityHeaders(pathname: string): boolean {
  return !pathname.startsWith('/_next') && !pathname.startsWith('/static');
}

function applySecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const loginRateLimitResponse = loginRateLimitMiddleware(request);
  if (loginRateLimitResponse) {
    return applySecurityHeaders(loginRateLimitResponse);
  }

  // Visiting /login clears any existing session cookie so a stale
  // authenticated session does not linger after a manual re-login.
  if (pathname === '/login' && request.cookies.has('accessToken')) {
    const response = NextResponse.next();
    response.cookies.set('accessToken', '', { path: '/', maxAge: 0 });
    response.cookies.set('refreshToken', '', { path: '/', maxAge: 0 });
    return applySecurityHeaders(response);
  }

  if (shouldApplySecurityHeaders(pathname)) {
    const rateLimitResponse = applyRateLimiting(request);
    if (rateLimitResponse) {
      return applySecurityHeaders(rateLimitResponse);
    }
  }

  const response = NextResponse.next();
  return applySecurityHeaders(response);
}

function applyRateLimiting(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return null;
  }
  
  let type = 'default';
  if (pathname.startsWith('/api/auth/')) {
    type = 'auth';
  } else if (pathname.includes('/upload') || pathname.includes('/delete')) {
    type = 'upload';
  }
  
  const { allowed, remaining, resetTime } = checkRateLimit(request, type);
  
  const response = NextResponse.next();
  
  response.headers.set('X-RateLimit-Limit', String(type === 'auth' ? 5 : type === 'upload' ? 10 : 100));
  response.headers.set('X-RateLimit-Remaining', String(remaining));
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(resetTime / 1000)));
  
  if (!allowed) {
    const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
    response.headers.set('Retry-After', String(retryAfter));
    
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.', retryAfter },
      { status: 429, headers: Object.fromEntries(response.headers) }
    );
  }
  
  return null;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};

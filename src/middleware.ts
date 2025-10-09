import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const isDev = process.env.NODE_ENV === 'development';
  
  const response = NextResponse.next();
  
  // Set CSP headers based on environment
  if (isDev) {
    // Development: Very permissive to avoid warnings
    response.headers.set(
      'Content-Security-Policy',
      [
        "default-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: https: blob:",
        "font-src 'self' data: https://fonts.gstatic.com",
        "connect-src 'self' https: wss: ws: https://*.binance.com wss://*.binance.com",
        "media-src 'self' data: blob:",
        "worker-src 'self' blob:",
      ].join('; ')
    );
  } else {
    // Production: Strict CSP for security
    response.headers.set(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://vercel.live",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: https: blob:",
        "font-src 'self' data: https://fonts.gstatic.com",
        "connect-src 'self' https: wss: ws://localhost:8080 https://*.binance.com wss://*.binance.com",
        "media-src 'self' data: blob:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "upgrade-insecure-requests"
      ].join('; ')
    );
  }
  
  return response;
}

export const config = {
  matcher: '/:path*',
};


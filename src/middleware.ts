import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getDevEngineWsUrl, getEngineWsUrl } from '@/shared/lib/engine/getEngineWsUrl';

export function middleware(_request: NextRequest) {
  const isDev = process.env.NODE_ENV === 'development';
  const connectSources = new Set<string>([
    "'self'",
    "https:",
    "wss:",
    "https://*.binance.com",
    "wss://*.binance.com",
  ]);

  const engineWs = getEngineWsUrl(getDevEngineWsUrl());
  try {
    const target = new URL(engineWs);
    connectSources.add(`${target.protocol}//${target.host}`);
    if (target.protocol === 'ws:') {
      connectSources.add(`http://${target.host}`);
      connectSources.add('ws:');
    } else if (target.protocol === 'wss:') {
      connectSources.add(`https://${target.host}`);
    }
  } catch {
    // Ignore malformed env values during runtime; CSP remains permissive
  }

  if (isDev) {
    connectSources.add('http://localhost:8080');
    connectSources.add('ws://localhost:8080');
    connectSources.add('ws:');
  }

  const connectSrcDirective = Array.from(connectSources).join(' ');

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
        `connect-src ${connectSrcDirective}`,
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
        `connect-src ${connectSrcDirective}`,
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

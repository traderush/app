import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  // Suppress hydration warnings from browser extensions
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  // Webpack configuration to prevent cache errors
  webpack: (config, { dev, isServer }) => {
    // Use memory cache in development to prevent ENOENT file system errors
    if (dev && !isServer) {
      config.cache = {
        type: 'memory',
      };
    }
    return config;
  },
  // Configure Content Security Policy
  // More permissive in development for hot reloading, strict in production
  async headers() {
    const isDev = process.env.NODE_ENV === 'development';
    
    // In development, use a very permissive CSP to avoid warnings
    // In production, use a strict CSP for security
    if (isDev) {
      return [
        {
          source: '/(.*)',
          headers: [
            {
              key: 'Content-Security-Policy',
              value: [
                "default-src 'self' 'unsafe-inline' 'unsafe-eval'",
                "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live",
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                "img-src 'self' data: https: blob:",
                "font-src 'self' data: https://fonts.gstatic.com",
                "connect-src 'self' https: wss: ws: https://*.binance.com wss://*.binance.com",
                "media-src 'self' data: blob:",
                "worker-src 'self' blob:",
              ].join('; ')
            }
          ]
        }
      ];
    }
    
    // Production: Strict CSP
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
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
          }
        ]
      }
    ];
  }
};

export default nextConfig;

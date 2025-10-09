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
    
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Development: allow eval for hot reloading; Production: remove unsafe-eval
              isDev 
                ? "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live"
                : "script-src 'self' 'unsafe-inline' https://vercel.live",
              // Allow styles from self, inline styles, and Google Fonts
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: https: blob:",
              // Allow fonts from self, data URIs, and Google Fonts CDN
              "font-src 'self' data: https://fonts.gstatic.com",
              // Allow WebSocket connections for live updates and trading
              "connect-src 'self' https: wss: ws://localhost:8080 ws://localhost:* https://*.binance.com wss://*.binance.com",
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

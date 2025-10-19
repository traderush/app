import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'framerusercontent.com' },
      { protocol: 'https', hostname: 'is1-ssl.mzstatic.com' },
      { protocol: 'https', hostname: 'static1.tokenterminal.com' },
      { protocol: 'https', hostname: 'avatarfiles.alphacoders.com' },
      { protocol: 'https', hostname: 'uxwing.com' },
      { protocol: 'https', hostname: 'encrypted-tbn0.gstatic.com' },
      { protocol: 'https', hostname: 'static.crypto.com' },
      { protocol: 'https', hostname: 'i.ibb.co' },
      { protocol: 'https', hostname: 'i.imgflip.com' },
      { protocol: 'https', hostname: 'pbs.twimg.com' },
    ],
  },
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
  // Content Security Policy is now handled by middleware.ts for better dev/prod control
};

export default nextConfig;

import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['@payloadcms/drizzle/sqlite'],
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
    ],
  },
}

export default nextConfig

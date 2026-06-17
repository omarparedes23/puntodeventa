import type { NextConfig } from 'next'
const nextConfig: NextConfig = {
  transpilePackages: ['@marketpos/core'],
  images: {
    remotePatterns: [
      // Test mode: allow any HTTPS image URL
      // TODO: restrict to Cloudflare R2 domain when migrating photos
      { protocol: 'https', hostname: '**' },
    ],
  },
}
export default nextConfig

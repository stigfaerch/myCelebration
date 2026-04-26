import createNextIntlPlugin from 'next-intl/plugin'
import type { NextConfig } from 'next'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  experimental: {
    serverActions: {
      // Largest upload path is admin invitation (25 MB cap in
      // information.ts#uploadInvitation). 30 MB gives multipart-overhead headroom.
      bodySizeLimit: '30mb',
    },
  },
}

export default withNextIntl(nextConfig)

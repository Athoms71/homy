/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@homy/shared-types'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
}

module.exports = nextConfig

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Simplified configuration to avoid build trace issues
  experimental: {
    // Disable problematic optimizations temporarily
    esmExternals: false,
    optimizePackageImports: [],
    serverComponentsExternalPackages: ['sharp'],
  },

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Basic optimizations
  compress: true,
  poweredByHeader: false,
  generateEtags: true,

  // Simplified webpack config
  webpack: (config, { dev, isServer }) => {
    // Basic production optimizations only
    if (!dev) {
      config.optimization.usedExports = true
    }
    return config
  },

  // Headers for security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ]
  },

  // Redirects
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/dashboard/overview',
        permanent: true,
      },
    ]
  },

  // Enable SWC minification
  swcMinify: true,

  // Optimize CSS
  optimizeFonts: true,

  // Enable React strict mode
  reactStrictMode: true,

  // TypeScript and ESLint
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
}

module.exports = nextConfig


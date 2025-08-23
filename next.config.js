/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    esmExternals: false,
    forceSwcTransforms: false,
  },

  // Enable SWC-based minification for smaller & faster builds
  swcMinify: true,

  // React best practices
  reactStrictMode: true,

  // Enable compression for faster responses
  compress: true,

  // Remove "x-powered-by: Next.js" header for security
  poweredByHeader: false,
}

module.exports = nextConfig

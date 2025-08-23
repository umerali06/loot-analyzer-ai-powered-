/** @type {import('next').NextConfig} */
const nextConfig = {
  // Minimal configuration to prevent build issues
  experimental: {
    // Disable experimental features
    esmExternals: false,
    forceSwcTransforms: false,
  },

  // Basic image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    dangerouslyAllowSVG: true,
  },

  // Disable minification completely to avoid build errors
  swcMinify: false,

  // Disable webpack optimizations
  webpack: (config) => {
    config.optimization.minimize = false
    return config
  },

  // Basic optimizations
  compress: false,
  poweredByHeader: false,
  reactStrictMode: true,
}

module.exports = nextConfig


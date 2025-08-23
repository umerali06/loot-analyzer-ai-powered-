/** @type {import('next').NextConfig} */
const nextConfig = {
  // Minimal configuration
  experimental: {
    esmExternals: false,
    forceSwcTransforms: false,
  },

  // Disable minification to prevent errors
  swcMinify: false,

  // Basic webpack config
  webpack: (config) => {
    // Minimal optimizations only
    config.optimization.minimize = false
    return config
  },

  // Basic settings
  compress: false,
  poweredByHeader: false,
  reactStrictMode: false,
}

module.exports = nextConfig
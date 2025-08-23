/** @type {import('next').NextConfig} */
const nextConfig = {
  // Minimal configuration to prevent build issues
  experimental: {
    // Disable all experimental features
    esmExternals: false,
    forceSwcTransforms: false,
  },

  // Disable minification completely
  swcMinify: false,

  // Disable all webpack optimizations
  webpack: (config) => {
    config.optimization.minimize = false
    config.optimization.usedExports = false
    config.optimization.sideEffects = false
    config.optimization.splitChunks = false
    return config
  },

  // Disable all optimizations
  compress: false,
  poweredByHeader: false,
  reactStrictMode: true,
}

module.exports = nextConfig


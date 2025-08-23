/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable file tracing globally to prevent call stack overflow
  outputFileTracing: false,
  outputFileTracingRoot: undefined,
  
  // Disable static analysis during builds
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // Force all pages to be dynamic
  output: 'standalone',
  
  // Disable all static optimizations
  experimental: {
    forceSwcTransforms: false,
    esmExternals: false,
  },

  // Disable source maps and optimizations
  productionBrowserSourceMaps: false,
  swcMinify: false,
  
  // Simple webpack config
  webpack: (config) => {
    config.optimization.minimize = false;
    return config;
  },
}

module.exports = nextConfig
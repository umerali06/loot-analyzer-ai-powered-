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

  // Output as standalone for Vercel
  output: 'standalone',

  // Disable all static optimizations
  experimental: {
    forceSwcTransforms: false,
    esmExternals: false,
    // Handle ES modules properly
    esmExternals: 'loose',
  },

  // Disable source maps to reduce memory usage
  productionBrowserSourceMaps: false,

  // Disable optimizations that cause memory issues
  swcMinify: false,
  reactStrictMode: false,
  compress: false,
  poweredByHeader: false,

  // Reduce webpack memory usage and handle ES modules
  webpack: (config, { isServer }) => {
    config.optimization.minimize = false;
    
    // Handle ES modules that cause parsing issues
    config.module.rules.push({
      test: /\.m?js$/,
      type: 'javascript/auto',
      resolve: {
        fullySpecified: false,
      },
    });

    // Better ES module handling
    config.resolve.extensionAlias = {
      '.js': ['.js', '.ts', '.tsx'],
      '.mjs': ['.mjs', '.js', '.ts', '.tsx'],
    };

    return config;
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
    ];
  },

  // Redirects
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/dashboard/overview',
        permanent: true,
      },
    ];
  },
  trailingSlash: false,
  distDir: '.next',
}

module.exports = nextConfig
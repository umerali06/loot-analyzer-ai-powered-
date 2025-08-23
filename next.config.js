/** @type {import('next').NextConfig} */
const nextConfig = {
  // Recommended for Vercel – minimal tracing
  output: 'standalone',

  experimental: {
    esmExternals: false,
    forceSwcTransforms: false,
  },

  // Keep minification enabled (disabling can cause slower builds)
  swcMinify: true,

  webpack: (config) => {
    // Prevent micromatch recursion crash during build traces
    config.externals = [
      ...(config.externals || []),
      ({ request }, callback) => {
        if (request?.includes('micromatch')) {
          return callback(null, 'commonjs ' + request)
        }
        callback()
      },
    ]

    return config
  },

  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
}

module.exports = nextConfig

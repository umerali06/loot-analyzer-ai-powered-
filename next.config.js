/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    esmExternals: false,
    forceSwcTransforms: false,
  },

  swcMinify: true,
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,

  webpack: (config) => {
    // 🔑 Forcefully remove the trace plugin that causes recursion
    config.plugins = config.plugins.filter(
      (plugin) => plugin.constructor?.name !== 'TraceEntryPointsPlugin'
    )

    return config
  },
}

module.exports = nextConfig

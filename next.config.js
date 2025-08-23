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

  webpack: (config, { isServer, dev }) => {
    // 🔑 Forcefully remove the trace plugin that causes recursion
    if (!dev) {
      config.plugins = config.plugins.filter(
        (plugin) => {
          const pluginName = plugin.constructor?.name || '';
          return !pluginName.includes('Trace') && 
                 !pluginName.includes('BuildTraces') &&
                 !pluginName.includes('EntryPoints');
        }
      );
    }

    return config
  },
}

module.exports = nextConfig

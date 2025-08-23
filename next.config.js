/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable build traces at the Next.js level
  experimental: {
    esmExternals: false,
    forceSwcTransforms: false,
    // Disable all build optimization features that might cause issues
    optimizePackageImports: [],
    serverComponentsExternalPackages: [],
    // Disable build traces
    bundlePagesRouterDependencies: false,
    gzipSize: false,
  },

  // Use standalone output which has different build process
  output: 'standalone',
  
  // Basic settings
  swcMinify: true,
  reactStrictMode: false, // Disable to prevent issues
  compress: true,
  poweredByHeader: false,

  // Simplified webpack config
  webpack: (config, { isServer, dev }) => {
    // Completely disable webpack optimizations that could cause recursion
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        splitChunks: false,
        usedExports: false,
        sideEffects: false,
      }
      
      // Remove ALL trace-related plugins
      config.plugins = config.plugins.filter(plugin => {
        const name = plugin.constructor?.name || '';
        return !name.toLowerCase().includes('trace') && 
               !name.toLowerCase().includes('collect');
      });
    }

    return config;
  },

  // Disable static optimization for problematic routes
  async headers() {
    return [];
  },
}

module.exports = nextConfig
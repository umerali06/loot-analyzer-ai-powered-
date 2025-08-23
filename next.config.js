/** @type {import('next').NextConfig} */
const nextConfig = {
  // Completely disable build traces to prevent call stack overflow
  experimental: {
    esmExternals: false,
    forceSwcTransforms: false,
    // Disable build traces collection
    buildTraces: false,
  },

  // Disable minification
  swcMinify: false,

  // Disable all webpack optimizations
  webpack: (config) => {
    // Disable all optimizations that might cause issues
    config.optimization = {
      ...config.optimization,
      minimize: false,
      usedExports: false,
      sideEffects: false,
      splitChunks: false,
      concatenateModules: false,
    }
    
    // Disable build traces
    config.plugins = config.plugins.filter(plugin => 
      plugin.constructor.name !== 'BuildTracesPlugin'
    )
    
    return config
  },

  // Disable all other optimizations
  compress: false,
  poweredByHeader: false,
  reactStrictMode: false,
  
  // Force development mode to prevent build traces
  mode: 'development',
}

module.exports = nextConfig
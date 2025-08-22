export const DOMAIN_CONFIG = {
  // Production domain settings
  production: {
    domain: process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.vercel.app',
    apiDomain: process.env.API_DOMAIN || 'https://your-domain.vercel.app',
    cdnDomain: process.env.CDN_DOMAIN || 'https://your-cdn-domain.com',
  },

  // SSL and security settings
  ssl: {
    enabled: true,
    redirectHttp: true,
    hsts: {
      enabled: true,
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
  },

  // CDN configuration
  cdn: {
    enabled: !!process.env.CDN_DOMAIN,
    staticAssets: [
      '/images',
      '/icons',
      '/fonts',
      '/_next/static',
    ],
    cacheControl: {
      images: 'public, max-age=31536000, immutable',
      fonts: 'public, max-age=31536000, immutable',
      static: 'public, max-age=31536000, immutable',
      api: 'public, max-age=300, s-maxage=600',
    },
  },

  // Redirects configuration
  redirects: [
    {
      source: '/home',
      destination: '/',
      permanent: true,
    },
    {
      source: '/app',
      destination: '/analyze',
      permanent: true,
    },
  ],

  // Rewrites configuration
  rewrites: [
    {
      source: '/api/:path*',
      destination: '/api/:path*',
    },
    {
      source: '/dashboard/:path*',
      destination: '/dashboard/:path*',
    },
  ],
}

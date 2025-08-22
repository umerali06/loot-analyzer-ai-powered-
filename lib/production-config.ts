export const PRODUCTION_CONFIG = {
  // Security settings
  security: {
    cors: {
      origin: process.env.CORS_ORIGIN || 'https://your-domain.vercel.app',
      credentials: true,
    },
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    },
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  },

  // Database settings
  database: {
    mongodb: {
      uri: process.env.MONGODB_URI || '',
      dbName: process.env.MONGODB_DB_NAME || 'lot-analyzer-prod',
      options: {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      },
    },
    redis: {
      url: process.env.REDIS_URL || '',
      password: process.env.REDIS_PASSWORD || '',
      options: {
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
      },
    },
  },

  // JWT settings
  jwt: {
    secret: process.env.JWT_SECRET || '',
    refreshSecret: process.env.JWT_REFRESH_SECRET || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // API settings
  api: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
    },
    scraper: {
      apiKey: process.env.SCRAPER_API_KEY || '',
    },
  },

  // Monitoring settings
  monitoring: {
    sentry: {
      dsn: process.env.SENTRY_DSN || '',
    },
    vercel: {
      analyticsId: process.env.VERCEL_ANALYTICS_ID || '',
    },
  },
}

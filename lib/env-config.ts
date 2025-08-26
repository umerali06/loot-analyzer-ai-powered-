/**
 * Environment Configuration
 * Centralized environment variable management with validation
 */

export interface EnvironmentConfig {
  // OpenAI Configuration
  openai: {
    apiKey: string;
    timeout: number;
    maxRetries: number;
  };
  
  // ScraperAPI Configuration
  scraper: {
    apiKey: string;
    baseUrl: string;
  };
  
  // Database Configuration
  database: {
    uri: string;
  };
  
  // JWT Configuration
  jwt: {
    secret: string;
    refreshSecret: string;
    accessExpiresIn: string;
    refreshExpiresIn: string;
  };
  
  // App Configuration
  app: {
    nodeEnv: string;
    isProduction: boolean;
    isDevelopment: boolean;
  };
}

/**
 * Load and validate environment variables
 */
function loadEnvironmentConfig(): EnvironmentConfig {
  // OpenAI Configuration
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }
  
  // ScraperAPI Configuration
  const scraperApiKey = process.env.SCRAPER_API_KEY;
  if (!scraperApiKey) {
    throw new Error('SCRAPER_API_KEY environment variable is required');
  }
  
  // Database Configuration
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is required');
  }
  
  // JWT Configuration
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
  if (!jwtRefreshSecret) {
    throw new Error('JWT_REFRESH_SECRET environment variable is required');
  }
  
  return {
    openai: {
      apiKey: openaiApiKey,
      timeout: parseInt(process.env.OPENAI_TIMEOUT || '30000'),
      maxRetries: parseInt(process.env.OPENAI_MAX_RETRIES || '3'),
    },
    
    scraper: {
      apiKey: scraperApiKey,
      baseUrl: process.env.SCRAPER_BASE_URL || 'http://api.scraperapi.com',
    },
    
    database: {
      uri: mongoUri,
    },
    
    jwt: {
      secret: jwtSecret,
      refreshSecret: jwtRefreshSecret,
      accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },
    
    app: {
      nodeEnv: process.env.NODE_ENV || 'development',
      isProduction: process.env.NODE_ENV === 'production',
      isDevelopment: process.env.NODE_ENV === 'development',
    },
  };
}

/**
 * Get environment configuration
 * Throws error if required variables are missing
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  try {
    return loadEnvironmentConfig();
  } catch (error) {
    console.error('❌ Environment configuration error:', error);
    console.error('🔑 Please check your .env.local file contains all required variables:');
    console.error('   - OPENAI_API_KEY');
    console.error('   - SCRAPER_API_KEY');
    console.error('   - MONGODB_URI');
    console.error('   - JWT_SECRET');
    console.error('   - JWT_REFRESH_SECRET');
    throw error;
  }
}

/**
 * Validate specific environment variable
 */
export function validateEnvVar(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value;
}

/**
 * Get OpenAI API key with validation
 */
export function getOpenAIAPIKey(): string {
  return validateEnvVar('OPENAI_API_KEY', process.env.OPENAI_API_KEY);
}

/**
 * Get ScraperAPI key with validation
 */
export function getScraperAPIKey(): string {
  return validateEnvVar('SCRAPER_API_KEY', process.env.SCRAPER_API_KEY);
}

/**
 * Get eBay API key (optional)
 */
export function getEbayAPIKey(): string {
  return process.env.EBAY_API_KEY || '';
}

/**
 * Get MongoDB URI with validation
 */
export function getMongoDBURI(): string {
  return validateEnvVar('MONGODB_URI', process.env.MONGODB_URI);
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

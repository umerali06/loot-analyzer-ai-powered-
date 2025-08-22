# Production Deployment Guide

This guide covers deploying the SIBI Lot Analyzer application to production on Vercel.

## Prerequisites

- Vercel account and CLI installed
- MongoDB Atlas production cluster
- Redis production instance
- OpenAI API key
- ScraperAPI key
- Custom domain (optional)

## Step 1: Environment Setup

1. Copy the production environment template:
   ```bash
   cp env.production.template .env.production.local
   ```

2. Fill in your production values in `.env.production.local`:
   - Set secure JWT secrets
   - Configure MongoDB Atlas connection string
   - Set Redis connection details
   - Add API keys
   - Configure custom domain if applicable

## Step 2: Production Build

Run the production build script:
```bash
npm run build:prod
```

This script will:
- Check for required environment variables
- Run type checking
- Run linting
- Run tests
- Build the application

## Step 3: Deploy to Vercel

1. **First-time deployment:**
   ```bash
   vercel
   ```

2. **Production deployment:**
   ```bash
   npm run deploy:prod
   ```

   Or manually:
   ```bash
   vercel --prod
   ```

## Step 4: Domain Configuration

1. **Custom Domain Setup:**
   - Go to your Vercel dashboard
   - Select your project
   - Go to Settings > Domains
   - Add your custom domain
   - Configure DNS records as instructed

2. **SSL Certificate:**
   - Vercel automatically provisions SSL certificates
   - Ensure HTTPS redirects are enabled

## Step 5: Environment Variables

Set production environment variables in Vercel:
```bash
vercel env add JWT_SECRET
vercel env add MONGODB_URI
vercel env add REDIS_URL
# ... add all required variables
```

## Step 6: Monitoring Setup

1. **Sentry (Error Tracking):**
   - Create Sentry project
   - Add DSN to environment variables
   - Configure alert rules

2. **Vercel Analytics:**
   - Enable in project settings
   - Add analytics ID to environment variables

## Step 7: Verification

1. **Health Check:**
   - Visit `/api/health` endpoint
   - Verify all services are connected

2. **Functionality Test:**
   - Test authentication flow
   - Test image upload and analysis
   - Verify database operations

## Troubleshooting

### Common Issues

1. **Environment Variables Missing:**
   - Check `.env.production.local` exists
   - Verify all required variables are set in Vercel

2. **Database Connection Failed:**
   - Verify MongoDB Atlas network access
   - Check connection string format
   - Ensure database user has correct permissions

3. **Build Failures:**
   - Check TypeScript errors
   - Verify all dependencies are installed
   - Check for linting errors

### Support

- Check Vercel deployment logs
- Review application logs
- Test locally with production environment variables

## Security Checklist

- [ ] JWT secrets are secure and unique
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled
- [ ] Security headers are set
- [ ] HTTPS is enforced
- [ ] Environment variables are secure
- [ ] Database access is restricted
- [ ] API keys are properly secured

## Performance Optimization

- [ ] Image optimization is enabled
- [ ] CDN is configured (if applicable)
- [ ] Database indexes are created
- [ ] Caching is properly configured
- [ ] Bundle size is optimized

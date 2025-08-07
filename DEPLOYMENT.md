# 🚀 Deployment Guide for Grant Predictor

## Prerequisites
- GitHub account with repository access
- Vercel account (free tier works)
- Google Cloud Console account for OAuth
- Stripe account (optional, for payments)
- PostgreSQL database (Supabase/Neon recommended)

## 📋 Step-by-Step Deployment

### 1. Database Setup (Choose One)

#### Option A: Supabase (Recommended - Free Tier Available)
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Settings → Database
4. Copy your connection string
5. Run the migration script:
   ```sql
   -- Copy contents from src/lib/database/migrations/001_initial_schema.sql
   ```

#### Option B: Neon
1. Go to [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string

#### Option C: Vercel Postgres
1. In Vercel dashboard, go to Storage
2. Create a Postgres database
3. Connection string will be auto-configured

### 2. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
5. Application type: Web application
6. Add authorized JavaScript origins:
   - `http://localhost:3000` (development)
   - `https://your-app.vercel.app` (production)
7. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://your-app.vercel.app/api/auth/callback/google`
8. Copy Client ID and Client Secret

### 3. OpenAI API Key

1. Go to [platform.openai.com](https://platform.openai.com)
2. Navigate to API Keys
3. Create a new secret key
4. Copy and save it securely

### 4. Stripe Setup (Optional)

1. Go to [stripe.com](https://stripe.com)
2. Get your test/live API keys from Dashboard
3. Create a product and price
4. Set up webhook endpoint:
   - Endpoint URL: `https://your-app.vercel.app/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `customer.subscription.updated`

### 5. Deploy to Vercel

#### Method 1: Via Vercel Dashboard (Recommended)
1. Go to [vercel.com](https://vercel.com)
2. Click "Import Project"
3. Import your GitHub repository
4. Configure environment variables (see below)
5. Deploy!

#### Method 2: Via Vercel CLI
```bash
npm i -g vercel
vercel
# Follow prompts
```

### 6. Environment Variables in Vercel

Add these in Vercel Dashboard → Settings → Environment Variables:

```env
# Required
DATABASE_URL=your-database-url
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
OPENAI_API_KEY=your-openai-key

# Optional
ANTHROPIC_API_KEY=your-anthropic-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-pub-key
STRIPE_SECRET_KEY=your-stripe-secret-key
```

### 7. Generate NEXTAUTH_SECRET

Run this command to generate a secure secret:
```bash
openssl rand -base64 32
```

## 🔍 Post-Deployment Checklist

- [ ] Test Google OAuth login
- [ ] Upload a test document
- [ ] Verify AI predictions work
- [ ] Test document enhancement feature
- [ ] Check rate limiting
- [ ] Verify HTTPS is working
- [ ] Test on mobile devices

## 🐛 Troubleshooting

### Google OAuth Not Working
- Verify redirect URIs match exactly
- Check NEXT_PUBLIC_GOOGLE_CLIENT_ID is set
- Ensure GOOGLE_CLIENT_SECRET is correct

### Database Connection Issues
- Check DATABASE_URL format
- Verify SSL settings (`?sslmode=require`)
- Ensure database is accessible

### AI Features Not Working
- Verify OPENAI_API_KEY is valid
- Check API key has sufficient credits
- Monitor rate limits

### Build Failures
- Check all environment variables are set
- Verify Node.js version compatibility
- Review build logs in Vercel

## 📊 Monitoring

### Vercel Analytics
Automatically enabled on Vercel deployments

### Error Tracking
Consider adding:
- Sentry for error tracking
- LogRocket for session replay
- Datadog for APM

## 🔒 Security Notes

1. **Never commit `.env.local` to Git**
2. **Rotate API keys regularly**
3. **Use different keys for development/production**
4. **Enable 2FA on all service accounts**
5. **Monitor API usage for anomalies**

## 📞 Support

- Vercel Support: [vercel.com/support](https://vercel.com/support)
- Next.js Docs: [nextjs.org/docs](https://nextjs.org/docs)
- Project Issues: [GitHub Issues](https://github.com/mkmk5298/grant-success-predictor/issues)

## 🎉 Congratulations!

Your Grant Predictor app should now be live! Visit your Vercel URL to see it in action.

Default URL format: `https://[project-name].vercel.app`

---

Made with ❤️ using Next.js, TypeScript, and AI
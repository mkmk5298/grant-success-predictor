# 🚀 Grant Predictor - Complete Deployment Guide

## 📋 Prerequisites

### ✅ Already Configured
- **OpenAI API Key**: ✅ `sk-proj-xJurijt74zWx...`
- **CockroachDB**: ✅ `postgresql://mookun5298_gmail_com:...@army-lioness-14471.j77.cockroachlabs.cloud`
- **Stripe Test Key**: ✅ `sk_test_51Rt8iX...`

### 🔧 Need to Set Up
- Google OAuth Client ID & Secret
- Vercel Account (free)
- Domain (optional)

---

## 🎯 Step 1: Database Setup

### Option A: Using Node.js (Recommended for Next.js)
```bash
# Install dependencies
npm install

# Run database setup
npm run setup:db
```

### Option B: Using Python Script (Your existing setup)
```bash
# Install Python dependencies
pip install psycopg2-binary openai python-dotenv

# Run your Python setup
python setup_database.py
```

Both scripts will:
- ✅ Create all necessary tables
- ✅ Insert sample grant data
- ✅ Test OpenAI connection
- ✅ Verify database connection

---

## 🚀 Step 2: Local Testing

### 1. Environment Variables
Make sure `.env.local` has all credentials:
```env
# OpenAI (Replace with your actual key)
OPENAI_API_KEY=your-openai-api-key-here

# CockroachDB (Replace with your actual credentials)
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=verify-full

# Stripe (Replace with your actual key)
STRIPE_SECRET_KEY=your-stripe-secret-key-here

# Google OAuth (Need to add)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# App Config
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-random-secret-here
NODE_ENV=development
```

### 2. Run Development Server
```bash
# Start development server
npm run dev

# Open browser
http://localhost:3000
```

### 3. Test Features
- ✅ Check AI predictions (uses real OpenAI)
- ✅ View grants from database
- ✅ Test authentication flow
- ✅ Verify payment modal

---

## 🌐 Step 3: Deploy to Vercel

### Quick Deploy (5 minutes)
```bash
# Install Vercel CLI if needed
npm install -g vercel

# Deploy to production
npm run deploy
```

### Manual Deploy via Vercel Dashboard

1. **Push to GitHub** (if not already done)
```bash
git init
git add .
git commit -m "Initial deployment"
git remote add origin your-github-repo
git push -u origin main
```

2. **Import to Vercel**
- Go to [vercel.com](https://vercel.com)
- Click "New Project"
- Import your GitHub repository
- Auto-detected as Next.js project

3. **Configure Environment Variables in Vercel**
- Go to Project Settings → Environment Variables
- Add each variable from `.env.local`:
  - `OPENAI_API_KEY`
  - `DATABASE_URL`
  - `STRIPE_SECRET_KEY`
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `NEXTAUTH_URL` (set to your Vercel URL)
  - `NEXTAUTH_SECRET`

4. **Deploy**
- Click "Deploy"
- Wait 2-3 minutes
- Your app is live! 🎉

---

## 🔗 Step 4: Post-Deployment Setup

### 1. Update Production URLs
In Vercel Environment Variables:
```env
NEXTAUTH_URL=https://your-app.vercel.app
```

### 2. Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `https://your-app.vercel.app/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google` (for local dev)

### 3. Stripe Webhook (Optional for Pro features)
1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://your-app.vercel.app/api/webhooks/stripe`
3. Select events: `checkout.session.completed`, `customer.subscription.updated`
4. Copy webhook secret to Vercel env vars

---

## 📊 Step 5: Monitoring & Analytics

### Database Monitoring
Your Python script created these tables:
- **grants**: Grant opportunities (5 sample records)
- **applications**: User applications
- **analysis_history**: AI analysis tracking
- **users**: User accounts
- **predictions**: Success predictions
- **subscriptions**: Pro subscriptions

Check database status:
```sql
-- Connect to CockroachDB
-- Run these queries to monitor:
SELECT COUNT(*) FROM grants;
SELECT COUNT(*) FROM applications;
SELECT COUNT(*) FROM users;
```

### Vercel Analytics
1. Enable Vercel Analytics in dashboard
2. Monitor:
   - Page views
   - API response times
   - Error rates
   - User geography

### Cost Tracking
- **OpenAI**: Monitor usage at [platform.openai.com](https://platform.openai.com)
- **CockroachDB**: Free tier = 1GB storage, 10M requests/month
- **Vercel**: Free tier = unlimited deployments, 100GB bandwidth

---

## 🧪 Step 6: Testing Production

### Critical Tests
```bash
# 1. Test Homepage
curl https://your-app.vercel.app

# 2. Test API Health
curl https://your-app.vercel.app/api/v1/predictions

# 3. Test Grant Database
curl https://your-app.vercel.app/api/v1/grants
```

### Feature Testing Checklist
- [ ] AI Predictions work with real data
- [ ] Grants load from CockroachDB
- [ ] Google OAuth login works
- [ ] Payment modal displays correctly
- [ ] Mobile responsive design works
- [ ] Error handling for API failures

---

## 🚨 Troubleshooting

### Common Issues & Solutions

#### 1. Database Connection Error
```
Error: no pg_hba.conf entry for host
```
**Solution**: Make sure `sslmode=verify-full` in DATABASE_URL

#### 2. OpenAI API Error
```
Error: Insufficient quota
```
**Solution**: Check OpenAI credit balance

#### 3. Build Error on Vercel
```
Error: Cannot find module 'pg'
```
**Solution**: Already fixed - pg is in dependencies

#### 4. Environment Variables Not Working
**Solution**: Redeploy after adding env vars in Vercel

---

## 📈 Next Steps

### Immediate (Day 1)
1. ✅ Deploy to Vercel
2. ✅ Test all features
3. ✅ Share link for feedback

### Short Term (Week 1)
1. Add more grants to database
2. Implement file upload for proposals
3. Add user dashboard
4. Set up email notifications

### Long Term (Month 1)
1. Integrate real grants.gov API
2. Add machine learning model training
3. Implement advanced matching algorithms
4. Add team collaboration features

---

## 🎉 Success Metrics

Your app is successfully deployed when:
- ✅ Homepage loads with DoNotPay design
- ✅ AI predictions return real OpenAI responses
- ✅ Grants display from CockroachDB
- ✅ No console errors in browser
- ✅ Lighthouse score > 90

---

## 📞 Support Resources

- **Vercel Support**: [vercel.com/support](https://vercel.com/support)
- **CockroachDB Docs**: [cockroachlabs.com/docs](https://cockroachlabs.com/docs)
- **OpenAI Docs**: [platform.openai.com/docs](https://platform.openai.com/docs)
- **Next.js Docs**: [nextjs.org/docs](https://nextjs.org/docs)

---

## 🏁 Final Checklist

Before going live:
- [ ] All environment variables set in Vercel
- [ ] Database has sample data
- [ ] OpenAI API key has credits
- [ ] Test on mobile device
- [ ] Check all API endpoints
- [ ] Verify DoNotPay styling

**🚀 Ready to deploy? Run: `npm run deploy`**
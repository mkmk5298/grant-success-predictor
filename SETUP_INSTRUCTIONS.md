# Grant Predictor Setup Instructions

## ⚠️ IMPORTANT: Database Password Required

Before running the setup, you need to add your CockroachDB password.

### Step 1: Add Your CockroachDB Password

1. Open `.env.local` file
2. Find this line:
   ```
   DATABASE_URL=postgresql://mookun5298_gmail_com:YOUR_COCKROACHDB_PASSWORD_HERE@army-lioness-14471.j77.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full
   ```
3. Replace `YOUR_COCKROACHDB_PASSWORD_HERE` with your actual CockroachDB password
4. Save the file

### Step 2: Install Python Dependencies

```bash
pip install psycopg2-binary openai python-dotenv
```

Or use the requirements file:
```bash
pip install -r requirements.txt
```

### Step 3: Run Database Setup

```bash
python setup_database.py
```

This will:
- ✅ Test database connection
- ✅ Test OpenAI API connection
- ✅ Create all necessary tables
- ✅ Insert sample grant data
- ✅ Generate connection_info.txt

### Step 4: Start the Application

```bash
npm run dev
```

Then open http://localhost:3000 in your browser.

## Troubleshooting

### Database Connection Error
- Make sure you've added your CockroachDB password
- Password should not contain special characters that need escaping
- If password has special characters, URL-encode them

### OpenAI API Error
- Check that your API key has credits available
- Verify the key is correct in `.env.local`

### Python Package Installation Error
If `psycopg2-binary` fails to install, try:
```bash
python -m pip install psycopg2-binary
```

## Production Deployment

When deploying to Vercel:
1. Add all environment variables from `.env.local` to Vercel
2. Replace `YOUR_COCKROACHDB_PASSWORD_HERE` with actual password
3. Update `NEXTAUTH_URL` to your production URL
4. Generate a secure `NEXTAUTH_SECRET`

## Current Status

✅ **Configured:**
- OpenAI API Key
- Stripe Test Keys
- Database URL (needs password)

❌ **Need Configuration:**
- CockroachDB Password
- Google OAuth credentials
- NextAuth secret

## Support

If you encounter issues:
1. Check error messages in console
2. Verify all environment variables are set
3. Ensure Python 3.7+ and Node.js 18+ are installed
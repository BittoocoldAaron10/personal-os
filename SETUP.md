# Personal OS - Setup Guide

A complete, free Personal Operating System with AI-powered task management, habit tracking, journaling, nutrition logging, and more.

## What You're Getting

✅ Task Management (CRM) with AI auto-classification
✅ Habit Tracking
✅ Daily Journaling with voice input
✅ Nutrition Logging with AI calorie estimation
✅ Health & Activity Tracking
✅ Goals Management
✅ Calendar
✅ Voice Input throughout
✅ Beautiful dark UI

## Quick Setup (15 minutes)

### Step 1: Install Node.js (if not already installed)

Download and install from: https://nodejs.org (LTS version)

Verify installation:
```powershell
node --version
npm --version
```

### Step 2: Install Project Dependencies

Open PowerShell in this folder (`C:\Users\DELL\Downloads\OS`) and run:

```powershell
npm install
```

This will install all required packages (takes 2-3 minutes).

### Step 3: Set Up Supabase Database

1. Go to https://supabase.com/dashboard/project/zblznyukajltctbgzayr
2. Click on **SQL Editor** (left sidebar)
3. Click **+ New Query**
4. Open the file `supabase/schema.sql` in this project
5. Copy ALL the contents and paste into the SQL Editor
6. Click **Run** (or press Ctrl+Enter)
7. You should see "Success. No rows returned" - this means tables were created

### Step 4: Enable Google Gemini API Access

The API key is already configured in `.env.local`. To make sure Gemini works:

1. Go to https://aistudio.google.com/app/apikey
2. Sign in with the same Google account you used for Cloud
3. Click **Create API Key**
4. Select your project: `personal-os-496914`
5. Copy the new API key
6. Open `.env.local` in this folder
7. Add this line at the bottom:
   ```
   GOOGLE_GEMINI_API_KEY=your-api-key-here
   ```

### Step 5: Run the Application

In PowerShell, from this folder:

```powershell
npm run dev
```

You'll see something like:
```
ready - started server on 0.0.0.0:3000
```

Open your browser to: **http://localhost:3000**

### Step 6: Sign Up

1. Click "Sign up"
2. Enter your email and password
3. Check your email for confirmation (or skip if Supabase email confirmation is disabled)
4. Login!

## Disabling Email Confirmation (Recommended for Personal Use)

1. Go to your Supabase project
2. Click **Authentication** → **Providers** → **Email**
3. Turn OFF "Confirm email"
4. Save

Now you can sign up and login immediately without email confirmation.

## Daily Usage

### Adding Tasks (Voice)
1. Click the **mic button** anywhere
2. Speak your task: "I need to send the proposal to client X"
3. AI automatically categorizes it and adds to your CRM

### Tracking Habits
1. Go to **Habits**
2. Add your daily habits (workout, study, etc.)
3. Click to check off as you complete them

### Logging Meals
1. Go to **Nutrition**
2. Describe what you ate
3. AI estimates calories, protein, carbs, fat
4. View daily totals

### Journaling
1. Go to **Journaling**
2. Write or speak your reflection
3. Saved automatically
4. Review past entries anytime

### Setting Goals
1. Go to **Goals**
2. Add weekly, monthly, or yearly goals
3. Mark complete as you achieve them

## Deploying to Vercel (Optional - To Access From Anywhere)

1. Push your code to GitHub:
   ```powershell
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/BittoocoldAaron10/personal-os.git
   git push -u origin main
   ```

2. Go to https://vercel.com
3. Click **Add New Project**
4. Import your GitHub repo
5. Add environment variables from `.env.local`
6. Deploy!

## Troubleshooting

### "Cannot find module" errors
```powershell
rm -rf node_modules
npm install
```

### Supabase connection issues
- Make sure you ran the SQL schema in Supabase
- Check that `.env.local` has correct URL and keys

### AI features not working
- Verify the Gemini API key is set
- Check console for error messages
- Free tier limits: 1,500 requests/day

### Voice input not working
- Only works in Chrome/Edge browsers
- Allow microphone permissions
- Use HTTPS in production (Vercel provides this automatically)

## Project Structure

```
OS/
├── pages/
│   ├── dashboard.tsx    # Main dashboard
│   ├── crm.tsx          # Task management
│   ├── habits.tsx       # Habit tracking
│   ├── nutrition.tsx    # Nutrition logging
│   ├── journaling.tsx   # Journal entries
│   ├── health.tsx       # Health metrics
│   ├── goals.tsx        # Goals
│   ├── calendar.tsx     # Calendar
│   ├── auth/            # Login/signup
│   └── api/             # Backend API routes
├── components/
│   ├── Sidebar.tsx
│   └── VoiceInputButton.tsx
├── lib/
│   ├── supabase.ts      # Supabase client
│   ├── types.ts         # TypeScript types
│   └── ai/              # AI integration
├── styles/
│   └── globals.css
├── supabase/
│   └── schema.sql       # Database schema
└── .env.local           # Environment variables
```

## What's Free vs Paid

✅ **All features in this app are 100% free**
- Supabase: 500MB database + 50K monthly active users
- Vercel: 100GB bandwidth/month
- Google Gemini API: 1,500 requests/day
- Web Speech API: Browser-based, unlimited

The only thing you'd pay for is if you exceed these limits (unlikely for personal use).

## Need Help?

If something doesn't work:
1. Check the browser console (F12) for errors
2. Check the terminal where `npm run dev` is running
3. Make sure all setup steps were completed
4. Verify your API keys in `.env.local`

Enjoy your new Personal OS! 🚀

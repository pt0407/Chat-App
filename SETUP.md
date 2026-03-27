# Supabase Setup Guide for Global Leaderboard

## Step 1: Create a Supabase Project

1. Go to [Supabase](https://supabase.com/)
2. Click "Start your project" or "New Project"
3. Sign in with GitHub (or create an account)
4. Create a new organization if you don't have one
5. Click "New Project"
6. Enter project details:
   - **Name**: culture-quiz (or any name you like)
   - **Database Password**: Create a strong password (save it somewhere safe)
   - **Region**: Choose closest to your users
7. Click "Create new project" (takes ~2 minutes to set up)

## Step 2: Create the Leaderboard Table

1. In your Supabase project dashboard, click on **"Table Editor"** in the left sidebar
2. Click **"Create a new table"**
3. Configure the table:
   - **Name**: `leaderboard`
   - **Enable Row Level Security (RLS)**: Turn it OFF for now (we'll enable public access)
4. Add the following columns (click "+ Add column" for each):

   | Column Name | Type | Default Value | Extra Settings |
   |------------|------|---------------|----------------|
   | id | int8 | Auto-generated | Primary, Auto-increment |
   | name | text | - | - |
   | score | int4 | - | - |
   | total | int4 | - | - |
   | time | int4 | - | - |
   | accuracy | int4 | - | - |
   | timestamp | timestamptz | now() | - |

5. Click **"Save"** to create the table

## Step 3: Configure Table Permissions

1. Click on **"Authentication"** in the left sidebar
2. Click on **"Policies"** 
3. Find your `leaderboard` table
4. Click **"New Policy"**
5. Choose **"Create a policy from scratch"**
6. Configure:
   - **Policy name**: "Enable read access for all users"
   - **Allowed operation**: SELECT
   - **Target roles**: `anon`, `authenticated`
   - **USING expression**: `true`
7. Click **"Review"** then **"Save policy"**
8. Create another policy:
   - **Policy name**: "Enable insert access for all users"
   - **Allowed operation**: INSERT
   - **Target roles**: `anon`, `authenticated`
   - **WITH CHECK expression**: `true`
9. Click **"Review"** then **"Save policy"**

## Step 4: Get Your Supabase Configuration

1. In your Supabase dashboard, click on **"Settings"** (gear icon) in the left sidebar
2. Click on **"API"**
3. You'll see two important values:
   - **Project URL** (e.g., `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")
4. Copy both values

## Step 5: Update supabase-config.js

1. Open `supabase-config.js` in your project
2. Replace the placeholder values:

```javascript
const supabaseUrl = 'https://xxxxxxxxxxxxx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

## Step 6: Test Your Quiz

1. Open `index.html` in your browser
2. Complete the quiz
3. Submit your score with a name
4. Check if it appears on the leaderboard
5. Open the quiz on a different browser/computer and verify the same leaderboard appears
6. You can also check your Supabase Table Editor to see the scores being saved

## Troubleshooting

- **"Supabase not configured" error**: Make sure you've updated `supabase-config.js` with your actual URL and key
- **Scores not saving**: 
  - Check the browser console for errors
  - Verify your table policies allow INSERT operations
  - Make sure all column names match exactly
- **Leaderboard not loading**: 
  - Check that policies allow SELECT operations
  - Verify the table name is exactly `leaderboard`
- **CORS errors**: Supabase handles CORS automatically, but if you have issues, make sure you're using the correct Project URL

## Running with a Local Server (Optional)

You can open `index.html` directly in your browser, but for best results use a local server:

```bash
# Using Python 3
python3 -m http.server 8000

# Using Node.js (if you have http-server installed)
npx http-server

# Using PHP
php -S localhost:8000
```

Then access your quiz at `http://localhost:8000`

## What Changed

✅ **Global Leaderboard**: Scores now sync across all devices worldwide using Supabase
✅ **PostgreSQL Database**: Powerful relational database with real-time capabilities
✅ **Persistent Storage**: Scores stored in Supabase cloud database
✅ **No Local Storage**: Replaced browser localStorage with Supabase database
✅ **Easy to Scale**: Supabase free tier includes 500MB database and 2GB bandwidth

## Why Supabase?

- **Free tier**: Generous free tier perfect for this project
- **PostgreSQL**: Industry-standard database
- **Real-time**: Built-in real-time subscriptions (can be added later)
- **Easy setup**: Simpler than Firebase for this use case
- **Row Level Security**: Built-in security policies
- **Auto-generated API**: No backend code needed

## Next Steps (Optional)

- Enable Row Level Security (RLS) for better security
- Add Supabase Authentication to prevent spam
- Implement rate limiting on the database level
- Add real-time subscriptions to auto-update leaderboard
- Deploy to Vercel, Netlify, or Supabase hosting for free

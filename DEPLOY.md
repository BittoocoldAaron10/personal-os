# Deploy to Vercel & Set Up as Firefox Homepage

This guide makes your Personal OS:
1. Accessible from anywhere via a URL (like `personal-os.vercel.app`)
2. Auto-open when Firefox starts
3. Pinned so it's harder to close accidentally

---

## Part 1: Push Code to GitHub (5 min)

### Option A: Using GitHub Desktop (Easiest)
1. Download [GitHub Desktop](https://desktop.github.com/)
2. Sign in with your GitHub account (BittoocoldAaron10)
3. File → Add Local Repository → Select `C:\Users\DELL\Downloads\OS`
4. Publish to GitHub → Select your `personal-os` repo
5. Done!

### Option B: Using PowerShell
Open PowerShell in `C:\Users\DELL\Downloads\OS\` and run:

```powershell
git init
git add .
git commit -m "Initial commit - Personal OS"
git branch -M main
git remote add origin https://github.com/BittoocoldAaron10/personal-os.git
git push -u origin main
```

If asked to login, use your GitHub credentials.

**Note**: `.env.local` is in `.gitignore` so your API keys will NOT be uploaded (this is correct - we'll add them to Vercel separately).

---

## Part 2: Deploy to Vercel (5 min)

1. Go to [vercel.com](https://vercel.com)
2. Click **Sign Up** → Continue with GitHub
3. Authorize Vercel to access your GitHub
4. Click **Add New...** → **Project**
5. Find `personal-os` in the list → Click **Import**
6. Configure Project screen:
   - Framework Preset: **Next.js** (auto-detected)
   - Root Directory: `./`
   - Build Command: `npm run build` (default)
   - **DON'T DEPLOY YET** - we need to add env vars first

7. Expand **Environment Variables** section and add ALL these:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | (your Supabase project URL) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (your Supabase anon key) |
| `SUPABASE_SERVICE_KEY` | (your Supabase service role key) |
| `GOOGLE_GEMINI_API_KEY` | (your Gemini key from aistudio.google.com) |
| `NEXT_PUBLIC_USER_NAME` | `Aaron` |
| `NEXT_PUBLIC_APP_NAME` | `Personal OS` |

8. Click **Deploy**
9. Wait 2-3 minutes for deployment
10. You'll get a URL like: `https://personal-os-aaron.vercel.app`

**SAVE THIS URL** - this is your Personal OS!

---

## Part 3: Set Up as Firefox Homepage (2 min)

1. Open Firefox
2. Click the menu (☰ in top right) → **Settings**
3. Click **Home** in the left sidebar
4. Under **New Windows and Tabs**:
   - Homepage and new windows: **Custom URLs**
   - Paste your Vercel URL: `https://personal-os-aaron.vercel.app`
5. Under **Startup**:
   - Click **General** in the sidebar
   - Find **Startup**
   - Check ☑️ **Open previous windows and tabs**

This makes Firefox:
- Show your Personal OS as the homepage
- Open it automatically when Firefox starts

---

## Part 4: Pin the Tab (1 min)

This makes the tab small, sticky to the left, and shows a confirmation if you try to close it.

1. Open your Personal OS in Firefox
2. **Right-click** on the tab
3. Click **Pin Tab**

That's it! The tab is now:
- ⭐ Always at the leftmost position
- 📏 Smaller (just shows the favicon)
- ⚠️ Asks for confirmation before closing
- 🔄 Persists across Firefox restarts

---

## Part 5: (Optional) Make It Even More Persistent

### Auto-launch Firefox at Windows startup
1. Press `Win + R` → type `shell:startup` → Enter
2. This opens the Windows startup folder
3. Drag your Firefox shortcut into this folder
4. Now Firefox opens automatically when Windows starts
5. With Personal OS as homepage + pinned tab, it'll always be there

### Make Firefox restore tabs even after crash
1. Type `about:config` in Firefox URL bar
2. Search for `browser.sessionstore.resume_from_crash`
3. Make sure it's set to `true`

### Prevent accidental tab close (Firefox setting)
1. Type `about:config` in Firefox URL bar
2. Search for `browser.tabs.warnOnClose`
3. Set to `true`

---

## Daily Workflow

1. Start your computer
2. Firefox auto-opens
3. Personal OS is right there (pinned tab)
4. Use voice input, log tasks, track habits, etc.
5. Tab stays open forever (across restarts)

---

## Troubleshooting

### Deploy failed on Vercel
- Check the build logs - usually a missing env var
- Verify all 6 environment variables are set
- Make sure GitHub repo has all files

### "Cannot connect to Supabase" after deploy
- Double-check `NEXT_PUBLIC_SUPABASE_URL` is exactly correct (no trailing slash)
- Verify you ran the SQL schema in Supabase

### Page shows but features don't work
- Check browser console (F12) for errors
- Most common: missing environment variables in Vercel
- Go to Vercel dashboard → Settings → Environment Variables → Verify all 6 are set
- After adding/changing env vars, click **Redeploy**

### Voice input doesn't work
- Voice input requires HTTPS (Vercel provides this automatically)
- Allow microphone permissions when prompted
- Works in Firefox, Chrome, Edge

---

## Adding a Custom Domain (Optional, Free)

Want `aaron-os.com` instead of `personal-os-aaron.vercel.app`?

1. Buy a domain from [Namecheap](https://namecheap.com) (~$10/year)
2. In Vercel → Project → Settings → Domains
3. Add your domain
4. Follow DNS setup instructions
5. Use that domain as your Firefox homepage instead

---

## Updating Your OS

Whenever you want to update features:

1. Edit code locally
2. In PowerShell: `git add . && git commit -m "Update" && git push`
3. Vercel auto-deploys in 2 minutes
4. Refresh your browser - new version is live!

---

🚀 Enjoy your always-on Personal OS!

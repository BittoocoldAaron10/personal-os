# Google Calendar Sync — Setup

Two-way sync between your Personal OS calendar and Google Calendar. Add an
event in either place and it shows up in the other.

## How it connects

The app uses a Google **service account** — a robot Google account that acts
on your behalf. You share your calendar with it once, and it can then read and
write events. No login pop-ups, no tokens that expire, no yearly re-auth.

## What's already done

Your project was scaffolded with a working service account, and verification
confirms:

- ✅ Service account exists: `personal-os-bot@personal-os-496914.iam.gserviceaccount.com`
- ✅ Credentials in `.env.local` are valid
- ✅ Google Calendar API is enabled

You only need the **3 steps** below.

---

## Step 1 — Run the database migration

The sync needs two new things in your database: a `calendar_sync` table and a
couple of extra columns on `calendar_events`.

1. Open your Supabase project → **SQL Editor**
2. Open the file `supabase/google-calendar-migration.sql` from this repo
3. Copy its contents into the editor and click **Run**

It is safe to run more than once.

## Step 2 — Share your Google Calendar with the service account

This is the one manual step that grants the app access.

1. On a computer, open **[calendar.google.com](https://calendar.google.com)**
2. In the left sidebar, find **My calendars**, hover your calendar, click the
   **⋮** menu → **Settings and sharing**
3. Scroll to **Share with specific people or groups** → **Add people and groups**
4. Paste this address:

   ```
   personal-os-bot@personal-os-496914.iam.gserviceaccount.com
   ```

5. Set **Permissions** to **"Make changes to events"**
6. Click **Send**

> The service account won't get an email — that's normal.

## Step 3 — Connect inside the app

1. Open your Personal OS → **Dashboard**
2. In the **Calendar** card, click **Connect Google Calendar** at the bottom
3. Enter your Google account email — the address of the calendar you just
   shared (usually `you@gmail.com`)
4. Click the ✓

The app verifies access and runs a first sync. Done — your calendars are linked.

---

## How sync works

- **Add an event in the OS** → it's pushed to Google Calendar right away.
- **Delete an event in the OS** → it's removed from Google Calendar.
- **Add / edit / delete in Google Calendar** → it appears in the OS on the next
  sync.
- **Sync runs automatically** when the dashboard loads. You can also force it
  with the ↻ button in the Calendar card header.
- **Conflicts** (the same event changed in both places): the **most recent
  change wins**.
- **Sync window:** events from 120 days ago to 365 days ahead. Older or further
  events are left alone on both sides.
- A small 🔗 icon next to an event means it's linked to Google Calendar.

## Troubleshooting

**"Calendar not found, or it has not been shared…"**
The address in Step 3 doesn't match a calendar that's been shared with the
service account. Recheck Step 2, and make sure you entered the right email in
Step 3.

**"The service account does not have permission…"**
The calendar was shared, but not with **"Make changes to events"**. Re-open the
sharing settings and raise the permission level.

**"Google sync unavailable" shown in the card**
`GOOGLE_CLIENT_EMAIL` / `GOOGLE_PRIVATE_KEY` are missing from the environment.
They're already in `.env.local`; if you deployed to Vercel, add them there too
(Project → Settings → Environment Variables) and redeploy.

**Nothing happens / events don't appear**
Make sure Step 1 (the migration) actually ran — without the `calendar_sync`
table the connection can't be saved.

## Deploying to Vercel

If this app runs on Vercel, copy these environment variables into
**Project → Settings → Environment Variables**, then redeploy:

- `GOOGLE_CLIENT_EMAIL`
- `GOOGLE_PRIVATE_KEY` (paste the full value including the `\n` sequences)
- `SUPABASE_SERVICE_KEY` (already needed by the app)

-- Google Calendar Sync — Migration
-- Run this in the Supabase SQL Editor AFTER the original schema.sql.
-- Safe to run more than once (uses IF NOT EXISTS / IF EXISTS guards).

-- 1. Link OS events to their Google Calendar counterpart + track last change.
ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS google_event_id TEXT;

ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Fast lookups when reconciling events during a sync.
CREATE INDEX IF NOT EXISTS calendar_events_google_event_id_idx
  ON calendar_events (user_id, google_event_id);

-- 2. Per-user Google Calendar connection settings.
CREATE TABLE IF NOT EXISTS calendar_sync (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  google_calendar_id TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  enabled BOOLEAN DEFAULT TRUE,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Row Level Security: users only see their own sync settings.
ALTER TABLE calendar_sync ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own sync" ON calendar_sync;
DROP POLICY IF EXISTS "Users can insert own sync" ON calendar_sync;
DROP POLICY IF EXISTS "Users can update own sync" ON calendar_sync;
DROP POLICY IF EXISTS "Users can delete own sync" ON calendar_sync;

CREATE POLICY "Users can view own sync" ON calendar_sync
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sync" ON calendar_sync
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sync" ON calendar_sync
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sync" ON calendar_sync
  FOR DELETE USING (auth.uid() = user_id);

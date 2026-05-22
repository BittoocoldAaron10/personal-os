-- Motivation System Migration: XP, Game Time Bank, Blocklist
-- Run this entire script in Supabase SQL Editor. Safe to run multiple times.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. calendar_events: completion tracking + difficulty tier
ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS completed_dates TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'quick';

-- difficulty must be 'quick' (15 EXP) or 'main' (50 EXP)
ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_difficulty_check;
ALTER TABLE calendar_events
  ADD CONSTRAINT calendar_events_difficulty_check CHECK (difficulty IN ('quick', 'main'));

CREATE INDEX IF NOT EXISTS calendar_events_completed_at_idx
  ON calendar_events (user_id, completed_at DESC);

-- 2. user_xp_stats: one row per user, tracks total XP earned + minutes redeemed
CREATE TABLE IF NOT EXISTS user_xp_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_xp INT NOT NULL DEFAULT 0,
  minutes_redeemed INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE user_xp_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "xp own select" ON user_xp_stats;
DROP POLICY IF EXISTS "xp own insert" ON user_xp_stats;
DROP POLICY IF EXISTS "xp own update" ON user_xp_stats;
CREATE POLICY "xp own select" ON user_xp_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "xp own insert" ON user_xp_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "xp own update" ON user_xp_stats FOR UPDATE USING (auth.uid() = user_id);

-- 3. blocklist: apps + websites the desktop blocker enforces (per user)
CREATE TABLE IF NOT EXISTS blocklist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('app', 'site')),
  value TEXT NOT NULL,
  label TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE blocklist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "blocklist own select" ON blocklist;
DROP POLICY IF EXISTS "blocklist own insert" ON blocklist;
DROP POLICY IF EXISTS "blocklist own update" ON blocklist;
DROP POLICY IF EXISTS "blocklist own delete" ON blocklist;
CREATE POLICY "blocklist own select" ON blocklist FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "blocklist own insert" ON blocklist FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "blocklist own update" ON blocklist FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "blocklist own delete" ON blocklist FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS blocklist_user_idx ON blocklist (user_id);

-- 4. game_sessions: a redeemed block of game time (start -> end)
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  minutes INT NOT NULL DEFAULT 30,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sessions own select" ON game_sessions;
DROP POLICY IF EXISTS "sessions own insert" ON game_sessions;
DROP POLICY IF EXISTS "sessions own update" ON game_sessions;
DROP POLICY IF EXISTS "sessions own delete" ON game_sessions;
CREATE POLICY "sessions own select" ON game_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sessions own insert" ON game_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sessions own update" ON game_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "sessions own delete" ON game_sessions FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS game_sessions_user_ends_idx ON game_sessions (user_id, ends_at DESC);

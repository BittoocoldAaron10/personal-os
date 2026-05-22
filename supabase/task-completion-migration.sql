-- Task Completion Tracking for Calendar Events
-- Adds completion status and dates for streak tracking

-- Add completion fields to calendar_events if they don't exist
ALTER TABLE calendar_events
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS completed_dates TEXT[] DEFAULT '{}';

-- Create index for completed_at queries
CREATE INDEX IF NOT EXISTS calendar_events_completed_at_idx
  ON calendar_events (user_id, completed_at DESC);

-- Safe to run multiple times

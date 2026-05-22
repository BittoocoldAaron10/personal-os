export const TASK_CATEGORIES = ['Work', 'Studies', 'Workout', 'Health', 'Hobbies', 'Personal'] as const

export interface Task {
  id: string
  user_id: string
  title: string
  description?: string
  category: string
  priority: 'high' | 'medium' | 'low'
  status: 'todo' | 'in_progress' | 'done'
  created_at: string
  due_date?: string | null
  is_key: boolean
}

export interface Habit {
  id: string
  user_id: string
  name: string
  frequency: string
  completed_today: boolean
  streak_count?: number
  completed_dates?: string[]
  created_at: string
}

export interface JournalEntry {
  id: string
  user_id: string
  content: string
  date: string
  summary?: string
  created_at: string
}

export interface NutritionLog {
  id: string
  user_id: string
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  description: string
  calories: number
  protein?: number
  carbs?: number
  fat?: number
  date: string
  created_at: string
}

export interface HealthMetric {
  id: string
  user_id: string
  metric_name: string
  value: number
  unit: string
  date: string
  created_at: string
}

export interface Goal {
  id: string
  user_id: string
  title: string
  description?: string
  timeframe: 'weekly' | 'monthly' | 'yearly'
  status: 'active' | 'completed'
  created_at: string
}

export interface CalendarEvent {
  id: string
  user_id: string
  title: string
  description?: string
  start_time: string
  end_time: string
  google_event_id?: string | null
  updated_at?: string
  completed_at?: string | null
  completed_dates?: string[]
  difficulty?: 'quick' | 'main'
  created_at: string
}

export interface UserXPStats {
  user_id: string
  total_xp: number
  minutes_redeemed: number
  updated_at: string
}

export interface BlocklistItem {
  id: string
  user_id: string
  kind: 'app' | 'site'
  value: string
  label?: string | null
  created_at: string
}

export interface GameSession {
  id: string
  user_id: string
  minutes: number
  started_at: string
  ends_at: string
  created_at: string
}

export interface CalendarSync {
  user_id: string
  google_calendar_id: string
  timezone: string
  enabled: boolean
  last_synced_at?: string | null
  created_at: string
}

export interface Memory {
  id: string
  user_id: string
  key: string
  value: string
  created_at: string
}

export type CaptureType = 'task' | 'meal' | 'journal' | 'event' | 'goal'

export interface OperatorProfile {
  name: string
  role: string
  city: string
  focus: string
}

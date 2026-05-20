export interface User {
  id: string
  email: string
  name: string
  created_at: string
}

export interface Task {
  id: string
  user_id: string
  title: string
  description?: string
  category: string
  priority: 'high' | 'medium' | 'low'
  status: 'todo' | 'in_progress' | 'done'
  created_at: string
  due_date?: string
  is_key: boolean
}

export interface Habit {
  id: string
  user_id: string
  name: string
  frequency: string
  completed_today: boolean
  created_at: string
  subtasks?: HabitSubtask[]
}

export interface HabitSubtask {
  id: string
  habit_id: string
  name: string
  completed: boolean
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

export interface Memory {
  id: string
  user_id: string
  key: string
  value: string
  created_at: string
}

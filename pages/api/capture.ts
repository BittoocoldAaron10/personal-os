import type { NextApiRequest, NextApiResponse } from 'next'
import { smartCapture } from '@/lib/ai/gemini'
import { supabaseServer } from '@/lib/supabase'
import { TASK_CATEGORIES } from '@/lib/types'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { text, userId } = req.body
    const today: string = req.body.today || new Date().toISOString().split('T')[0]

    if (!text || !userId) {
      return res.status(400).json({ error: 'Missing text or userId' })
    }

    const raw = String(text).trim()
    const result = await smartCapture(raw, TASK_CATEGORIES as unknown as string[])
    const supabase = supabaseServer()
    const type = result?.type || 'task'
    const title = (result?.title || raw).toString().slice(0, 240)

    const fail = (error: any) => {
      console.error('capture insert error:', error)
      return res.status(500).json({ error: error?.message || 'Database insert failed' })
    }

    if (type === 'meal') {
      const m = result.meal || {}
      const { error } = await supabase.from('nutrition_logs').insert([{
        user_id: userId,
        meal_type: ['breakfast', 'lunch', 'dinner', 'snack'].includes(m.meal_type) ? m.meal_type : 'snack',
        description: title,
        calories: Math.round(Number(m.calories) || 0),
        protein: Math.round(Number(m.protein) || 0),
        carbs: Math.round(Number(m.carbs) || 0),
        fat: Math.round(Number(m.fat) || 0),
        date: today,
      }])
      if (error) return fail(error)
      return res.status(200).json({ type, label: 'Nutrition', title })
    }

    if (type === 'journal') {
      const content = (result.journal && result.journal.content) || raw
      const { error } = await supabase.from('journal_entries').insert([{
        user_id: userId,
        content,
        date: today,
        summary: content.length > 120 ? content.slice(0, 120) + '…' : content,
      }])
      if (error) return fail(error)
      return res.status(200).json({ type, label: 'Journal', title })
    }

    if (type === 'event') {
      const ev = result.event || {}
      const date = /^\d{4}-\d{2}-\d{2}$/.test(ev.date) ? ev.date : today
      const time = /^\d{2}:\d{2}$/.test(ev.time) ? ev.time : '09:00'
      const startHour = parseInt(time.split(':')[0], 10)
      const endHour = String(Math.min(23, startHour + 1)).padStart(2, '0')
      const { error } = await supabase.from('calendar_events').insert([{
        user_id: userId,
        title,
        start_time: `${date}T${time}:00`,
        end_time: `${date}T${endHour}:${time.split(':')[1]}:00`,
      }])
      if (error) return fail(error)
      return res.status(200).json({ type, label: 'Calendar', title })
    }

    if (type === 'goal') {
      const g = result.goal || {}
      const { error } = await supabase.from('goals').insert([{
        user_id: userId,
        title,
        timeframe: ['weekly', 'monthly', 'yearly'].includes(g.timeframe) ? g.timeframe : 'weekly',
        status: 'active',
      }])
      if (error) return fail(error)
      return res.status(200).json({ type, label: 'Goals', title })
    }

    // Default: task
    const t = result.task || {}
    const { error } = await supabase.from('tasks').insert([{
      user_id: userId,
      title,
      description: '',
      category: (TASK_CATEGORIES as unknown as string[]).includes(t.category) ? t.category : 'Personal',
      priority: ['high', 'medium', 'low'].includes(t.priority) ? t.priority : 'medium',
      status: 'todo',
      is_key: !!t.is_key,
    }])
    if (error) return fail(error)
    return res.status(200).json({ type: 'task', label: 'Tasks', title })
  } catch (error: any) {
    console.error('capture error:', error?.message || error)
    return res.status(500).json({ error: 'Capture failed' })
  }
}

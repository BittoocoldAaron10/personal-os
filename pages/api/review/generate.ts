import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseServer } from '@/lib/supabase'
import { generateWeeklyReview } from '@/lib/ai/gemini'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId, weekStart, weekEnd } = req.body
    if (!userId || !weekStart || !weekEnd) {
      return res.status(400).json({ error: 'Missing userId or week range' })
    }

    const db = supabaseServer()
    const [tasksR, habitsR, journalR, goalsR] = await Promise.all([
      db.from('tasks').select('title, status, priority, is_key, created_at').eq('user_id', userId),
      db.from('habits').select('name, completed_dates').eq('user_id', userId),
      db
        .from('journal_entries')
        .select('content, date, summary')
        .eq('user_id', userId)
        .gte('date', weekStart)
        .lte('date', weekEnd),
      db.from('goals').select('title, timeframe, status').eq('user_id', userId),
    ])

    const tasks = tasksR.data || []
    const done = tasks.filter((t: any) => t.status === 'done')
    const open = tasks.filter((t: any) => t.status !== 'done')
    const createdThisWeek = tasks.filter((t: any) => {
      const d = (t.created_at || '').slice(0, 10)
      return d >= weekStart && d <= weekEnd
    })

    const habitLines = (habitsR.data || []).map((h: any) => {
      const inWeek = (h.completed_dates || []).filter((d: string) => d >= weekStart && d <= weekEnd).length
      return `- ${h.name}: ${inWeek}/7 days`
    })

    const journals = (journalR.data || []).filter((j: any) => j.summary !== 'WEEKLY_REVIEW')
    const goals = goalsR.data || []

    const context = [
      `Week reviewed: ${weekStart} to ${weekEnd}`,
      '',
      `TASKS: ${done.length} completed total, ${open.length} still open, ${createdThisWeek.length} created this week.`,
      `Open key tasks: ${open.filter((t: any) => t.is_key).map((t: any) => t.title).join('; ') || 'none'}`,
      '',
      'HABITS this week:',
      ...(habitLines.length ? habitLines : ['- none tracked']),
      '',
      `GOALS: ${
        goals
          .filter((g: any) => g.status === 'active')
          .map((g: any) => `${g.title} (${g.timeframe})`)
          .join('; ') || 'none'
      }`,
      '',
      'JOURNAL ENTRIES this week:',
      ...(journals.length
        ? journals.map((j: any) => `- ${j.date}: ${(j.content || '').slice(0, 280)}`)
        : ['- none written']),
    ].join('\n')

    const review = await generateWeeklyReview(context)
    if (!review) {
      return res.status(500).json({ error: 'AI generation failed' })
    }
    return res.status(200).json(review)
  } catch (error: any) {
    console.error('review generate error:', error?.message || error)
    return res.status(500).json({ error: 'Review generation failed' })
  }
}

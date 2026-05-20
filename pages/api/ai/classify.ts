import type { NextApiRequest, NextApiResponse } from 'next'
import { classifyTask } from '@/lib/ai/gemini'
import { supabaseServer } from '@/lib/supabase'

const categories = ['Workout', 'Studies', 'Hobbies', 'Work', 'Personal', 'Health', 'Finance']

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { text, userId } = req.body

    if (!text || !userId) {
      return res.status(400).json({ error: 'Missing text or userId' })
    }

    // Classify using Gemini
    const classified = await classifyTask(text, categories)

    // Save to database
    const supabase = supabaseServer()
    const { data, error } = await supabase
      .from('tasks')
      .insert([
        {
          user_id: userId,
          title: classified.title || text,
          description: classified.description || '',
          category: classified.category || 'Personal',
          priority: classified.priority || 'medium',
          status: 'todo',
          is_key: false,
        },
      ])
      .select()

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({ success: true, task: data[0] })
  } catch (error) {
    console.error('Classification error:', error)
    return res.status(500).json({ error: 'Failed to classify task' })
  }
}

import type { NextApiRequest, NextApiResponse } from 'next'
import { estimateCalories } from '@/lib/ai/gemini'
import { supabaseServer } from '@/lib/supabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { mealDescription, mealType, userId } = req.body

    if (!mealDescription || !userId) {
      return res.status(400).json({ error: 'Missing meal description or userId' })
    }

    // Estimate calories using Gemini
    const estimation = await estimateCalories(mealDescription)

    // Save to database
    const supabase = supabaseServer()
    const { data, error } = await supabase
      .from('nutrition_logs')
      .insert([
        {
          user_id: userId,
          meal_type: mealType || 'snack',
          description: mealDescription,
          calories: estimation.calories || 0,
          protein: estimation.protein_grams || 0,
          carbs: estimation.carbs_grams || 0,
          fat: estimation.fat_grams || 0,
          date: new Date().toISOString().split('T')[0],
        },
      ])
      .select()

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({ success: true, nutrition: data[0] })
  } catch (error) {
    console.error('Calorie estimation error:', error)
    return res.status(500).json({ error: 'Failed to estimate calories' })
  }
}

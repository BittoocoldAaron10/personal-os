import axios from 'axios'

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent'

interface GeminiRequest {
  contents: {
    parts: {
      text: string
    }[]
  }[]
}

interface GeminiResponse {
  candidates: {
    content: {
      parts: {
        text: string
      }[]
    }
  }[]
}

export async function callGemini(prompt: string): Promise<string> {
  try {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('GOOGLE_GEMINI_API_KEY not configured. Get one from https://aistudio.google.com/app/apikey')
    }

    const request: GeminiRequest = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
    }

    const response = await axios.post<GeminiResponse>(GEMINI_API_URL, request, {
      params: {
        key: apiKey,
      },
      timeout: 30000,
    })

    if (!response.data.candidates || response.data.candidates.length === 0) {
      throw new Error('No response from Gemini API')
    }

    const text = response.data.candidates[0].content.parts[0].text
    return text
  } catch (error) {
    console.error('Gemini API error:', error)
    throw error
  }
}

export async function classifyTask(taskText: string, categories: string[]): Promise<any> {
  const prompt = `
You are a task classification AI. Given a task description, classify it into one of the following categories and assign a priority level.

Categories: ${categories.join(', ')}
Priority levels: high, medium, low

Task: "${taskText}"

Respond ONLY in valid JSON format (no markdown, no extra text):
{
  "title": "short task title",
  "category": "one of the categories",
  "priority": "high/medium/low",
  "description": "optional description"
}
`

  try {
    const response = await callGemini(prompt)
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Invalid JSON in response')
    return JSON.parse(jsonMatch[0])
  } catch (error) {
    console.error('Classification error:', error)
    return {
      title: taskText,
      category: 'Personal',
      priority: 'medium',
      description: '',
    }
  }
}

export async function estimateCalories(mealDescription: string): Promise<any> {
  const prompt = `
You are a nutrition expert. Estimate the nutritional content of this meal based on the description.

Meal description: "${mealDescription}"

Respond ONLY in valid JSON format (no markdown, no extra text):
{
  "calories": number,
  "protein_grams": number,
  "carbs_grams": number,
  "fat_grams": number,
  "confidence": "high/medium/low"
}
`

  try {
    const response = await callGemini(prompt)
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Invalid JSON in response')
    return JSON.parse(jsonMatch[0])
  } catch (error) {
    console.error('Calorie estimation error:', error)
    return {
      calories: 0,
      protein_grams: 0,
      carbs_grams: 0,
      fat_grams: 0,
      confidence: 'low',
    }
  }
}

export async function generateRecommendations(journalEntries: string[], taskSummary: string): Promise<any> {
  const prompt = `
You are a personal coach. Based on the user's recent journal entries and task data, provide 3-5 key recommendations.

Recent Journal Entries:
${journalEntries.slice(-5).join('\n---\n')}

Task Summary:
${taskSummary}

Respond ONLY in valid JSON format (no markdown, no extra text):
{
  "recommendations": [
    {
      "area": "area of life",
      "recommendation": "specific, actionable recommendation",
      "priority": "high/medium/low"
    }
  ]
}
`

  try {
    const response = await callGemini(prompt)
    const jsonMatch = response.match(/\{[\s\S]*\}/s)
    if (!jsonMatch) throw new Error('Invalid JSON in response')
    return JSON.parse(jsonMatch[0])
  } catch (error) {
    console.error('Recommendation error:', error)
    return { recommendations: [] }
  }
}

import axios from 'axios'

// Model is configurable via env so it can be swapped without a code redeploy.
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash'
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

export async function callGemini(prompt: string, jsonMode = false): Promise<string> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GOOGLE_GEMINI_API_KEY not configured. Get one from https://aistudio.google.com/app/apikey')
  }

  const request: any = {
    contents: [{ parts: [{ text: prompt }] }],
  }
  if (jsonMode) {
    request.generationConfig = { responseMimeType: 'application/json', temperature: 0.4 }
  }

  const response = await axios.post(GEMINI_API_URL, request, {
    params: { key: apiKey },
    timeout: 30000,
  })

  const text = response?.data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('No response from Gemini API')
  return text
}

function parseJson(text: string): any {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON object found in response')
  return JSON.parse(match[0])
}

// Classify a free-text task into a category + priority.
export async function classifyTask(taskText: string, categories: string[]): Promise<any> {
  const prompt = `You classify tasks for a personal productivity OS.
Categories: ${categories.join(', ')}
Priority: high, medium, low

Task: "${taskText}"

Respond ONLY with JSON:
{ "title": "short clean title", "category": "one category", "priority": "high|medium|low", "is_key": true|false }
is_key is true only for clearly high-impact tasks.`

  try {
    return parseJson(await callGemini(prompt, true))
  } catch (error) {
    console.error('classifyTask error:', error)
    return { title: taskText, category: 'Personal', priority: 'medium', is_key: false }
  }
}

// Estimate macros for a described meal.
export async function estimateCalories(mealDescription: string): Promise<any> {
  const prompt = `You are a nutrition expert. Estimate the nutrition of this meal.

Meal: "${mealDescription}"

Respond ONLY with JSON:
{ "calories": number, "protein_grams": number, "carbs_grams": number, "fat_grams": number, "confidence": "high|medium|low" }`

  try {
    return parseJson(await callGemini(prompt, true))
  } catch (error) {
    console.error('estimateCalories error:', error)
    return { calories: 0, protein_grams: 0, carbs_grams: 0, fat_grams: 0, confidence: 'low' }
  }
}

// Smart capture router: decide what a quick note is and extract fields.
export async function smartCapture(text: string, categories: string[]): Promise<any> {
  const todayStr = new Date().toISOString().split('T')[0]
  const prompt = `You are the router for a personal productivity OS. Classify the user's quick note into exactly ONE type and extract structured fields.

Types:
- "task": something the user needs to do.
- "meal": food the user ate or is logging.
- "event": something scheduled at a specific date/time.
- "goal": an aspiration spanning a week, month, or year.
- "journal": a reflection, feeling, or note about how things are going.

User note: "${text}"
Task categories: ${categories.join(', ')}
Today's date: ${todayStr}

Respond ONLY with JSON in this exact shape:
{
  "type": "task|meal|event|goal|journal",
  "title": "short clean title, max 9 words",
  "task": { "category": "one of the categories", "priority": "high|medium|low", "is_key": true|false },
  "meal": { "meal_type": "breakfast|lunch|dinner|snack", "calories": number, "protein": number, "carbs": number, "fat": number },
  "event": { "date": "YYYY-MM-DD", "time": "HH:MM" },
  "goal": { "timeframe": "weekly|monthly|yearly" },
  "journal": { "content": "the note, lightly cleaned up" }
}
Only the nested object matching "type" must be accurate; the others may use defaults. is_key is true only for clearly important tasks.`

  try {
    return parseJson(await callGemini(prompt, true))
  } catch (error) {
    console.error('smartCapture error:', error)
    return { type: 'task', title: text, task: { category: 'Personal', priority: 'medium', is_key: false } }
  }
}

// Draft a weekly review from the user's week of data.
export async function generateWeeklyReview(context: string): Promise<any> {
  const prompt = `You are a sharp, honest personal coach writing a concise weekly review for the user, using only the data below.

${context}

Be specific and brief. Do not invent facts not supported by the data. Respond ONLY with JSON:
{
  "wins": "2-3 sentences on what genuinely went well",
  "slipped": "1-2 sentences on what slipped or stalled",
  "open_loops": "unfinished threads worth carrying into next week",
  "health": "1 sentence on the health and habit pattern",
  "next_week": "three priorities for next week, each on its own line"
}`

  try {
    return parseJson(await callGemini(prompt, true))
  } catch (error) {
    console.error('generateWeeklyReview error:', error)
    return null
  }
}

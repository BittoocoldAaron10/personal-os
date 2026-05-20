export const TASK_CLASSIFICATION_PROMPT = (taskText: string, categories: string[]) => `
You are a task classification AI. Given a task description, classify it into one of the following categories and assign a priority level.

Categories: ${categories.join(', ')}
Priority levels: high, medium, low

Task: "${taskText}"

Respond in JSON format:
{
  "title": "short task title",
  "category": "one of the categories",
  "priority": "high/medium/low",
  "description": "optional description"
}
`

export const CALORIE_ESTIMATION_PROMPT = (mealDescription: string) => `
You are a nutrition expert. Estimate the nutritional content of this meal based on the description.

Meal description: "${mealDescription}"

Respond in JSON format:
{
  "calories": number,
  "protein_grams": number,
  "carbs_grams": number,
  "fat_grams": number,
  "confidence": "high/medium/low"
}
`

export const RECOMMENDATION_PROMPT = (journalEntries: string[], taskData: string) => `
You are a personal coach and strategic advisor. Based on the user's journal entries and task data, provide 3-5 key recommendations for improvement.

Recent Journal Entries:
${journalEntries.join('\n')}

Task Data Summary:
${taskData}

Provide recommendations in JSON format:
{
  "recommendations": [
    {
      "area": "area of life",
      "recommendation": "specific, actionable recommendation",
      "priority": "high/medium/low",
      "reasoning": "why this matters"
    }
  ]
}
`

export const PATTERN_ANALYSIS_PROMPT = (journalEntries: string[]) => `
You are a psychology expert analyzing behavioral patterns. Look for recurring themes, challenges, and successes in these journal entries.

Journal Entries:
${journalEntries.join('\n---\n')}

Analyze and provide in JSON format:
{
  "patterns": [
    {
      "pattern": "identified pattern",
      "frequency": "how often mentioned",
      "impact": "positive/negative/neutral",
      "suggestions": "how to address it"
    }
  ],
  "strengths": ["list of identified strengths"],
  "challenges": ["list of identified challenges"]
}
`

// Local-timezone-aware date helpers.
// The user's "today" must follow their own clock, not the server's UTC clock.

export function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDays(dateKey: string, n: number): string {
  const d = new Date(dateKey + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return localDateKey(d)
}

export function daysBetween(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00').getTime()
  const db = new Date(b + 'T00:00:00').getTime()
  return Math.round((db - da) / 86400000)
}

// Monday-anchored start of the week for a given date.
export function weekStart(d: Date = new Date()): string {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const offset = (copy.getDay() + 6) % 7 // 0 = Monday
  copy.setDate(copy.getDate() - offset)
  return localDateKey(copy)
}

// ISO-8601 week number.
export function isoWeek(d: Date = new Date()): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = (date.getUTCDay() + 6) % 7
  date.setUTCDate(date.getUTCDate() - dayNum + 3)
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4))
  const diff = date.getTime() - firstThursday.getTime()
  return 1 + Math.round(diff / 604800000)
}

// Current consecutive-day streak from a list of completed date keys.
// Counts from today, or from yesterday if today isn't done yet.
export function streakFromDates(dates: string[], today: string = localDateKey()): number {
  if (!dates || dates.length === 0) return 0
  const set = new Set(dates)
  let cursor = today
  if (!set.has(cursor)) cursor = addDays(cursor, -1)
  let streak = 0
  while (set.has(cursor)) {
    streak++
    cursor = addDays(cursor, -1)
  }
  return streak
}

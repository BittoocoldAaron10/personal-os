// XP, points, and Game Time Bank math.
//
// Rules (set by the user):
//   - Every completed calendar task = 15 EXP (quick) or 50 EXP (main task).
//   - 50 EXP = 1 point.  1 point = 30 minutes of game time.
//   - Weekdays 7am-2pm = FREE mode (nothing blocked). Else = EARN mode.

export type Difficulty = 'quick' | 'main'

export const XP_PER_TASK: Record<Difficulty, number> = {
  quick: 15,
  main: 50,
}

export const EXP_PER_POINT = 50
export const MINUTES_PER_POINT = 30

// XP awarded for one completed task of the given difficulty.
export function xpForTask(difficulty: Difficulty = 'quick'): number {
  return XP_PER_TASK[difficulty] ?? XP_PER_TASK.quick
}

// Total points earned across a lifetime of XP.
export function pointsFromXP(totalXp: number): number {
  return Math.floor(Math.max(0, totalXp) / EXP_PER_POINT)
}

// Total minutes of game time ever earned.
export function minutesEarned(totalXp: number): number {
  return pointsFromXP(totalXp) * MINUTES_PER_POINT
}

// Minutes of game time still available = earned minus already redeemed.
export function minutesAvailable(totalXp: number, minutesRedeemed: number): number {
  return Math.max(0, minutesEarned(totalXp) - Math.max(0, minutesRedeemed))
}

// Points still available to spend (each worth MINUTES_PER_POINT minutes).
export function pointsAvailable(totalXp: number, minutesRedeemed: number): number {
  return Math.floor(minutesAvailable(totalXp, minutesRedeemed) / MINUTES_PER_POINT)
}

// XP needed to clear a given level (progression gets steeper).
export function xpForLevel(level: number): number {
  if (level <= 5) return 100
  if (level <= 10) return 150
  return 200
}

export interface LevelInfo {
  level: number
  levelXp: number // XP earned within the current level
  levelXpNeeded: number // XP needed to finish the current level
  progressPct: number
}

// Derive the cosmetic level + in-level progress from lifetime XP.
export function levelFromXP(totalXp: number): LevelInfo {
  let level = 1
  let remaining = Math.max(0, totalXp)
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level)
    level++
  }
  const levelXpNeeded = xpForLevel(level)
  return {
    level,
    levelXp: remaining,
    levelXpNeeded,
    progressPct: Math.round((remaining / levelXpNeeded) * 100),
  }
}

// --- Schedule -------------------------------------------------------------
// Weekdays 7am-2pm everything is FREE (no points needed, nothing blocked).
// All other hours, and all weekend, are EARN mode (blocklist enforced).
export type Mode = 'free' | 'earn'

export function modeForDate(d: Date = new Date()): Mode {
  const day = d.getDay() // 0 = Sunday ... 6 = Saturday
  const isWeekday = day >= 1 && day <= 5
  const hour = d.getHours()
  const inSchoolHours = hour >= 7 && hour < 14 // 7:00am - 1:59pm
  return isWeekday && inSchoolHours ? 'free' : 'earn'
}

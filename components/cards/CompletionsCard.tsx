import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CalendarEvent } from '@/lib/types'
import { streakFromDates, localDateKey, addDays, daysBetween } from '@/lib/dateKey'
import { onRefresh } from '@/lib/bus'
import { toast } from '@/lib/toast'
import Panel from '@/components/Panel'
import { Flame, Zap, Trophy } from 'lucide-react'

export default function CompletionsCard({ userId, today }: { userId: string; today: string }) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
    setEvents((data || []) as CalendarEvent[])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    load()
  }, [load])
  useEffect(() => onRefresh(load), [load])

  // Calculate streaks and stats
  const allCompletedDates = Array.from(new Set(events.flatMap((e) => e.completed_dates || [])))
  const completedToday = allCompletedDates.filter((d) => d === today).length
  const completedThisWeek = allCompletedDates.filter((d) => {
    const daysAgo = daysBetween(d, today)
    return daysAgo >= 0 && daysAgo < 7
  })
  const overallStreak = streakFromDates(allCompletedDates, today)

  // Find longest streak
  const allCompletedDatesSorted = [...allCompletedDates].sort().reverse()
  let longestStreak = 0
  let currentStreak = 0
  let lastDate = ''
  for (const date of allCompletedDatesSorted) {
    if (!lastDate || daysBetween(date, lastDate) === 1) {
      currentStreak++
    } else {
      longestStreak = Math.max(longestStreak, currentStreak)
      currentStreak = 1
    }
    lastDate = date
  }
  longestStreak = Math.max(longestStreak, currentStreak)

  // Motivational messages
  const getMotivation = () => {
    if (completedToday === 0) return "Let's get started!"
    if (completedToday === 1) return "Good start! 🌱"
    if (completedToday <= 3) return "You're on fire! 🔥"
    return "Unstoppable! 💪"
  }

  const getStreakEmoji = () => {
    if (overallStreak === 0) return '👀'
    if (overallStreak < 3) return '📈'
    if (overallStreak < 7) return '🔥'
    if (overallStreak < 14) return '⚡'
    return '👑'
  }

  // Recent completions (last 7 completed days)
  const recentCompleted = allCompletedDatesSorted.slice(0, 7)

  return (
    <Panel
      num="08"
      title="COMPLETIONS"
      status={
        <div className="flex items-center gap-2">
          {overallStreak > 0 && (
            <span className="flex items-center gap-0.5 font-mono text-[10px] text-warm">
              <Flame size={11} /> {overallStreak}d
            </span>
          )}
          <span className="text-ink-dim text-[10px]">{completedThisWeek.length} this week</span>
        </div>
      }
    >
      {loading ? (
        <div className="text-ink-faint text-[12px] py-2">Loading…</div>
      ) : (
        <div className="space-y-4">
          {/* Motivation message */}
          <div className="text-center py-3 bg-white/[0.02] border border-line rounded-lg">
            <div className="text-[28px] mb-1">{getStreakEmoji()}</div>
            <div className="text-[13px] text-ink">{getMotivation()}</div>
          </div>

          {/* Streak stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 rounded-lg bg-white/[0.02] border border-line text-center">
              <div className="text-[10px] uppercase tracking-widest text-ink-faint mb-1">Current</div>
              <div className="font-mono text-[18px] text-accent">{overallStreak}</div>
              <div className="text-[8px] text-ink-dim">day streak</div>
            </div>

            <div className="p-2.5 rounded-lg bg-white/[0.02] border border-line text-center">
              <div className="text-[10px] uppercase tracking-widest text-ink-faint mb-1">Longest</div>
              <div className="font-mono text-[18px] text-warm">{longestStreak}</div>
              <div className="text-[8px] text-ink-dim">day streak</div>
            </div>

            <div className="p-2.5 rounded-lg bg-white/[0.02] border border-line text-center">
              <div className="text-[10px] uppercase tracking-widest text-ink-faint mb-1">Today</div>
              <div className="font-mono text-[18px] text-accent">{completedToday}</div>
              <div className="text-[8px] text-ink-dim">completed</div>
            </div>
          </div>

          {/* This week progress */}
          {completedThisWeek.length > 0 && (
            <div>
              <div className="font-mono text-[9px] uppercase tracking-widest text-ink-faint mb-2">This week</div>
              <div className="h-1 rounded-full bg-white/[0.05] overflow-hidden">
                <div
                  className="h-full bg-accent transition-all duration-300"
                  style={{ width: `${Math.min(100, (completedThisWeek.length / 10) * 100)}%` }}
                />
              </div>
              <div className="text-[10px] text-ink-dim mt-1">{completedThisWeek.length} of 10 tasks completed</div>
            </div>
          )}

          {/* Recent activity */}
          {recentCompleted.length > 0 && (
            <div>
              <div className="font-mono text-[9px] uppercase tracking-widest text-ink-faint mb-2">Recent activity</div>
              <div className="flex gap-1">
                {Array.from({ length: 7 }).map((_, i) => {
                  const date = addDays(today, -(6 - i))
                  const isCompleted = recentCompleted.includes(date)
                  return (
                    <div
                      key={date}
                      className={`h-6 flex-1 rounded-sm border text-[8px] flex items-center justify-center font-mono ${
                        isCompleted
                          ? 'bg-accent/20 border-accent text-accent font-bold'
                          : 'bg-white/[0.02] border-line text-ink-faint'
                      }`}
                      title={date}
                    >
                      {new Date(date + 'T00:00:00').getDate()}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Encouragement */}
          {completedToday > 0 && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-accent/10 border border-accent/30">
              <Trophy size={14} className="text-accent shrink-0" />
              <span className="text-[11px] text-accent leading-snug">Keep this streak going! Complete more tasks tomorrow.</span>
            </div>
          )}

          {completedToday === 0 && allCompletedDates.length > 0 && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-white/[0.05] border border-line">
              <Zap size={14} className="text-warm shrink-0" />
              <span className="text-[11px] text-ink-dim leading-snug">
                You had a {overallStreak}-day streak. Start today to build it back!
              </span>
            </div>
          )}
        </div>
      )}
    </Panel>
  )
}

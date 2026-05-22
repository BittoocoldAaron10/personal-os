import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { onRefresh, emitRefresh } from '@/lib/bus'
import { toast } from '@/lib/toast'
import {
  minutesAvailable,
  pointsAvailable,
  minutesEarned,
  levelFromXP,
  modeForDate,
  MINUTES_PER_POINT,
} from '@/lib/xp'
import Panel from '@/components/Panel'
import { Gamepad2, Zap, Lock, Unlock, Play } from 'lucide-react'

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 rounded-lg bg-white/[0.02] border border-line text-center">
      <div className="font-mono text-[14px] text-ink tabular-nums">{value}</div>
      <div className="text-[8px] uppercase tracking-widest text-ink-faint mt-0.5">{label}</div>
    </div>
  )
}

export default function GameTimeBankCard({ userId }: { userId: string }) {
  const [totalXp, setTotalXp] = useState(0)
  const [minutesRedeemed, setMinutesRedeemed] = useState(0)
  const [activeUntil, setActiveUntil] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [now, setNow] = useState(Date.now())

  const load = useCallback(async () => {
    const [{ data: stats }, { data: sessions }] = await Promise.all([
      supabase
        .from('user_xp_stats')
        .select('total_xp, minutes_redeemed')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('game_sessions')
        .select('ends_at')
        .eq('user_id', userId)
        .order('ends_at', { ascending: false })
        .limit(1),
    ])
    setTotalXp(stats?.total_xp || 0)
    setMinutesRedeemed(stats?.minutes_redeemed || 0)
    const latestEnd = sessions?.[0]?.ends_at ? Date.parse(sessions[0].ends_at) : null
    setActiveUntil(latestEnd && latestEnd > Date.now() ? latestEnd : null)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    load()
  }, [load])
  useEffect(() => onRefresh(load), [load])

  // Tick every second for the live countdown.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const mode = modeForDate(new Date(now))
  const avail = minutesAvailable(totalXp, minutesRedeemed)
  const points = pointsAvailable(totalXp, minutesRedeemed)
  const lvl = levelFromXP(totalXp)
  const sessionActive = activeUntil != null && activeUntil > now
  const secsLeft = sessionActive ? Math.max(0, Math.ceil((activeUntil! - now) / 1000)) : 0

  const startSession = async () => {
    if (starting) return
    if (avail < MINUTES_PER_POINT) {
      toast('Not enough EXP — finish more tasks', 'err')
      return
    }
    setStarting(true)
    try {
      const base = sessionActive && activeUntil ? activeUntil : Date.now()
      const startedAt = new Date(base)
      const endsAt = new Date(base + MINUTES_PER_POINT * 60000)
      const { error: e1 } = await supabase.from('game_sessions').insert({
        user_id: userId,
        minutes: MINUTES_PER_POINT,
        started_at: startedAt.toISOString(),
        ends_at: endsAt.toISOString(),
      })
      if (e1) throw e1
      const { error: e2 } = await supabase.from('user_xp_stats').upsert({
        user_id: userId,
        total_xp: totalXp,
        minutes_redeemed: minutesRedeemed + MINUTES_PER_POINT,
        updated_at: new Date().toISOString(),
      })
      if (e2) throw e2
      toast(`${MINUTES_PER_POINT} min of game time unlocked`)
      await load()
      emitRefresh()
    } catch (err: any) {
      console.error('start session failed:', err)
      toast('Could not start session', 'err')
    } finally {
      setStarting(false)
    }
  }

  return (
    <Panel
      num="08"
      title="GAME TIME BANK"
      status={
        <span className={`flex items-center gap-1 ${mode === 'free' ? 'text-accent' : 'text-warm'}`}>
          {mode === 'free' ? <Unlock size={10} /> : <Lock size={10} />}
          {mode === 'free' ? 'FREE' : 'EARN'}
        </span>
      }
    >
      {loading ? (
        <div className="text-ink-faint text-[12px] py-2">Loading…</div>
      ) : (
        <div className="space-y-3">
          {/* Hero */}
          <div className="rounded-lg border border-line bg-white/[0.02] p-4 text-center">
            {sessionActive ? (
              <>
                <div className="flex items-center justify-center gap-1.5 text-accent mb-1">
                  <Gamepad2 size={14} />
                  <span className="font-mono text-[9px] uppercase tracking-widest">Game time running</span>
                </div>
                <div className="font-mono text-[34px] text-accent tabular-nums leading-none">
                  {String(Math.floor(secsLeft / 60)).padStart(2, '0')}:
                  {String(secsLeft % 60).padStart(2, '0')}
                </div>
                <div className="text-[10px] text-ink-faint mt-1">until games lock again</div>
              </>
            ) : mode === 'free' ? (
              <>
                <div className="text-[26px] mb-0.5">🔓</div>
                <div className="text-[13px] text-ink">Free hours — everything&apos;s open</div>
                <div className="text-[10px] text-ink-faint mt-0.5">
                  No points needed until 2pm. Save them up!
                </div>
              </>
            ) : (
              <>
                <div className="font-mono text-[9px] uppercase tracking-widest text-ink-faint mb-1">
                  Game time available
                </div>
                <div className="font-mono text-[34px] text-accent tabular-nums leading-none">
                  {avail}
                  <span className="text-[14px] text-ink-dim ml-1">min</span>
                </div>
                <div className="text-[10px] text-ink-faint mt-1">
                  {points > 0
                    ? `${points} point${points > 1 ? 's' : ''} ready to spend`
                    : 'Finish tasks to earn game time'}
                </div>
              </>
            )}
          </div>

          {/* Start / extend session */}
          {mode === 'earn' && (
            <button
              onClick={startSession}
              disabled={starting || avail < MINUTES_PER_POINT}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-accent/15 text-accent text-[12px] font-medium hover:bg-accent/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Play size={12} />
              {sessionActive
                ? `Add ${MINUTES_PER_POINT} more min`
                : `Unlock ${MINUTES_PER_POINT} min — spend 1 point`}
            </button>
          )}

          {/* Level + XP */}
          <div>
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span className="font-mono uppercase tracking-widest text-ink-faint">
                Level {lvl.level}
              </span>
              <span className="font-mono text-ink-dim">
                {lvl.levelXp}/{lvl.levelXpNeeded} XP
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-300"
                style={{ width: `${lvl.progressPct}%` }}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Total XP" value={String(totalXp)} />
            <Stat label="Earned" value={`${minutesEarned(totalXp)}m`} />
            <Stat label="Points" value={String(points)} />
          </div>

          <div className="flex items-start gap-1.5 text-[10px] text-ink-faint leading-snug">
            <Zap size={11} className="text-warm shrink-0 mt-0.5" />
            <span>
              Finish calendar tasks to earn EXP. 50 EXP = 1 point = {MINUTES_PER_POINT} min of game
              time.
            </span>
          </div>
        </div>
      )}
    </Panel>
  )
}

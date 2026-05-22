import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CalendarEvent } from '@/lib/types'
import { weekStart, addDays, streakFromDates } from '@/lib/dateKey'
import { onRefresh, emitRefresh } from '@/lib/bus'
import { toast } from '@/lib/toast'
import { xpForTask, XP_PER_TASK, type Difficulty } from '@/lib/xp'
import Panel from '@/components/Panel'
import { Plus, Clock, X, Check, RefreshCw, Link2, Loader2, Copy, Flame, Zap } from 'lucide-react'

interface SyncStatus {
  configured: boolean
  serviceAccountEmail: string
  connected: boolean
  calendarId: string | null
  timezone: string | null
  lastSyncedAt: string | null
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'never synced'
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60000) return 'synced just now'
  const m = Math.floor(diff / 60000)
  if (m < 60) return `synced ${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `synced ${h}h ago`
  return `synced ${Math.floor(h / 24)}d ago`
}

export default function CalendarCard({ userId, today }: { userId: string; today: string }) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selected, setSelected] = useState(today)
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [time, setTime] = useState('09:00')
  const [difficulty, setDifficulty] = useState<Difficulty>('quick')

  // Google Calendar sync
  const [sync, setSync] = useState<SyncStatus | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [calIdInput, setCalIdInput] = useState('')
  const [savingConn, setSavingConn] = useState(false)
  const [userEmail, setUserEmail] = useState('')

  const start = weekStart(new Date(today + 'T00:00:00'))
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: true })
    setEvents((data || []) as CalendarEvent[])
  }, [userId])

  const loadStatus = useCallback(async (): Promise<SyncStatus | null> => {
    try {
      const r = await fetch(`/api/google/status?userId=${encodeURIComponent(userId)}`)
      if (!r.ok) return null
      const d = (await r.json()) as SyncStatus
      setSync(d)
      return d
    } catch {
      return null
    }
  }, [userId])

  const runSync = useCallback(
    async (silent = false) => {
      setSyncing(true)
      try {
        const r = await fetch('/api/google/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        })
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || 'Sync failed')
        await load()
        setSync((s) => (s ? { ...s, lastSyncedAt: d.lastSyncedAt || new Date().toISOString() } : s))
        if (!silent) {
          const moved = (d.pulled || 0) + (d.pushed || 0) + (d.updated || 0) + (d.deleted || 0)
          toast(moved ? `Synced · ${d.pulled || 0} in / ${d.pushed || 0} out` : 'Calendar up to date')
        }
      } catch (e: any) {
        console.error('calendar sync failed:', e)
        if (!silent) toast(e?.message || 'Sync failed', 'err')
      } finally {
        setSyncing(false)
      }
    },
    [userId, load]
  )

  useEffect(() => {
    load()
  }, [load])
  useEffect(() => onRefresh(load), [load])

  // On mount: load sync status, auto-sync if connected, grab account email.
  useEffect(() => {
    loadStatus().then((d) => {
      if (d?.connected) runSync(true)
    })
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email || ''))
  }, [loadStatus, runSync])

  const dayEvents = events.filter((e) => (e.start_time || '').slice(0, 10) === selected)
  const completedToday = dayEvents.filter((e) => (e.completed_dates || []).includes(today)).length
  const completionPct = dayEvents.length ? Math.round((completedToday / dayEvents.length) * 100) : 0

  const addEvent = async () => {
    const t = title.trim()
    if (!t) return
    const sh = parseInt(time.split(':')[0], 10)
    const eh = String(Math.min(23, sh + 1)).padStart(2, '0')
    setTitle('')
    setAdding(false)
    setDifficulty('quick')
    const { data, error } = await supabase
      .from('calendar_events')
      .insert([
        {
          user_id: userId,
          title: t,
          difficulty,
          start_time: `${selected}T${time}:00`,
          end_time: `${selected}T${eh}:${time.split(':')[1]}:00`,
        },
      ])
      .select()
    if (error) {
      console.error('add event failed:', error)
      return
    }
    await load()
    // Push to Google Calendar immediately, then reload so the row carries
    // its google_event_id (needed for a later delete to propagate).
    const newId = data?.[0]?.id
    if (newId && sync?.connected) {
      fetch('/api/google/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'create', osEventId: newId }),
      })
        .then(() => load())
        .catch(() => {})
    }
  }

  const removeEvent = async (id: string) => {
    const ev = events.find((e) => e.id === id)
    setEvents((prev) => prev.filter((e) => e.id !== id))
    if (ev?.google_event_id && sync?.connected) {
      fetch('/api/google/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'delete', googleEventId: ev.google_event_id }),
      }).catch(() => {})
    }
    await supabase.from('calendar_events').delete().eq('id', id)
  }

  const awardXP = useCallback(
    async (delta: number) => {
      const { data } = await supabase
        .from('user_xp_stats')
        .select('total_xp, minutes_redeemed')
        .eq('user_id', userId)
        .maybeSingle()
      const nextXp = Math.max(0, (data?.total_xp || 0) + delta)
      await supabase.from('user_xp_stats').upsert({
        user_id: userId,
        total_xp: nextXp,
        minutes_redeemed: data?.minutes_redeemed || 0,
        updated_at: new Date().toISOString(),
      })
    },
    [userId]
  )

  const toggleCompletion = async (ev: CalendarEvent) => {
    const dates = ev.completed_dates || []
    const done = dates.includes(today)
    const next = done ? dates.filter((d) => d !== today) : [...dates, today]
    const stamp = next.length > 0 ? new Date().toISOString() : null

    // Optimistic update
    setEvents((prev) =>
      prev.map((e) => (e.id === ev.id ? { ...e, completed_dates: next, completed_at: stamp } : e))
    )

    const { error } = await supabase
      .from('calendar_events')
      .update({ completed_dates: next, completed_at: stamp })
      .eq('id', ev.id)

    if (error) {
      console.error('completion toggle failed:', error)
      load()
      return
    }

    // Award XP for completing the task — or claw it back when un-completing.
    const xp = xpForTask(ev.difficulty)
    await awardXP(done ? -xp : xp)
    emitRefresh()
    if (!done) toast(`+${xp} EXP earned`)
  }

  const connect = async () => {
    const calId = calIdInput.trim()
    if (!calId || savingConn) return
    setSavingConn(true)
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
      const r = await fetch('/api/google/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, calendarId: calId, timezone: tz }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Connection failed')
      setConnecting(false)
      toast('Google Calendar connected')
      const st = await loadStatus()
      if (st?.connected) runSync()
    } catch (e: any) {
      console.error('connect failed:', e)
      toast(e?.message || 'Connection failed', 'err')
    } finally {
      setSavingConn(false)
    }
  }

  const disconnect = async () => {
    try {
      await fetch('/api/google/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      await loadStatus()
      toast('Google Calendar disconnected')
    } catch {
      toast('Could not disconnect', 'err')
    }
  }

  const copy = (text: string) => {
    if (!text) return
    navigator.clipboard?.writeText(text).then(
      () => toast('Copied'),
      () => {}
    )
  }

  return (
    <Panel
      num="04"
      title="CALENDAR"
      status={
        <div className="flex items-center gap-3">
          <span className="text-ink-faint">
            {new Date(today + 'T00:00:00')
              .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
              .toUpperCase()}
          </span>
          {dayEvents.length > 0 && (
            <span className="text-ink-dim text-[10px]">
              {completedToday}/{dayEvents.length} · {completionPct}%
            </span>
          )}
        </div>
      }
      accessory={
        <div className="flex items-center gap-2">
          {sync?.connected && (
            <button
              onClick={() => runSync()}
              disabled={syncing}
              title="Sync with Google Calendar"
              className="text-ink-faint hover:text-accent transition-colors disabled:opacity-50"
            >
              <RefreshCw size={12} className={syncing ? 'spin' : ''} />
            </button>
          )}
          <button
            onClick={() => setAdding((v) => !v)}
            className="text-ink-faint hover:text-accent transition-colors"
          >
            <Plus size={13} />
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const date = new Date(d + 'T00:00:00')
          const isToday = d === today
          const isSel = d === selected
          const count = events.filter((e) => (e.start_time || '').slice(0, 10) === d).length
          return (
            <button
              key={d}
              onClick={() => setSelected(d)}
              className={`flex flex-col items-center py-2 rounded-lg border transition-colors ${
                isSel ? 'border-accent/50 bg-accent/10' : 'border-line hover:border-line-bright'
              }`}
            >
              <span className="font-mono text-[8.5px] uppercase tracking-wider text-ink-faint">
                {date.toLocaleDateString('en-US', { weekday: 'short' })}
              </span>
              <span
                className={`font-mono text-[15px] mt-0.5 ${
                  isToday ? 'text-accent' : isSel ? 'text-ink' : 'text-ink-dim'
                }`}
              >
                {String(date.getDate()).padStart(2, '0')}
              </span>
              <span className={`h-1 w-1 rounded-full mt-1 ${count ? 'bg-accent' : 'bg-transparent'}`} />
            </button>
          )
        })}
      </div>

      {adding && (
        <div className="mt-3 space-y-2">
          <div className="flex gap-2">
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addEvent()}
              placeholder="Event title…"
              className="flex-1 px-2.5 py-1.5 text-[12px] min-w-0"
            />
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="px-2 py-1.5 text-[12px] w-[92px] shrink-0"
            />
            <button onClick={addEvent} className="px-2.5 rounded-md bg-accent/15 text-accent shrink-0">
              <Check size={13} />
            </button>
          </div>
          <div className="flex gap-1.5">
            {(['quick', 'main'] as Difficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md border font-mono text-[10px] uppercase tracking-wider transition-colors ${
                  difficulty === d
                    ? 'border-accent/50 bg-accent/10 text-accent'
                    : 'border-line text-ink-faint hover:border-line-bright'
                }`}
              >
                {d === 'quick' ? 'Quick task' : 'Main task'}
                <span className="text-warm">+{XP_PER_TASK[d]}</span>
              </button>
            ))}
            <span className="flex-1 self-center text-right font-mono text-[9px] text-ink-faint">
              Main tasks = study / workout / hobby blocks
            </span>
          </div>
        </div>
      )}

      <div className="mt-3 border-t border-line pt-3 space-y-1.5">
        <div className="font-mono text-[9px] uppercase tracking-widest text-ink-faint mb-1">
          {new Date(selected + 'T00:00:00').toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
          })}
        </div>
        {dayEvents.length === 0 ? (
          <div className="text-[12px] text-ink-faint py-1">No events. Press + to add one.</div>
        ) : (
          <div className="space-y-1.5">
            <div className="h-1 rounded-full bg-white/[0.05] overflow-hidden">
              <div className="h-full bg-accent transition-all duration-300" style={{ width: `${completionPct}%` }} />
            </div>
            {dayEvents.map((e) => {
              const done = (e.completed_dates || []).includes(today)
              const streak = streakFromDates(e.completed_dates || [], today)
              return (
                <div
                  key={e.id}
                  className="group flex items-center gap-2.5 p-2 rounded-md bg-white/[0.02] border border-line"
                >
                  <button
                    onClick={() => toggleCompletion(e)}
                    className={`h-4 w-4 shrink-0 rounded-sm border grid place-items-center transition-colors ${
                      done ? 'bg-accent border-accent text-bg' : 'border-line-bright text-transparent hover:border-accent'
                    }`}
                  >
                    <Check size={11} strokeWidth={3} />
                  </button>
                  <Clock size={12} className={done ? 'text-ink-faint' : 'text-accent'} />
                  <span className="font-mono text-[11px] text-ink-dim tabular-nums">
                    {(e.start_time || '').slice(11, 16)}
                  </span>
                  <span className={`flex-1 text-[12.5px] truncate ${done ? 'text-ink-faint line-through' : 'text-ink'}`}>
                    {e.title}
                  </span>
                  <span
                    className={`flex items-center gap-0.5 font-mono text-[9px] shrink-0 ${
                      done ? 'text-accent' : 'text-ink-faint'
                    }`}
                    title={e.difficulty === 'main' ? 'Main task' : 'Quick task'}
                  >
                    <Zap size={9} /> {xpForTask(e.difficulty)}
                  </span>
                  {streak > 0 && (
                    <span className="flex items-center gap-0.5 font-mono text-[9px] text-warm shrink-0">
                      <Flame size={9} /> {streak}
                    </span>
                  )}
                  {e.google_event_id && (
                    <Link2 size={10} className="text-ink-faint shrink-0" aria-label="Synced with Google" />
                  )}
                  <button
                    onClick={() => removeEvent(e.id)}
                    className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-hot transition-all shrink-0"
                  >
                    <X size={12} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Google Calendar sync */}
      {sync && (
        <div className="mt-3 border-t border-line pt-2.5">
          {!sync.configured ? (
            <div className="font-mono text-[9px] uppercase tracking-widest text-ink-faint">
              Google sync unavailable
            </div>
          ) : connecting ? (
            <div className="space-y-2">
              <div className="font-mono text-[9px] uppercase tracking-widest text-ink-faint">
                Connect Google Calendar
              </div>
              <p className="text-[11px] text-ink-faint leading-relaxed">
                In Google Calendar settings, share your calendar with this address and give it{' '}
                <span className="text-ink-dim">“Make changes to events”</span>:
              </p>
              <div className="flex items-center gap-1.5">
                <code className="flex-1 px-2 py-1.5 text-[10.5px] bg-white/[0.03] border border-line rounded-md text-ink-dim truncate">
                  {sync.serviceAccountEmail || '—'}
                </code>
                <button
                  onClick={() => copy(sync.serviceAccountEmail)}
                  title="Copy"
                  className="px-2 py-1.5 rounded-md border border-line text-ink-faint hover:text-accent transition-colors shrink-0"
                >
                  <Copy size={12} />
                </button>
              </div>
              <p className="text-[11px] text-ink-faint leading-relaxed">
                Then enter the calendar to sync (your Google account email):
              </p>
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={calIdInput}
                  onChange={(e) => setCalIdInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && connect()}
                  placeholder="you@gmail.com"
                  className="flex-1 px-2.5 py-1.5 text-[12px] min-w-0"
                />
                <button
                  onClick={connect}
                  disabled={savingConn || !calIdInput.trim()}
                  className="px-3 rounded-md bg-accent/15 text-accent shrink-0 disabled:opacity-40"
                >
                  {savingConn ? <Loader2 size={13} className="spin" /> : <Check size={13} />}
                </button>
                <button
                  onClick={() => setConnecting(false)}
                  className="px-2 text-ink-faint hover:text-ink transition-colors shrink-0"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          ) : sync.connected ? (
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[11px] text-ink-faint min-w-0">
                <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                <span className="truncate">Google Calendar · {timeAgo(sync.lastSyncedAt)}</span>
              </span>
              <button
                onClick={disconnect}
                className="font-mono text-[9px] uppercase tracking-wider text-ink-faint hover:text-hot transition-colors shrink-0"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setCalIdInput(userEmail)
                setConnecting(true)
              }}
              className="flex items-center gap-1.5 text-[11px] text-accent hover:text-accent-bright transition-colors"
            >
              <Link2 size={12} /> Connect Google Calendar
            </button>
          )}
        </div>
      )}
    </Panel>
  )
}

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Habit } from '@/lib/types'
import { streakFromDates } from '@/lib/dateKey'
import { onRefresh } from '@/lib/bus'
import Panel from '@/components/Panel'
import { Plus, Check, X, Flame } from 'lucide-react'

export default function HabitsCard({ userId, today }: { userId: string; today: string }) {
  const [habits, setHabits] = useState<Habit[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
    setHabits((data || []) as Habit[])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    load()
  }, [load])
  useEffect(() => onRefresh(load), [load])

  const toggle = async (h: Habit) => {
    const dates = h.completed_dates || []
    const done = dates.includes(today)
    const next = done ? dates.filter((d) => d !== today) : [...dates, today]
    setHabits((prev) => prev.map((x) => (x.id === h.id ? { ...x, completed_dates: next } : x)))
    const { error } = await supabase.from('habits').update({ completed_dates: next }).eq('id', h.id)
    if (error) {
      console.error('habit toggle failed:', error)
      load()
    }
  }

  const addHabit = async () => {
    const name = newName.trim()
    if (!name) return
    setNewName('')
    setAdding(false)
    const { error } = await supabase
      .from('habits')
      .insert([{ user_id: userId, name, frequency: 'daily', completed_today: false, completed_dates: [] }])
    if (error) console.error('add habit failed:', error)
    load()
  }

  const removeHabit = async (id: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== id))
    await supabase.from('habits').delete().eq('id', id)
  }

  const doneCount = habits.filter((h) => (h.completed_dates || []).includes(today)).length
  const pct = habits.length ? Math.round((doneCount / habits.length) * 100) : 0

  return (
    <Panel
      num="03"
      title="HABITS"
      status={
        <span className="text-ink-dim">
          {doneCount}/{habits.length} · {pct}%
        </span>
      }
      accessory={
        <button onClick={() => setAdding((v) => !v)} className="text-ink-faint hover:text-accent transition-colors">
          <Plus size={13} />
        </button>
      }
    >
      <div className="h-1 rounded-full bg-white/[0.05] overflow-hidden mb-3">
        <div className="h-full bg-accent transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>

      {adding && (
        <div className="flex gap-2 mb-3">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addHabit()}
            placeholder="New habit…"
            className="flex-1 px-2.5 py-1.5 text-[12px]"
          />
          <button onClick={addHabit} className="px-2.5 rounded-md bg-accent/15 text-accent">
            <Check size={13} />
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-ink-faint text-[12px] py-2">Loading…</div>
      ) : habits.length === 0 ? (
        <div className="text-center py-5 text-[12px] text-ink-faint">No habits yet. Add one to start.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {habits.map((h) => {
            const done = (h.completed_dates || []).includes(today)
            const streak = streakFromDates(h.completed_dates || [], today)
            return (
              <div key={h.id} className="group flex items-center gap-2.5 p-2.5 rounded-lg bg-white/[0.02] border border-line">
                <button
                  onClick={() => toggle(h)}
                  className={`h-5 w-5 shrink-0 rounded-md border grid place-items-center transition-colors ${
                    done ? 'bg-accent border-accent text-bg' : 'border-line-bright text-transparent hover:border-accent'
                  }`}
                >
                  <Check size={12} strokeWidth={3} />
                </button>
                <span
                  className={`flex-1 text-[12.5px] truncate ${done ? 'text-ink-faint line-through' : 'text-ink-dim'}`}
                >
                  {h.name}
                </span>
                {streak > 0 && (
                  <span className="flex items-center gap-0.5 font-mono text-[10px] text-warm">
                    <Flame size={10} /> {streak}
                  </span>
                )}
                <button
                  onClick={() => removeHabit(h.id)}
                  className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-hot transition-all"
                >
                  <X size={12} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </Panel>
  )
}

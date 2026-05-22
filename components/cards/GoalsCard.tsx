import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Goal } from '@/lib/types'
import { onRefresh } from '@/lib/bus'
import Panel from '@/components/Panel'
import { Plus, Check, X } from 'lucide-react'

const FRAMES = ['weekly', 'monthly', 'yearly'] as const
type Frame = (typeof FRAMES)[number]

export default function GoalsCard({ userId }: { userId: string }) {
  const [goals, setGoals] = useState<Goal[]>([])
  const [frame, setFrame] = useState<Frame>('weekly')
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setGoals((data || []) as Goal[])
  }, [userId])

  useEffect(() => {
    load()
  }, [load])
  useEffect(() => onRefresh(load), [load])

  const addGoal = async () => {
    const t = title.trim()
    if (!t) return
    setTitle('')
    setAdding(false)
    const { error } = await supabase
      .from('goals')
      .insert([{ user_id: userId, title: t, timeframe: frame, status: 'active' }])
    if (error) console.error('add goal failed:', error)
    load()
  }

  const toggle = async (g: Goal) => {
    const status = g.status === 'active' ? 'completed' : 'active'
    setGoals((p) => p.map((x) => (x.id === g.id ? { ...x, status } : x)))
    await supabase.from('goals').update({ status }).eq('id', g.id)
  }

  const removeGoal = async (id: string) => {
    setGoals((p) => p.filter((g) => g.id !== id))
    await supabase.from('goals').delete().eq('id', id)
  }

  const list = goals.filter((g) => g.timeframe === frame)
  const doneCount = list.filter((g) => g.status === 'completed').length

  return (
    <Panel
      num="07"
      title="GOALS"
      status={
        <span className="text-ink-dim">
          {doneCount}/{list.length}
        </span>
      }
      accessory={
        <button onClick={() => setAdding((v) => !v)} className="text-ink-faint hover:text-accent transition-colors">
          <Plus size={13} />
        </button>
      }
    >
      <div className="flex rounded-md border border-line overflow-hidden mb-3">
        {FRAMES.map((f) => (
          <button
            key={f}
            onClick={() => setFrame(f)}
            className={`flex-1 py-1 font-mono text-[9px] uppercase tracking-wider transition-colors ${
              frame === f ? 'bg-white/[0.07] text-ink' : 'text-ink-faint hover:text-ink-dim'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {adding && (
        <div className="flex gap-2 mb-3">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addGoal()}
            placeholder={`New ${frame} goal…`}
            className="flex-1 px-2.5 py-1.5 text-[12px]"
          />
          <button onClick={addGoal} className="px-2.5 rounded-md bg-accent/15 text-accent">
            <Check size={13} />
          </button>
        </div>
      )}

      {list.length === 0 ? (
        <div className="text-center py-5 text-[12px] text-ink-faint">No {frame} goals yet.</div>
      ) : (
        <div className="space-y-1.5">
          {list.map((g) => {
            const done = g.status === 'completed'
            return (
              <div key={g.id} className="group flex items-center gap-2.5 p-2 rounded-md bg-white/[0.02] border border-line">
                <button
                  onClick={() => toggle(g)}
                  className={`h-4 w-4 shrink-0 rounded border grid place-items-center transition-colors ${
                    done ? 'bg-accent border-accent text-bg' : 'border-line-bright text-transparent hover:border-accent'
                  }`}
                >
                  <Check size={10} strokeWidth={3} />
                </button>
                <span
                  className={`flex-1 text-[12.5px] truncate ${done ? 'text-ink-faint line-through' : 'text-ink-dim'}`}
                >
                  {g.title}
                </span>
                <button
                  onClick={() => removeGoal(g.id)}
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

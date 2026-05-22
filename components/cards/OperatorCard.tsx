import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { OperatorProfile } from '@/lib/types'
import { streakFromDates } from '@/lib/dateKey'
import { onRefresh } from '@/lib/bus'
import Panel from '@/components/Panel'
import { Pencil, Check, X } from 'lucide-react'

const DEFAULT_PROFILE: OperatorProfile = {
  name: process.env.NEXT_PUBLIC_USER_NAME || 'Operator',
  role: 'Builder',
  city: 'Earth',
  focus: 'Set your focus for today.',
}

export default function OperatorCard({ userId, today }: { userId: string; today: string }) {
  const [profile, setProfile] = useState<OperatorProfile>(DEFAULT_PROFILE)
  const [streak, setStreak] = useState(0)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<OperatorProfile>(DEFAULT_PROFILE)
  const [memoryId, setMemoryId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const { data: mem } = await supabase
      .from('memory')
      .select('id, value')
      .eq('user_id', userId)
      .eq('key', 'operator_profile')
      .maybeSingle()
    if (mem) {
      setMemoryId(mem.id)
      try {
        setProfile({ ...DEFAULT_PROFILE, ...JSON.parse(mem.value) })
      } catch {
        /* keep default */
      }
    }
    const { data: habits } = await supabase.from('habits').select('completed_dates').eq('user_id', userId)
    let best = 0
    ;(habits || []).forEach((h: any) => {
      const s = streakFromDates(h.completed_dates || [], today)
      if (s > best) best = s
    })
    setStreak(best)
  }, [userId, today])

  useEffect(() => {
    load()
  }, [load])
  useEffect(() => onRefresh(load), [load])

  const save = async () => {
    setSaving(true)
    const value = JSON.stringify(draft)
    if (memoryId) {
      await supabase.from('memory').update({ value }).eq('id', memoryId)
    } else {
      const { data } = await supabase
        .from('memory')
        .insert([{ user_id: userId, key: 'operator_profile', value }])
        .select('id')
      if (data && data[0]) setMemoryId(data[0].id)
    }
    setProfile(draft)
    setSaving(false)
    setEditing(false)
  }

  const initials = profile.name
    .trim()
    .split(/\s+/)
    .map((w) => w[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <Panel
      num="01"
      title="OPERATOR"
      status={
        !editing && (
          <span className="flex items-center gap-1.5 text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent blink" />
            ONLINE
          </span>
        )
      }
      accessory={
        !editing && (
          <button
            onClick={() => {
              setDraft(profile)
              setEditing(true)
            }}
            className="text-ink-faint hover:text-ink-dim transition-colors"
          >
            <Pencil size={12} />
          </button>
        )
      }
    >
      {editing ? (
        <div className="space-y-2">
          {(['name', 'role', 'city', 'focus'] as const).map((f) => (
            <div key={f}>
              <label className="font-mono text-[9px] uppercase tracking-wider text-ink-faint">{f}</label>
              <input
                value={draft[f]}
                onChange={(e) => setDraft({ ...draft, [f]: e.target.value })}
                className="w-full px-2.5 py-1.5 text-[13px] mt-0.5"
              />
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <button
              onClick={save}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-accent/15 text-accent text-[12px] font-mono uppercase tracking-wider hover:bg-accent/25 transition-colors disabled:opacity-50"
            >
              <Check size={13} /> Save
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-3 py-1.5 rounded-md border border-line text-ink-faint hover:text-ink-dim transition-colors"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3.5">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-lg bg-surface-high border border-line grid place-items-center font-mono text-sm font-semibold text-accent">
              {initials || 'OP'}
            </div>
            <div className="min-w-0">
              <div className="text-[15px] font-medium text-ink truncate">{profile.name}</div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-ink-faint truncate">
                {profile.role} · {profile.city}
              </div>
            </div>
          </div>
          <div className="border-t border-line pt-3">
            <div className="font-mono text-[9px] uppercase tracking-widest text-ink-faint mb-1">Focus</div>
            <div className="text-[13px] text-ink-dim leading-snug">{profile.focus}</div>
          </div>
          <div className="border-t border-line pt-3 flex items-baseline justify-between">
            <span className="font-mono text-[9px] uppercase tracking-widest text-ink-faint">Streak</span>
            <span className="font-mono text-ink">
              <span className="text-2xl text-accent">{streak}</span>
              <span className="text-[10px] text-ink-faint ml-1.5">DAYS</span>
            </span>
          </div>
        </div>
      )}
    </Panel>
  )
}

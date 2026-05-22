import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { onRefresh } from '@/lib/bus'
import { toast } from '@/lib/toast'
import { BlocklistItem } from '@/lib/types'
import Panel from '@/components/Panel'
import { Plus, X, AppWindow, Globe, Check, Ban } from 'lucide-react'

// Pre-loaded for a fresh account so the blocker has Roblox covered out of the box.
const ROBLOX_SEED = [
  { kind: 'app' as const, value: 'RobloxPlayerBeta.exe', label: 'Roblox' },
  { kind: 'site' as const, value: 'roblox.com', label: 'Roblox (web)' },
]

// Strip protocol / path / www so the blocker gets a bare domain.
function normalizeSite(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/^www\./, '')
}

export default function BlocklistCard({ userId }: { userId: string }) {
  const [items, setItems] = useState<BlocklistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [kind, setKind] = useState<'app' | 'site'>('app')
  const [value, setValue] = useState('')
  const seededRef = useRef(false)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('blocklist')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
    const rows = (data || []) as BlocklistItem[]

    // First-ever load with nothing saved: seed Roblox defaults once.
    if (rows.length === 0 && !seededRef.current) {
      seededRef.current = true
      await supabase.from('blocklist').insert(ROBLOX_SEED.map((s) => ({ ...s, user_id: userId })))
      const { data: seeded } = await supabase
        .from('blocklist')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
      setItems((seeded || []) as BlocklistItem[])
      setLoading(false)
      return
    }
    setItems(rows)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    load()
  }, [load])
  useEffect(() => onRefresh(load), [load])

  const add = async () => {
    const raw = value.trim()
    if (!raw) return
    const v = kind === 'site' ? normalizeSite(raw) : raw
    if (!v) return
    setValue('')
    setAdding(false)
    const { error } = await supabase
      .from('blocklist')
      .insert({ user_id: userId, kind, value: v, label: v })
    if (error) {
      console.error('add blocklist failed:', error)
      toast('Could not add', 'err')
    } else {
      toast('Added to blocklist')
    }
    load()
  }

  const remove = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
    await supabase.from('blocklist').delete().eq('id', id)
  }

  return (
    <Panel
      num="09"
      title="BLOCKLIST"
      status={<span className="text-ink-dim">{items.length}</span>}
      accessory={
        <button
          onClick={() => setAdding((v) => !v)}
          className="text-ink-faint hover:text-accent transition-colors"
        >
          <Plus size={13} />
        </button>
      }
    >
      {adding && (
        <div className="space-y-2 mb-3">
          <div className="flex gap-1.5">
            {(['app', 'site'] as const).map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md border font-mono text-[10px] uppercase tracking-wider transition-colors ${
                  kind === k
                    ? 'border-accent/50 bg-accent/10 text-accent'
                    : 'border-line text-ink-faint hover:border-line-bright'
                }`}
              >
                {k === 'app' ? <AppWindow size={10} /> : <Globe size={10} />}
                {k}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && add()}
              placeholder={kind === 'app' ? 'RobloxPlayerBeta.exe' : 'youtube.com'}
              className="flex-1 px-2.5 py-1.5 text-[12px] min-w-0"
            />
            <button onClick={add} className="px-2.5 rounded-md bg-accent/15 text-accent shrink-0">
              <Check size={13} />
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-ink-faint text-[12px] py-2">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-center py-4 text-[12px] text-ink-faint">Nothing blocked yet.</div>
      ) : (
        <div className="space-y-1.5">
          {items.map((it) => (
            <div
              key={it.id}
              className="group flex items-center gap-2.5 p-2 rounded-md bg-white/[0.02] border border-line"
            >
              {it.kind === 'app' ? (
                <AppWindow size={12} className="text-warm shrink-0" />
              ) : (
                <Globe size={12} className="text-warm shrink-0" />
              )}
              <span className="flex-1 text-[12px] text-ink-dim truncate">{it.label || it.value}</span>
              <span className="font-mono text-[9px] text-ink-faint uppercase">{it.kind}</span>
              <button
                onClick={() => remove(it.id)}
                className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-hot transition-all shrink-0"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-start gap-1.5 text-[10px] text-ink-faint leading-snug border-t border-line pt-2.5">
        <Ban size={11} className="text-warm shrink-0 mt-0.5" />
        <span>
          The desktop app blocks these outside free hours (weekdays 7am–2pm) unless you have game
          time running.
        </span>
      </div>
    </Panel>
  )
}

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'
import { Task } from '@/lib/types'
import { onRefresh, emitRefresh } from '@/lib/bus'
import { toast } from '@/lib/toast'
import Panel from '@/components/Panel'
import MicButton from '@/components/MicButton'
import { ArrowRight, Loader2, Send } from 'lucide-react'

export default function SessionCard({ userId, today }: { userId: string; today: string }) {
  const router = useRouter()
  const [now, setNow] = useState<Date | null>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [focus, setFocus] = useState<Task[]>([])

  const name = process.env.NEXT_PUBLIC_USER_NAME || 'Operator'

  useEffect(() => {
    setNow(new Date())
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const loadFocus = useCallback(async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .neq('status', 'done')
      .eq('is_key', true)
    const order: Record<string, number> = { high: 0, medium: 1, low: 2 }
    const sorted = ((data || []) as Task[]).sort((a, b) => (order[a.priority] ?? 1) - (order[b.priority] ?? 1))
    setFocus(sorted.slice(0, 3))
  }, [userId])

  useEffect(() => {
    loadFocus()
  }, [loadFocus])
  useEffect(() => onRefresh(loadFocus), [loadFocus])

  const submit = async () => {
    const value = text.trim()
    if (!value || sending) return
    setSending(true)
    try {
      const r = await fetch('/api/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: value, userId, today }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Capture failed')
      setText('')
      toast(`${d.label} ← ${d.title}`)
      emitRefresh()
    } catch (e: any) {
      console.error('capture failed:', e)
      toast(e.message || 'Capture failed', 'err')
    } finally {
      setSending(false)
    }
  }

  const hour = now ? now.getHours() : 12
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <Panel num="02" title="SESSION">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[19px] text-ink">
            {greeting}, <span className="text-accent">{name}</span>.
          </div>
          {now && (
            <div className="font-mono text-[11px] uppercase tracking-wider text-ink-faint mt-1">
              {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
          )}
        </div>
        {now && (
          <div className="font-mono text-right shrink-0">
            <div className="text-[26px] text-ink tabular-nums leading-none">
              {now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-[9px] uppercase tracking-widest text-ink-faint mt-1">Local time</div>
          </div>
        )}
      </div>

      <div className="mt-4">
        <div className="font-mono text-[9px] uppercase tracking-widest text-ink-faint mb-1.5">Capture</div>
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Type anything — a task, meal, event, goal, or note…"
            className="flex-1 px-3 py-2 text-[13px]"
          />
          <MicButton onResult={(t) => setText((p) => (p ? p + ' ' + t : t))} />
          <button
            onClick={submit}
            disabled={sending || !text.trim()}
            className="shrink-0 flex items-center gap-1.5 px-3 rounded-md bg-accent/15 text-accent font-mono text-[11px] uppercase tracking-wider hover:bg-accent/25 transition-colors disabled:opacity-40"
          >
            {sending ? <Loader2 size={13} className="spin" /> : <Send size={13} />}
            <span className="hidden sm:inline">Capture</span>
          </button>
        </div>
        <div className="font-mono text-[9.5px] text-ink-faint mt-1.5">
          AI routes it to Tasks, Nutrition, Calendar, Goals, or Journal automatically.
        </div>
      </div>

      <div className="mt-4 border-t border-line pt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[9px] uppercase tracking-widest text-ink-faint">Today's Focus</span>
          <button
            onClick={() => router.push('/crm')}
            className="font-mono text-[9px] uppercase tracking-wider text-ink-faint hover:text-accent transition-colors"
          >
            CRM →
          </button>
        </div>
        {focus.length === 0 ? (
          <div className="text-[12px] text-ink-faint py-1">No key tasks yet — star tasks in the CRM.</div>
        ) : (
          <div className="space-y-1.5">
            {focus.map((t, i) => (
              <button
                key={t.id}
                onClick={() => router.push('/crm')}
                className="w-full flex items-center gap-2.5 p-2 rounded-md bg-white/[0.02] border border-line hover:border-line-bright transition-colors text-left"
              >
                <span className="font-mono text-[10px] text-accent">{String(i + 1).padStart(2, '0')}</span>
                <span className="flex-1 text-[13px] text-ink-dim truncate">{t.title}</span>
                <span
                  className={`font-mono text-[9px] uppercase ${t.priority === 'high' ? 'text-hot' : 'text-ink-faint'}`}
                >
                  {t.priority}
                </span>
                <ArrowRight size={12} className="text-ink-faint" />
              </button>
            ))}
          </div>
        )}
      </div>
    </Panel>
  )
}

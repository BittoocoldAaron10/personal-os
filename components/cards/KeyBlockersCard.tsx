import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'
import { Task } from '@/lib/types'
import { daysBetween } from '@/lib/dateKey'
import { onRefresh } from '@/lib/bus'
import Panel from '@/components/Panel'
import { ShieldCheck } from 'lucide-react'

export default function KeyBlockersCard({ userId, today }: { userId: string; today: string }) {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .neq('status', 'done')
      .order('created_at', { ascending: true })
    const all = (data || []) as Task[]
    setTasks(all.filter((t) => t.is_key || t.priority === 'high'))
    setLoading(false)
  }, [userId])

  useEffect(() => {
    load()
  }, [load])
  useEffect(() => onRefresh(load), [load])

  const shown = tasks.slice(0, 5)
  const extra = tasks.length - shown.length

  return (
    <Panel
      num="05"
      title="KEY BLOCKERS"
      status={<span className="text-ink-dim">{tasks.length} ACTIVE</span>}
      accessory={
        <button onClick={() => router.push('/crm')} className="text-ink-faint hover:text-accent transition-colors">
          VIEW ALL
        </button>
      }
    >
      {loading ? (
        <div className="text-ink-faint text-[12px] py-2">Loading…</div>
      ) : shown.length === 0 ? (
        <div className="flex flex-col items-center text-center py-5 gap-2">
          <ShieldCheck size={20} className="text-ink-faint" />
          <span className="text-[12px] text-ink-faint">Nothing stuck. Clean board.</span>
        </div>
      ) : (
        <div className="space-y-2">
          {shown.map((t) => {
            const stuck = Math.max(0, daysBetween(t.created_at.split('T')[0], today))
            const hot = t.priority === 'high'
            return (
              <button
                key={t.id}
                onClick={() => router.push('/crm')}
                className="w-full text-left p-2.5 rounded-lg bg-white/[0.02] border border-line hover:border-line-bright transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[13px] text-ink leading-snug">{t.title}</span>
                  <span
                    className={`shrink-0 font-mono text-[9px] uppercase px-1.5 py-0.5 rounded ${
                      hot ? 'bg-hot/15 text-hot' : 'bg-warm/15 text-warm'
                    }`}
                  >
                    {hot ? 'HOT' : 'WARM'}
                  </span>
                </div>
                <div className="font-mono text-[9.5px] uppercase tracking-wider text-ink-faint mt-1.5">
                  Owner You · Stuck {stuck}d
                </div>
              </button>
            )
          })}
          {extra > 0 && (
            <button
              onClick={() => router.push('/crm')}
              className="w-full text-center py-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-faint hover:text-accent transition-colors"
            >
              + {extra} more · view all
            </button>
          )}
        </div>
      )}
    </Panel>
  )
}

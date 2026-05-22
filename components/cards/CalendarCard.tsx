import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CalendarEvent } from '@/lib/types'
import { weekStart, addDays } from '@/lib/dateKey'
import { onRefresh } from '@/lib/bus'
import Panel from '@/components/Panel'
import { Plus, Clock, X, Check } from 'lucide-react'

export default function CalendarCard({ userId, today }: { userId: string; today: string }) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selected, setSelected] = useState(today)
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [time, setTime] = useState('09:00')

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

  useEffect(() => {
    load()
  }, [load])
  useEffect(() => onRefresh(load), [load])

  const dayEvents = events.filter((e) => (e.start_time || '').slice(0, 10) === selected)

  const addEvent = async () => {
    const t = title.trim()
    if (!t) return
    const sh = parseInt(time.split(':')[0], 10)
    const eh = String(Math.min(23, sh + 1)).padStart(2, '0')
    setTitle('')
    setAdding(false)
    const { error } = await supabase.from('calendar_events').insert([
      {
        user_id: userId,
        title: t,
        start_time: `${selected}T${time}:00`,
        end_time: `${selected}T${eh}:${time.split(':')[1]}:00`,
      },
    ])
    if (error) console.error('add event failed:', error)
    load()
  }

  const removeEvent = async (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id))
    await supabase.from('calendar_events').delete().eq('id', id)
  }

  return (
    <Panel
      num="04"
      title="CALENDAR"
      status={
        <span className="text-ink-faint">
          {new Date(today + 'T00:00:00')
            .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            .toUpperCase()}
        </span>
      }
      accessory={
        <button onClick={() => setAdding((v) => !v)} className="text-ink-faint hover:text-accent transition-colors">
          <Plus size={13} />
        </button>
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
        <div className="flex gap-2 mt-3">
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
          dayEvents.map((e) => (
            <div key={e.id} className="group flex items-center gap-2.5 p-2 rounded-md bg-white/[0.02] border border-line">
              <Clock size={12} className="text-accent shrink-0" />
              <span className="font-mono text-[11px] text-ink-dim tabular-nums">
                {(e.start_time || '').slice(11, 16)}
              </span>
              <span className="flex-1 text-[12.5px] text-ink truncate">{e.title}</span>
              <button
                onClick={() => removeEvent(e.id)}
                className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-hot transition-all"
              >
                <X size={12} />
              </button>
            </div>
          ))
        )}
      </div>
    </Panel>
  )
}

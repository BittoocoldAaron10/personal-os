import { useCallback, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { Task, TASK_CATEGORIES } from '@/lib/types'
import { localDateKey, daysBetween } from '@/lib/dateKey'
import { toast } from '@/lib/toast'
import Shell from '@/components/Shell'
import MicButton from '@/components/MicButton'
import { Plus, Star, Loader2, X, Trash2, LayoutGrid, List as ListIcon, ArrowRight } from 'lucide-react'

type Urgency = 'overdue' | 'today' | 'week' | 'later'

const COLUMNS: { id: Urgency; label: string; tone: string }[] = [
  { id: 'overdue', label: 'OVERDUE', tone: 'text-hot' },
  { id: 'today', label: 'TODAY', tone: 'text-accent' },
  { id: 'week', label: 'THIS WEEK', tone: 'text-warm' },
  { id: 'later', label: 'LATER', tone: 'text-ink-faint' },
]
const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }

export default function CRM() {
  const [userId, setUserId] = useState<string | null>(null)
  const [today, setToday] = useState('')
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'kanban' | 'list'>('kanban')
  const [category, setCategory] = useState<string>('All')
  const [search, setSearch] = useState('')
  const [showDone, setShowDone] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newText, setNewText] = useState('')
  const [addBusy, setAddBusy] = useState(false)
  const [drawer, setDrawer] = useState<Task | null>(null)

  const load = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
    setTasks((data || []) as Task[])
    setLoading(false)
  }, [])

  useEffect(() => {
    setToday(localDateKey())
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id || null
      setUserId(uid)
      if (uid) load(uid)
      else setLoading(false)
    })
  }, [load])

  const refresh = () => {
    if (userId) load(userId)
  }

  const urgencyOf = (t: Task): Urgency => {
    if (!t.due_date) return 'later'
    const due = t.due_date.slice(0, 10)
    if (due < today) return 'overdue'
    if (due === today) return 'today'
    return daysBetween(today, due) <= 7 ? 'week' : 'later'
  }

  const addTask = async () => {
    const text = newText.trim()
    if (!text || !userId || addBusy) return
    setAddBusy(true)
    try {
      const r = await fetch('/api/ai/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, userId }),
      })
      if (!r.ok) throw new Error('classify failed')
      setNewText('')
      setAdding(false)
      toast('Task added')
      refresh()
    } catch (e) {
      console.error('add task failed:', e)
      toast('Could not add task', 'err')
    } finally {
      setAddBusy(false)
    }
  }

  const saveDrawer = async () => {
    if (!drawer || !userId) return
    const patch = {
      title: drawer.title,
      description: drawer.description || '',
      category: drawer.category,
      priority: drawer.priority,
      status: drawer.status,
      due_date: drawer.due_date || null,
      is_key: drawer.is_key,
    }
    const { error } = await supabase.from('tasks').update(patch).eq('id', drawer.id)
    if (error) {
      console.error('save failed:', error)
      toast('Save failed', 'err')
      return
    }
    setDrawer(null)
    toast('Task saved')
    refresh()
  }

  const deleteDrawer = async () => {
    if (!drawer || !userId) return
    await supabase.from('tasks').delete().eq('id', drawer.id)
    setDrawer(null)
    toast('Task deleted')
    refresh()
  }

  const toggleKey = async (t: Task) => {
    setTasks((p) => p.map((x) => (x.id === t.id ? { ...x, is_key: !x.is_key } : x)))
    await supabase.from('tasks').update({ is_key: !t.is_key }).eq('id', t.id)
  }

  const cycleStatus = async (t: Task) => {
    const next = t.status === 'todo' ? 'in_progress' : t.status === 'in_progress' ? 'done' : 'todo'
    setTasks((p) => p.map((x) => (x.id === t.id ? { ...x, status: next } : x)))
    await supabase.from('tasks').update({ status: next }).eq('id', t.id)
  }

  const base = tasks.filter((t) => {
    if (category !== 'All' && t.category !== category) return false
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })
  const open = base.filter((t) => t.status !== 'done')
  const listTasks = showDone ? base : open
  const doneCount = tasks.filter((t) => t.status === 'done').length

  const columnTasks = (u: Urgency) =>
    open
      .filter((t) => urgencyOf(t) === u)
      .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1))

  const priorityDot = (p: string) =>
    p === 'high' ? 'bg-hot' : p === 'medium' ? 'bg-warm' : 'bg-ink-faint'

  const TaskCard = ({ t }: { t: Task }) => {
    const stuck = Math.max(0, daysBetween(t.created_at.slice(0, 10), today))
    return (
      <button
        onClick={() => setDrawer({ ...t })}
        className="w-full text-left p-2.5 rounded-lg bg-white/[0.02] border border-line hover:border-line-bright transition-colors"
      >
        <div className="flex items-start justify-between gap-2">
          <span
            className={`text-[13px] leading-snug ${
              t.status === 'done' ? 'text-ink-faint line-through' : 'text-ink'
            }`}
          >
            {t.title}
          </span>
          <span
            onClick={(e) => {
              e.stopPropagation()
              toggleKey(t)
            }}
            className={`shrink-0 transition-colors ${
              t.is_key ? 'text-accent' : 'text-ink-faint hover:text-ink-dim'
            }`}
          >
            <Star size={13} fill={t.is_key ? 'currentColor' : 'none'} />
          </span>
        </div>
        <div className="flex items-center gap-2 mt-2 font-mono text-[9px] uppercase tracking-wider text-ink-faint">
          <span className={`h-1.5 w-1.5 rounded-full ${priorityDot(t.priority)}`} />
          <span>{t.category}</span>
          <span className="text-ink-faint/60">·</span>
          <span>{t.due_date ? `due ${t.due_date.slice(5, 10)}` : `${stuck}d old`}</span>
        </div>
      </button>
    )
  }

  return (
    <Shell active="crm">
      {/* Header bar */}
      <div className="panel px-4 py-3 flex flex-wrap items-center gap-3 mb-3">
        <div className="font-mono text-[11px] uppercase tracking-widest">
          <span className="text-accent">CRM</span>
          <span className="text-ink-faint"> // TASK DATABASE</span>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
          {open.length} open · {doneCount} done
        </div>
        <div className="flex-1" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter tasks…"
          className="px-2.5 py-1.5 text-[12px] w-[150px]"
        />
        <div className="flex rounded-md border border-line overflow-hidden">
          <button
            onClick={() => setView('kanban')}
            className={`px-2 py-1.5 transition-colors ${
              view === 'kanban' ? 'bg-white/[0.07] text-ink' : 'text-ink-faint hover:text-ink-dim'
            }`}
          >
            <LayoutGrid size={13} />
          </button>
          <button
            onClick={() => setView('list')}
            className={`px-2 py-1.5 transition-colors ${
              view === 'list' ? 'bg-white/[0.07] text-ink' : 'text-ink-faint hover:text-ink-dim'
            }`}
          >
            <ListIcon size={13} />
          </button>
        </div>
        <button
          onClick={() => setAdding((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent/15 text-accent font-mono text-[11px] uppercase tracking-wider hover:bg-accent/25 transition-colors"
        >
          <Plus size={13} /> New
        </button>
      </div>

      {/* New task input */}
      {adding && (
        <div className="panel px-4 py-3 flex gap-2 mb-3 fadeup">
          <input
            autoFocus
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
            placeholder="Describe a task — AI sorts category & priority…"
            className="flex-1 px-3 py-2 text-[13px]"
          />
          <MicButton onResult={(t) => setNewText(t)} />
          <button
            onClick={addTask}
            disabled={addBusy}
            className="flex items-center gap-1.5 px-3 rounded-md bg-accent/15 text-accent font-mono text-[11px] uppercase tracking-wider hover:bg-accent/25 transition-colors disabled:opacity-40"
          >
            {addBusy ? <Loader2 size={13} className="spin" /> : <Plus size={13} />}
            Add
          </button>
        </div>
      )}

      {/* Category filter */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {['All', ...TASK_CATEGORIES].map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-2.5 py-1 rounded-md font-mono text-[10px] uppercase tracking-wider border transition-colors ${
              category === c
                ? 'border-accent/40 bg-accent/10 text-accent'
                : 'border-line text-ink-faint hover:text-ink-dim hover:border-line-bright'
            }`}
          >
            {c}
          </button>
        ))}
        {view === 'list' && (
          <button
            onClick={() => setShowDone((v) => !v)}
            className={`ml-auto px-2.5 py-1 rounded-md font-mono text-[10px] uppercase tracking-wider border transition-colors ${
              showDone
                ? 'border-accent/40 bg-accent/10 text-accent'
                : 'border-line text-ink-faint hover:text-ink-dim'
            }`}
          >
            Show done
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-28">
          <span className="font-mono text-[12px] uppercase tracking-widest text-ink-faint">Loading…</span>
        </div>
      ) : view === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {COLUMNS.map((col) => {
            const items = columnTasks(col.id)
            return (
              <div key={col.id} className="panel flex flex-col">
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-line">
                  <span className={`font-mono text-[10px] uppercase tracking-widest ${col.tone}`}>
                    {col.label}
                  </span>
                  <span className="font-mono text-[10px] text-ink-faint">{items.length}</span>
                </div>
                <div className="p-2.5 space-y-2 min-h-[80px]">
                  {items.length === 0 ? (
                    <div className="text-center py-4 font-mono text-[10px] uppercase tracking-wider text-ink-faint/60">
                      Empty
                    </div>
                  ) : (
                    items.map((t) => <TaskCard key={t.id} t={t} />)
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="panel divide-y divide-line">
          {listTasks.length === 0 ? (
            <div className="text-center py-16 font-mono text-[12px] uppercase tracking-widest text-ink-faint">
              No tasks
            </div>
          ) : (
            listTasks
              .slice()
              .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1))
              .map((t) => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition-colors">
                  <button
                    onClick={() => cycleStatus(t)}
                    title={t.status}
                    className={`h-4 w-4 shrink-0 rounded border grid place-items-center font-mono text-[8px] ${
                      t.status === 'done'
                        ? 'bg-accent border-accent text-bg'
                        : t.status === 'in_progress'
                        ? 'border-warm text-warm'
                        : 'border-line-bright text-transparent'
                    }`}
                  >
                    {t.status === 'done' ? '✓' : t.status === 'in_progress' ? '~' : ''}
                  </button>
                  <button onClick={() => setDrawer({ ...t })} className="flex-1 min-w-0 text-left">
                    <span
                      className={`text-[13px] ${
                        t.status === 'done' ? 'text-ink-faint line-through' : 'text-ink'
                      }`}
                    >
                      {t.title}
                    </span>
                  </button>
                  <span className="hidden sm:inline font-mono text-[9px] uppercase tracking-wider text-ink-faint">
                    {t.category}
                  </span>
                  <span className={`h-1.5 w-1.5 rounded-full ${priorityDot(t.priority)}`} />
                  <span className="font-mono text-[9px] uppercase tracking-wider text-ink-faint w-[58px] text-right">
                    {t.due_date ? t.due_date.slice(5, 10) : '—'}
                  </span>
                  <button
                    onClick={() => toggleKey(t)}
                    className={t.is_key ? 'text-accent' : 'text-ink-faint hover:text-ink-dim'}
                  >
                    <Star size={13} fill={t.is_key ? 'currentColor' : 'none'} />
                  </button>
                </div>
              ))
          )}
        </div>
      )}

      {/* Edit drawer */}
      {drawer && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setDrawer(null)} />
          <div className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[380px] bg-surface border-l border-line p-5 overflow-y-auto fadeup">
            <div className="flex items-center justify-between mb-5">
              <span className="font-mono text-[11px] uppercase tracking-widest text-ink-dim">Edit Task</span>
              <button onClick={() => setDrawer(null)} className="text-ink-faint hover:text-ink">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3.5">
              <Field label="Title">
                <input
                  value={drawer.title}
                  onChange={(e) => setDrawer({ ...drawer, title: e.target.value })}
                  className="w-full px-3 py-2 text-[13px]"
                />
              </Field>
              <Field label="Description">
                <textarea
                  value={drawer.description || ''}
                  onChange={(e) => setDrawer({ ...drawer, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 text-[13px] resize-none"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Category">
                  <select
                    value={drawer.category}
                    onChange={(e) => setDrawer({ ...drawer, category: e.target.value })}
                    className="w-full px-2.5 py-2 text-[13px]"
                  >
                    {TASK_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Priority">
                  <select
                    value={drawer.priority}
                    onChange={(e) => setDrawer({ ...drawer, priority: e.target.value as Task['priority'] })}
                    className="w-full px-2.5 py-2 text-[13px]"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </Field>
                <Field label="Status">
                  <select
                    value={drawer.status}
                    onChange={(e) => setDrawer({ ...drawer, status: e.target.value as Task['status'] })}
                    className="w-full px-2.5 py-2 text-[13px]"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </Field>
                <Field label="Due date">
                  <input
                    type="date"
                    value={drawer.due_date ? drawer.due_date.slice(0, 10) : ''}
                    onChange={(e) => setDrawer({ ...drawer, due_date: e.target.value || null })}
                    className="w-full px-2.5 py-2 text-[13px]"
                  />
                </Field>
              </div>
              <button
                onClick={() => setDrawer({ ...drawer, is_key: !drawer.is_key })}
                className={`w-full flex items-center justify-center gap-2 py-2 rounded-md border font-mono text-[11px] uppercase tracking-wider transition-colors ${
                  drawer.is_key
                    ? 'border-accent/40 bg-accent/10 text-accent'
                    : 'border-line text-ink-faint hover:text-ink-dim'
                }`}
              >
                <Star size={13} fill={drawer.is_key ? 'currentColor' : 'none'} />
                {drawer.is_key ? 'Key task' : 'Mark as key'}
              </button>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={saveDrawer}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-md bg-accent/15 text-accent font-mono text-[11px] uppercase tracking-wider hover:bg-accent/25 transition-colors"
              >
                Save <ArrowRight size={13} />
              </button>
              <button
                onClick={deleteDrawer}
                className="px-3 py-2.5 rounded-md border border-line text-ink-faint hover:text-hot hover:border-hot/40 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </>
      )}
    </Shell>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="font-mono text-[9px] uppercase tracking-widest text-ink-faint">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  )
}

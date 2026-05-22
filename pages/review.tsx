import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { JournalEntry } from '@/lib/types'
import { localDateKey, weekStart, addDays, isoWeek } from '@/lib/dateKey'
import { toast } from '@/lib/toast'
import Shell from '@/components/Shell'
import Panel from '@/components/Panel'
import MicButton from '@/components/MicButton'
import { Sparkles, Loader2, ChevronLeft, ChevronRight, Save, ChevronDown, ChevronUp, X, BookOpen } from 'lucide-react'

const REVIEW_MARKER = 'WEEKLY_REVIEW'

interface ReviewFields {
  wins: string
  slipped: string
  open_loops: string
  health: string
  next_week: string
}
const EMPTY: ReviewFields = { wins: '', slipped: '', open_loops: '', health: '', next_week: '' }

const SECTIONS: { key: keyof ReviewFields; label: string; full?: boolean }[] = [
  { key: 'wins', label: 'Wins this week' },
  { key: 'slipped', label: 'What slipped' },
  { key: 'open_loops', label: 'Open loops' },
  { key: 'health', label: 'Health & habit pattern' },
  { key: 'next_week', label: 'Next week — top 3', full: true },
]

export default function Review() {
  const [userId, setUserId] = useState<string | null>(null)
  const [today, setToday] = useState('')
  const [ready, setReady] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0)
  const [fields, setFields] = useState<ReviewFields>(EMPTY)
  const [reviewId, setReviewId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [savingReview, setSavingReview] = useState(false)
  const [journalText, setJournalText] = useState('')
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)

  const wkStart = today ? addDays(weekStart(new Date(today + 'T00:00:00')), weekOffset * 7) : ''
  const wkEnd = wkStart ? addDays(wkStart, 6) : ''

  useEffect(() => {
    setToday(localDateKey())
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null)
      setReady(true)
    })
  }, [])

  const loadReview = useCallback(async (uid: string, ws: string) => {
    const { data } = await supabase
      .from('journal_entries')
      .select('id, content')
      .eq('user_id', uid)
      .eq('date', ws)
      .eq('summary', REVIEW_MARKER)
      .maybeSingle()
    if (data) {
      setReviewId(data.id)
      try {
        setFields({ ...EMPTY, ...JSON.parse(data.content) })
      } catch {
        setFields(EMPTY)
      }
    } else {
      setReviewId(null)
      setFields(EMPTY)
    }
  }, [])

  const loadEntries = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', uid)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(60)
    setEntries(((data || []) as JournalEntry[]).filter((e) => e.summary !== REVIEW_MARKER))
  }, [])

  useEffect(() => {
    if (userId) loadEntries(userId)
  }, [userId, loadEntries])

  useEffect(() => {
    if (userId && wkStart) loadReview(userId, wkStart)
  }, [userId, wkStart, loadReview])

  const generate = async () => {
    if (!userId || generating) return
    setGenerating(true)
    try {
      const r = await fetch('/api/review/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, weekStart: wkStart, weekEnd: wkEnd }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'failed')
      setFields({ ...EMPTY, ...d })
      toast('Draft generated — review & edit it')
    } catch (e: any) {
      console.error('generate failed:', e)
      toast('Could not generate draft', 'err')
    } finally {
      setGenerating(false)
    }
  }

  const saveReview = async () => {
    if (!userId || savingReview) return
    setSavingReview(true)
    const content = JSON.stringify(fields)
    if (reviewId) {
      await supabase.from('journal_entries').update({ content }).eq('id', reviewId)
    } else {
      const { data } = await supabase
        .from('journal_entries')
        .insert([{ user_id: userId, date: wkStart, summary: REVIEW_MARKER, content }])
        .select('id')
      if (data && data[0]) setReviewId(data[0].id)
    }
    setSavingReview(false)
    toast('Weekly review saved')
  }

  const saveJournal = async () => {
    const text = journalText.trim()
    if (!text || !userId) return
    const summary = text.length > 120 ? text.slice(0, 120) + '…' : text
    const { error } = await supabase
      .from('journal_entries')
      .insert([{ user_id: userId, content: text, date: today, summary }])
    if (error) {
      console.error('journal save failed:', error)
      toast('Could not save entry', 'err')
      return
    }
    setJournalText('')
    toast('Journal entry saved')
    loadEntries(userId)
  }

  const deleteEntry = async (id: string) => {
    setEntries((p) => p.filter((e) => e.id !== id))
    await supabase.from('journal_entries').delete().eq('id', id)
  }

  const weekNum = wkStart ? isoWeek(new Date(wkStart + 'T00:00:00')) : 0
  const rangeLabel =
    wkStart && wkEnd
      ? `${new Date(wkStart + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(
          wkEnd + 'T00:00:00'
        ).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      : ''

  return (
    <Shell active="review">
      {!ready || !userId || !today ? (
        <div className="flex items-center justify-center py-32">
          <span className="font-mono text-[12px] uppercase tracking-widest text-ink-faint">Loading…</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 md:gap-4 fadeup">
          {/* Weekly review */}
          <div className="lg:col-span-7">
            <Panel
              title="WEEKLY REVIEW"
              status={<span className="text-accent">W{weekNum}</span>}
              accessory={
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setWeekOffset((v) => v - 1)}
                    className="text-ink-faint hover:text-ink transition-colors"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-ink-dim tabular-nums w-[92px] text-center normal-case tracking-normal">
                    {rangeLabel}
                  </span>
                  <button
                    onClick={() => setWeekOffset((v) => Math.min(0, v + 1))}
                    disabled={weekOffset >= 0}
                    className="text-ink-faint hover:text-ink transition-colors disabled:opacity-30"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              }
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SECTIONS.map((s) => (
                  <div key={s.key} className={s.full ? 'sm:col-span-2' : ''}>
                    <label className="font-mono text-[9px] uppercase tracking-widest text-ink-faint">
                      {s.label}
                    </label>
                    <textarea
                      value={fields[s.key]}
                      onChange={(e) => setFields({ ...fields, [s.key]: e.target.value })}
                      rows={s.full ? 3 : 4}
                      placeholder="—"
                      className="w-full px-3 py-2 text-[12.5px] mt-1 resize-none leading-relaxed"
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={generate}
                  disabled={generating}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-line text-ink-dim font-mono text-[11px] uppercase tracking-wider hover:border-line-bright hover:text-ink transition-colors disabled:opacity-50"
                >
                  {generating ? <Loader2 size={13} className="spin" /> : <Sparkles size={13} />}
                  {generating ? 'Drafting…' : 'AI draft'}
                </button>
                <button
                  onClick={saveReview}
                  disabled={savingReview}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md bg-accent/15 text-accent font-mono text-[11px] uppercase tracking-wider hover:bg-accent/25 transition-colors disabled:opacity-50"
                >
                  {savingReview ? <Loader2 size={13} className="spin" /> : <Save size={13} />}
                  Save review
                </button>
              </div>
            </Panel>
          </div>

          {/* Journal */}
          <div className="lg:col-span-5 flex flex-col gap-3 md:gap-4">
            <Panel title="JOURNAL" status={<span className="text-ink-faint">TODAY</span>}>
              <textarea
                value={journalText}
                onChange={(e) => setJournalText(e.target.value)}
                rows={4}
                placeholder="How did today go? What's on your mind?"
                className="w-full px-3 py-2 text-[13px] resize-none leading-relaxed"
              />
              <div className="flex justify-between items-center mt-2">
                <MicButton onResult={(t) => setJournalText((p) => (p ? p + ' ' + t : t))} />
                <button
                  onClick={saveJournal}
                  disabled={!journalText.trim()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-accent/15 text-accent font-mono text-[11px] uppercase tracking-wider hover:bg-accent/25 transition-colors disabled:opacity-40"
                >
                  <Save size={13} /> Save entry
                </button>
              </div>
            </Panel>

            <Panel
              title="JOURNAL LOG"
              status={<span className="text-ink-dim">{entries.length}</span>}
              bodyClassName="!p-0"
            >
              {entries.length === 0 ? (
                <div className="flex flex-col items-center text-center py-10 gap-2">
                  <BookOpen size={20} className="text-ink-faint" />
                  <span className="text-[12px] text-ink-faint">No entries yet.</span>
                </div>
              ) : (
                <div className="divide-y divide-line max-h-[440px] overflow-y-auto">
                  {entries.map((e) => {
                    const isOpen = expanded === e.id
                    return (
                      <div key={e.id} className="group px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setExpanded(isOpen ? null : e.id)}
                            className="flex-1 flex items-center gap-2 text-left min-w-0"
                          >
                            <span className="font-mono text-[10px] uppercase tracking-wider text-accent shrink-0">
                              {new Date(e.date + 'T00:00:00').toLocaleDateString('en-US', {
                                month: 'short',
                                day: '2-digit',
                              })}
                            </span>
                            <span className="text-[12px] text-ink-dim truncate">
                              {isOpen ? '' : e.summary || e.content}
                            </span>
                          </button>
                          {isOpen ? (
                            <ChevronUp size={13} className="text-ink-faint shrink-0" />
                          ) : (
                            <ChevronDown size={13} className="text-ink-faint shrink-0" />
                          )}
                          <button
                            onClick={() => deleteEntry(e.id)}
                            className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-hot transition-all shrink-0"
                          >
                            <X size={12} />
                          </button>
                        </div>
                        {isOpen && (
                          <p className="text-[12.5px] text-ink-dim leading-relaxed mt-2 whitespace-pre-wrap">
                            {e.content}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </Panel>
          </div>
        </div>
      )}
    </Shell>
  )
}

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { NutritionLog, HealthMetric } from '@/lib/types'
import { onRefresh } from '@/lib/bus'
import { toast } from '@/lib/toast'
import Panel from '@/components/Panel'
import MicButton from '@/components/MicButton'
import { Plus, X, Loader2, Check } from 'lucide-react'

const CAL_GOAL = 2500

const VITALS = [
  { id: 'workout_minutes', label: 'Workout', unit: 'min' },
  { id: 'study_minutes', label: 'Study', unit: 'min' },
  { id: 'sleep_hours', label: 'Sleep', unit: 'h' },
  { id: 'water_intake', label: 'Water', unit: 'L' },
  { id: 'weight', label: 'Weight', unit: 'kg' },
  { id: 'hobby_minutes', label: 'Hobby', unit: 'min' },
]

export default function NutritionCard({ userId, today }: { userId: string; today: string }) {
  const [tab, setTab] = useState<'meals' | 'vitals'>('meals')
  const [meals, setMeals] = useState<NutritionLog[]>([])
  const [metrics, setMetrics] = useState<HealthMetric[]>([])
  const [mealText, setMealText] = useState('')
  const [busy, setBusy] = useState(false)
  const [vital, setVital] = useState(VITALS[0].id)
  const [vitalVal, setVitalVal] = useState('')

  const load = useCallback(async () => {
    const [m, h] = await Promise.all([
      supabase
        .from('nutrition_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .order('created_at', { ascending: false }),
      supabase.from('health_metrics').select('*').eq('user_id', userId).eq('date', today),
    ])
    setMeals((m.data || []) as NutritionLog[])
    setMetrics((h.data || []) as HealthMetric[])
  }, [userId, today])

  useEffect(() => {
    load()
  }, [load])
  useEffect(() => onRefresh(load), [load])

  const addMeal = async () => {
    const desc = mealText.trim()
    if (!desc || busy) return
    setBusy(true)
    try {
      const r = await fetch('/api/ai/estimate-calories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mealDescription: desc, mealType: 'snack', userId, date: today }),
      })
      if (!r.ok) throw new Error('estimate failed')
      setMealText('')
      toast('Meal logged')
      load()
    } catch (e) {
      console.error('meal log failed:', e)
      toast('Could not log meal', 'err')
    } finally {
      setBusy(false)
    }
  }

  const removeMeal = async (id: string) => {
    setMeals((p) => p.filter((m) => m.id !== id))
    await supabase.from('nutrition_logs').delete().eq('id', id)
  }

  const addVital = async () => {
    const v = parseFloat(vitalVal)
    if (isNaN(v)) return
    const meta = VITALS.find((x) => x.id === vital) || VITALS[0]
    setVitalVal('')
    const { error } = await supabase
      .from('health_metrics')
      .insert([{ user_id: userId, metric_name: vital, value: v, unit: meta.unit, date: today }])
    if (error) console.error('add vital failed:', error)
    load()
  }

  const removeVital = async (id: string) => {
    setMetrics((p) => p.filter((m) => m.id !== id))
    await supabase.from('health_metrics').delete().eq('id', id)
  }

  const kcal = meals.reduce((s, m) => s + (m.calories || 0), 0)
  const prot = meals.reduce((s, m) => s + (m.protein || 0), 0)
  const carb = meals.reduce((s, m) => s + (m.carbs || 0), 0)
  const fat = meals.reduce((s, m) => s + (m.fat || 0), 0)
  const kcalPct = Math.min(100, Math.round((kcal / CAL_GOAL) * 100))

  return (
    <Panel
      num="06"
      title="NUTRITION"
      accessory={
        <div className="flex rounded-md border border-line overflow-hidden">
          {(['meals', 'vitals'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider transition-colors ${
                tab === t ? 'bg-white/[0.07] text-ink' : 'text-ink-faint hover:text-ink-dim'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      }
    >
      {tab === 'meals' ? (
        <>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl text-ink tabular-nums">{Math.round(kcal)}</span>
            <span className="font-mono text-[11px] text-ink-faint">/ {CAL_GOAL} kcal</span>
          </div>
          <div className="h-1 rounded-full bg-white/[0.05] overflow-hidden my-2">
            <div className="h-full bg-accent transition-all duration-300" style={{ width: `${kcalPct}%` }} />
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { l: 'PROTEIN', v: prot },
              { l: 'CARBS', v: carb },
              { l: 'FAT', v: fat },
            ].map((x) => (
              <div key={x.l} className="rounded-md bg-white/[0.02] border border-line p-1.5 text-center">
                <div className="font-mono text-[13px] text-ink-dim tabular-nums">{Math.round(x.v)}g</div>
                <div className="font-mono text-[8px] uppercase tracking-wider text-ink-faint mt-0.5">{x.l}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={mealText}
              onChange={(e) => setMealText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addMeal()}
              placeholder="Log a meal — AI estimates macros"
              className="flex-1 px-2.5 py-1.5 text-[12px] min-w-0"
            />
            <MicButton onResult={(t) => setMealText(t)} size={32} />
            <button
              onClick={addMeal}
              disabled={busy}
              className="px-2.5 rounded-md bg-accent/15 text-accent disabled:opacity-40 shrink-0"
            >
              {busy ? <Loader2 size={13} className="spin" /> : <Plus size={13} />}
            </button>
          </div>
          <div className="mt-3 space-y-1.5 max-h-[170px] overflow-y-auto">
            {meals.length === 0 ? (
              <div className="text-[12px] text-ink-faint py-1">No meals logged today.</div>
            ) : (
              meals.map((m) => (
                <div
                  key={m.id}
                  className="group flex items-center gap-2 p-2 rounded-md bg-white/[0.02] border border-line"
                >
                  <span className="flex-1 text-[12px] text-ink-dim truncate">{m.description}</span>
                  <span className="font-mono text-[10px] text-ink-faint tabular-nums">
                    {Math.round(m.calories)}k
                  </span>
                  <button
                    onClick={() => removeMeal(m.id)}
                    className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-hot transition-all"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {VITALS.map((v) => {
              const total = metrics
                .filter((m) => m.metric_name === v.id)
                .reduce((s, m) => s + m.value, 0)
              return (
                <div key={v.id} className="rounded-md bg-white/[0.02] border border-line p-1.5 text-center">
                  <div className="font-mono text-[13px] text-ink-dim tabular-nums">{total || '–'}</div>
                  <div className="font-mono text-[8px] uppercase tracking-wider text-ink-faint mt-0.5">
                    {v.label}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex gap-2">
            <select
              value={vital}
              onChange={(e) => setVital(e.target.value)}
              className="px-2 py-1.5 text-[12px] shrink-0"
            >
              {VITALS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={vitalVal}
              onChange={(e) => setVitalVal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addVital()}
              placeholder="Value"
              className="flex-1 px-2.5 py-1.5 text-[12px] min-w-0"
            />
            <button onClick={addVital} className="px-2.5 rounded-md bg-accent/15 text-accent shrink-0">
              <Check size={13} />
            </button>
          </div>
          <div className="mt-3 space-y-1.5 max-h-[160px] overflow-y-auto">
            {metrics.length === 0 ? (
              <div className="text-[12px] text-ink-faint py-1">No vitals logged today.</div>
            ) : (
              metrics.map((m) => {
                const meta = VITALS.find((v) => v.id === m.metric_name)
                return (
                  <div
                    key={m.id}
                    className="group flex items-center gap-2 p-2 rounded-md bg-white/[0.02] border border-line"
                  >
                    <span className="flex-1 text-[12px] text-ink-dim">{meta?.label || m.metric_name}</span>
                    <span className="font-mono text-[11px] text-ink tabular-nums">
                      {m.value} {m.unit}
                    </span>
                    <button
                      onClick={() => removeVital(m.id)}
                      className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-hot transition-all"
                    >
                      <X size={11} />
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </>
      )}
    </Panel>
  )
}

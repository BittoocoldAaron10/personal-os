import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { localDateKey } from '@/lib/dateKey'
import Shell from '@/components/Shell'
import OperatorCard from '@/components/cards/OperatorCard'
import SessionCard from '@/components/cards/SessionCard'
import HabitsCard from '@/components/cards/HabitsCard'
import CalendarCard from '@/components/cards/CalendarCard'
import GameTimeBankCard from '@/components/cards/GameTimeBankCard'
import BlocklistCard from '@/components/cards/BlocklistCard'
import KeyBlockersCard from '@/components/cards/KeyBlockersCard'
import NutritionCard from '@/components/cards/NutritionCard'
import GoalsCard from '@/components/cards/GoalsCard'

export default function Home() {
  const [userId, setUserId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [today, setToday] = useState('')

  useEffect(() => {
    setToday(localDateKey())
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null)
      setReady(true)
    })
  }, [])

  return (
    <Shell active="home">
      {!ready || !userId || !today ? (
        <div className="flex items-center justify-center py-32">
          <span className="font-mono text-[12px] uppercase tracking-widest text-ink-faint">Loading…</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 md:gap-4 fadeup">
          <div className="lg:col-span-3 flex flex-col gap-3 md:gap-4">
            <OperatorCard userId={userId} today={today} />
            <KeyBlockersCard userId={userId} today={today} />
          </div>
          <div className="lg:col-span-6 flex flex-col gap-3 md:gap-4">
            <SessionCard userId={userId} today={today} />
            <HabitsCard userId={userId} today={today} />
            <CalendarCard userId={userId} today={today} />
          </div>
          <div className="lg:col-span-3 flex flex-col gap-3 md:gap-4">
            <GameTimeBankCard userId={userId} />
            <BlocklistCard userId={userId} />
            <NutritionCard userId={userId} today={today} />
            <GoalsCard userId={userId} />
          </div>
        </div>
      )}
    </Shell>
  )
}

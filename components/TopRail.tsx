import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const TABS = [
  { id: 'home', label: 'HOME', href: '/dashboard' },
  { id: 'crm', label: 'CRM', href: '/crm' },
  { id: 'review', label: 'REVIEW', href: '/review' },
]

interface Ticker {
  sym: string
  price: number
  change: number
}

export default function TopRail({ active }: { active: 'home' | 'crm' | 'review' }) {
  const router = useRouter()
  const [now, setNow] = useState<Date | null>(null)
  const [ticks, setTicks] = useState<Ticker[]>([])
  const [menuOpen, setMenuOpen] = useState(false)

  const name = process.env.NEXT_PUBLIC_USER_NAME || 'User'
  const initials = name
    .trim()
    .split(/\s+/)
    .map((w) => w[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase()

  useEffect(() => {
    setNow(new Date())
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const r = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true'
        )
        if (!r.ok) return
        const d = await r.json()
        if (!alive) return
        const next: Ticker[] = []
        if (d.bitcoin) next.push({ sym: 'BTC', price: d.bitcoin.usd, change: d.bitcoin.usd_24h_change || 0 })
        if (d.ethereum) next.push({ sym: 'ETH', price: d.ethereum.usd, change: d.ethereum.usd_24h_change || 0 })
        if (d.solana) next.push({ sym: 'SOL', price: d.solana.usd, change: d.solana.usd_24h_change || 0 })
        if (next.length) setTicks(next)
      } catch {
        /* ticker is decorative — ignore failures */
      }
    }
    load()
    const t = setInterval(load, 90000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const fmtPrice = (n: number) =>
    n >= 1000 ? Math.round(n).toLocaleString('en-US') : n.toFixed(n < 10 ? 2 : 1)

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="mx-auto max-w-[1500px] h-[52px] px-3 md:px-6 flex items-center gap-3 md:gap-5">
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
          <span className="h-[7px] w-[7px] rounded-full bg-accent blink shadow-glow" />
          <span className="font-mono text-[13px] font-semibold tracking-wide text-ink">PERSONAL OS</span>
          <span className="font-mono text-[10px] text-ink-faint hidden md:inline">// V1.0</span>
        </Link>

        <nav className="flex items-center gap-1">
          {TABS.map((tab) => {
            const isActive = tab.id === active
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`px-2.5 md:px-3 py-1.5 rounded-md font-mono text-[11px] tracking-widest transition-colors ${
                  isActive
                    ? 'bg-white/[0.06] text-ink border border-line'
                    : 'text-ink-faint hover:text-ink-dim border border-transparent'
                }`}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex-1" />

        {ticks.length > 0 && (
          <div className="hidden lg:flex items-center gap-4">
            {ticks.map((t) => (
              <div key={t.sym} className="flex items-center gap-1.5 font-mono text-[11px]">
                <span className="text-ink-faint">{t.sym}</span>
                <span className="text-ink-dim tabular-nums">${fmtPrice(t.price)}</span>
                <span className={`tabular-nums ${t.change >= 0 ? 'text-accent' : 'text-hot'}`}>
                  {t.change >= 0 ? '+' : ''}
                  {t.change.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        )}

        {now && (
          <div className="hidden sm:flex items-center gap-2 font-mono text-[11px] tabular-nums">
            <span className="text-ink-faint">
              {now
                .toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
                .toUpperCase()}
            </span>
            <span className="text-ink">
              {now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}

        <div className="relative shrink-0">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="h-8 w-8 rounded-md border border-line bg-surface-high font-mono text-[11px] font-semibold text-ink-dim hover:border-line-bright hover:text-ink transition-colors"
            aria-label="Account menu"
          >
            {initials}
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-10 z-50 w-44 panel p-1.5 fadeup">
                <div className="px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-faint truncate">
                  {name}
                </div>
                <button
                  onClick={signOut}
                  className="w-full text-left px-2.5 py-1.5 rounded-md text-[12px] text-ink-dim hover:bg-white/[0.05] hover:text-hot transition-colors"
                >
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

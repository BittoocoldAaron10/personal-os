import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      router.replace(data.session ? '/dashboard' : '/auth/login')
    })
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <span className="font-mono text-[12px] uppercase tracking-widest text-ink-faint blink">Routing…</span>
    </div>
  )
}

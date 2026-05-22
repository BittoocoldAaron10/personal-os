import type { AppProps } from 'next/app'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '@/lib/supabase'
import '@/styles/globals.css'

const PUBLIC_ROUTES = ['/auth/login', '/auth/signup']

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const gate = (hasSession: boolean) => {
      const path = window.location.pathname
      if (!hasSession && !PUBLIC_ROUTES.includes(path)) {
        router.push('/auth/login')
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      gate(!!data.session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      gate(!!session)
    })

    return () => {
      mounted = false
      subscription?.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <Head>
        <title>Personal OS</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      {loading ? (
        <div className="flex items-center justify-center min-h-screen">
          <span className="font-mono text-[12px] uppercase tracking-widest text-ink-faint blink">
            Personal OS — booting…
          </span>
        </div>
      ) : (
        <Component {...pageProps} />
      )}
    </>
  )
}

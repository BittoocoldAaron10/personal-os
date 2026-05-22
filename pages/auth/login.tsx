import { useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Loader2, ArrowRight } from 'lucide-react'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
        return
      }
      router.push('/dashboard')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-[380px] fadeup">
        <div className="flex items-center gap-2 justify-center mb-6">
          <span className="h-2 w-2 rounded-full bg-accent blink shadow-glow" />
          <span className="font-mono text-[14px] font-semibold tracking-wide text-ink">PERSONAL OS</span>
          <span className="font-mono text-[11px] text-ink-faint">// V1.0</span>
        </div>

        <div className="panel shadow-panel p-6">
          <div className="font-mono text-[10px] uppercase tracking-widest text-ink-faint mb-1">Authenticate</div>
          <h1 className="text-[18px] text-ink mb-5">Sign in to your OS</h1>

          {error && (
            <div className="mb-4 px-3 py-2 rounded-md border border-hot/30 bg-hot/10 text-hot text-[12px]">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="font-mono text-[9px] uppercase tracking-widest text-ink-faint">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@email.com"
                className="w-full px-3 py-2 text-[13px] mt-1"
              />
            </div>
            <div>
              <label className="font-mono text-[9px] uppercase tracking-widest text-ink-faint">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-3 py-2 text-[13px] mt-1"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 mt-2 rounded-md bg-accent/15 text-accent font-mono text-[12px] uppercase tracking-wider hover:bg-accent/25 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="spin" /> : <ArrowRight size={14} />}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-[12px] text-ink-faint mt-5">
            No account?{' '}
            <Link href="/auth/signup" className="text-accent hover:text-accent-bright transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

import { useState, type FormEvent } from 'react'
import { supabase, supabaseHost } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(
        /failed to fetch|networkerror|load failed/i.test(error.message)
          ? `Can't reach ${supabaseHost}. Check that VITE_SUPABASE_URL is your project URL (https://xxxx.supabase.co), the project isn't paused, and no VPN/ad-blocker is blocking supabase.co.`
          : error.message,
      )
    }
    setBusy(false)
  }

  return (
    <main className="center">
      <form className="card login" onSubmit={submit}>
        <h1>Trading Calendar</h1>
        <p className="muted">Private — sign in to continue.</p>
        <label>
          Email
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn primary" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  )
}

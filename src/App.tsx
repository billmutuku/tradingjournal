import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import Calendar from './components/Calendar'
import DayDialog from './components/DayDialog'
import ImportDialog from './components/ImportDialog'
import Login from './components/Login'
import StatCards from './components/StatCards'
import AccountSummary from './components/AccountSummary'
import { accountSummary, buildGrid, groupByDay, localToday, monthStats } from './lib/calendar'
import { parseMt5File, type ParsedReport } from './lib/parseMt5'
import { fetchAllNets, fetchLatestDay, fetchTrades, importTrades, supabase } from './lib/supabase'
import type { StoredTrade } from './lib/types'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!supabase) {
    return (
      <main className="center">
        <div className="card login">
          <h1>Setup needed</h1>
          <p className="muted">
            Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> (see <code>.env.example</code>),
            then restart.
          </p>
        </div>
      </main>
    )
  }
  if (!ready) return <main className="center muted">Loading…</main>
  if (!session) return <Login />
  return <Dashboard userId={session.user.id} email={session.user.email ?? ''} />
}

function Dashboard({ userId, email }: { userId: string; email: string }) {
  const now = new Date()
  const [{ year, month }, setMonth] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [trades, setTrades] = useState<StoredTrade[]>([])
  const [allNets, setAllNets] = useState<{ close_day: string; net: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [pending, setPending] = useState<{ name: string; report: ParsedReport } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const fileInput = useRef<HTMLInputElement>(null)

  const goToLatest = useCallback(async () => {
    try {
      const latest = await fetchLatestDay()
      const base = latest ?? localToday()
      setMonth({ year: Number(base.slice(0, 4)), month: Number(base.slice(5, 7)) - 1 })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load trades.')
    }
  }, [])

  // Open on the month of the most recent trade.
  useEffect(() => { void goToLatest() }, [goToLatest])

  useEffect(() => {
    let cancelled = false
    const { start, end } = buildGrid(year, month)
    setLoading(true)
    fetchTrades(start, end)
      .then((t) => { if (!cancelled) { setTrades(t); setError(null) } })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load trades.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [year, month, reloadKey])

  // All-time totals for the account summary (refreshed after every import).
  useEffect(() => {
    let cancelled = false
    fetchAllNets()
      .then((r) => { if (!cancelled) setAllNets(r) })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load account totals.') })
    return () => { cancelled = true }
  }, [reloadKey])

  const account = useMemo(() => accountSummary(allNets), [allNets])
  const days = useMemo(() => groupByDay(trades), [trades])
  const stats = useMemo(() => monthStats(days, year, month), [days, year, month])

  const shift = (delta: number) =>
    setMonth(({ year, month }) => {
      const d = new Date(year, month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })

  async function onFile(file: File | undefined) {
    if (!file) return
    setNotice(null)
    try {
      const report = parseMt5File(await file.arrayBuffer())
      setPending({ name: file.name, report })
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not read that file.')
    }
    if (fileInput.current) fileInput.current.value = ''
  }

  async function confirmImport() {
    if (!pending) return
    const { total, added } = await importTrades(pending.report.trades, userId)
    setPending(null)
    setNotice(`Imported ${total} trades — ${added} new, ${total - added} already stored.`)
    await goToLatest()
    setReloadKey((k) => k + 1)
  }

  const selectedAgg = selected ? days.get(selected) : undefined

  return (
    <div className="app">
      <header className="topbar">
        <h1>Calendar</h1>
        <div className="topbar-actions">
          <input
            ref={fileInput}
            type="file"
            accept=".xlsx"
            hidden
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
          <button className="btn primary" onClick={() => fileInput.current?.click()}>Import report</button>
          <button className="btn ghost" onClick={() => void supabase?.auth.signOut()} title={email}>Sign out</button>
        </div>
      </header>

      {notice && (
        <div className="banner" role="status">
          {notice}
          <button className="icon-btn" onClick={() => setNotice(null)} aria-label="Dismiss">×</button>
        </div>
      )}
      {error && <div className="banner bad" role="alert">{error}</div>}

      <AccountSummary summary={account} />

      <Calendar
        year={year}
        month={month}
        days={days}
        loading={loading}
        onPrev={() => shift(-1)}
        onNext={() => shift(1)}
        onToday={() => void goToLatest()}
        onSelect={setSelected}
      />
      <StatCards stats={stats} />

      {trades.length === 0 && !loading && !error && (
        <p className="muted hint">No trades in this view yet — use “Import report” to load your MT5 .xlsx history.</p>
      )}

      {selected && selectedAgg && (
        <DayDialog date={selected} agg={selectedAgg} onClose={() => setSelected(null)} />
      )}
      {pending && (
        <ImportDialog
          fileName={pending.name}
          report={pending.report}
          onCancel={() => setPending(null)}
          onConfirm={confirmImport}
        />
      )}
    </div>
  )
}

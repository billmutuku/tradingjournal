import type { StoredTrade } from './types'

export const CURRENCY = 'USD'

const pad = (n: number) => String(n).padStart(2, '0')
export const ymd = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`
const cents = (n: number) => Math.round(n * 100) / 100

export function localToday(): string {
  const d = new Date()
  return ymd(d.getFullYear(), d.getMonth(), d.getDate())
}

/** Add days to a 'YYYY-MM-DD' string without any timezone surprises. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d + days))
  return ymd(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate())
}

export interface Grid {
  /** 42 dates (6 weeks, Monday first) */
  dates: string[]
  start: string
  end: string
}

export function buildGrid(year: number, month: number): Grid {
  const firstDow = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7 // Monday = 0
  const start = addDays(ymd(year, month, 1), -firstDow)
  const dates = Array.from({ length: 42 }, (_, i) => addDays(start, i))
  return { dates, start, end: dates[41] }
}

export interface DayAgg {
  net: number
  count: number
  trades: StoredTrade[]
}

export function groupByDay(trades: StoredTrade[]): Map<string, DayAgg> {
  const map = new Map<string, DayAgg>()
  for (const t of trades) {
    const agg = map.get(t.close_day) ?? { net: 0, count: 0, trades: [] }
    agg.net = cents(agg.net + Number(t.net))
    agg.count += 1
    agg.trades.push(t)
    map.set(t.close_day, agg)
  }
  return map
}

export interface MonthStats {
  total: number
  count: number
  tradingDays: number
  avgDaily: number
  avgWin: number
  avgLoss: number
  winRate: number | null
  wins: number
  losses: number
}

export function monthStats(days: Map<string, DayAgg>, year: number, month: number): MonthStats {
  const prefix = `${year}-${pad(month + 1)}-`
  let total = 0, count = 0, tradingDays = 0, winSum = 0, wins = 0, lossSum = 0, losses = 0
  for (const [date, agg] of days) {
    if (!date.startsWith(prefix)) continue
    tradingDays++
    total += agg.net
    for (const t of agg.trades) {
      const n = Number(t.net)
      count++
      if (n > 0) { wins++; winSum += n }
      else if (n < 0) { losses++; lossSum += n }
    }
  }
  return {
    total: cents(total),
    count,
    tradingDays,
    avgDaily: tradingDays ? cents(total / tradingDays) : 0,
    avgWin: wins ? cents(winSum / wins) : 0,
    avgLoss: losses ? cents(lossSum / losses) : 0,
    winRate: count ? wins / count : null,
    wins,
    losses,
  }
}

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: CURRENCY })
// Phone tiles: whole dollars below 1,000 ("-$38"), "$1.2K" above. Exact cents are in the day dialog.
const moneyWhole = new Intl.NumberFormat('en-US', { style: 'currency', currency: CURRENCY, maximumFractionDigits: 0 })
const moneyCompact = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: CURRENCY,
  notation: 'compact',
  maximumFractionDigits: 1,
})

export const formatMoney = (n: number) => money.format(cents(n) || 0) // `|| 0` avoids "-$0.00"
export const formatMoneyCompact = (n: number) =>
  Math.abs(n) < 1000 ? moneyWhole.format(Math.round(n) || 0) : moneyCompact.format(cents(n))

export const sign = (n: number): 'pos' | 'neg' | 'zero' => {
  const c = cents(n)
  return c > 0 ? 'pos' : c < 0 ? 'neg' : 'zero'
}

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function longDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  })
}

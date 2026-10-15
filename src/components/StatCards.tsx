import { formatMoney, sign, type MonthStats } from '../lib/calendar'

export default function StatCards({ stats }: { stats: MonthStats }) {
  const cards: { label: string; value: string; tone: 'pos' | 'neg' | 'zero' | 'info' }[] = [
    { label: 'Avg Daily Profit/Loss', value: formatMoney(stats.avgDaily), tone: sign(stats.avgDaily) },
    { label: 'Total Monthly Profit/Loss', value: formatMoney(stats.total), tone: sign(stats.total) },
    { label: 'Avg Winning Trade', value: formatMoney(stats.avgWin), tone: stats.wins ? 'pos' : 'zero' },
    { label: 'Avg Losing Trade', value: formatMoney(stats.avgLoss), tone: stats.losses ? 'neg' : 'zero' },
    {
      label: 'Win Rate',
      value: stats.winRate === null ? '—' : `${(stats.winRate * 100).toFixed(1)}%`,
      tone: 'info',
    },
    { label: 'Trades', value: String(stats.count), tone: 'info' },
  ]
  return (
    <section className="stats" aria-label="Monthly statistics">
      {cards.map((c) => (
        <div key={c.label} className={`stat ${c.tone}`}>
          <span className="stat-label">{c.label}</span>
          <span className="stat-value">{c.value}</span>
        </div>
      ))}
    </section>
  )
}

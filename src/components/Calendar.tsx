import {
  MONTH_NAMES, buildGrid, formatMoney, formatMoneyCompact, localToday, sign,
  type DayAgg,
} from '../lib/calendar'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface Props {
  year: number
  month: number
  days: Map<string, DayAgg>
  loading: boolean
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onSelect: (date: string) => void
}

export default function Calendar({ year, month, days, loading, onPrev, onNext, onToday, onSelect }: Props) {
  const grid = buildGrid(year, month)
  const today = localToday()
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`

  return (
    <section className="card calendar" aria-busy={loading}>
      <header className="cal-head">
        <button className="icon-btn" onClick={onPrev} aria-label="Previous month">‹</button>
        <h2>
          {MONTH_NAMES[month]} <span className="year">{year}</span>
        </h2>
        <button className="icon-btn" onClick={onNext} aria-label="Next month">›</button>
        <button className="btn ghost small today-btn" onClick={onToday}>Latest</button>
      </header>

      <div className="grid weekdays" aria-hidden="true">
        {WEEKDAYS.map((d) => <div key={d}>{d}</div>)}
      </div>

      <div className={`grid days${loading ? ' loading' : ''}`}>
        {grid.dates.map((date) => {
          const inMonth = date.startsWith(prefix)
          const agg = days.get(date)
          const tone = agg ? sign(agg.net) : 'none'
          const dayNum = Number(date.slice(8))
          const cls = ['day', inMonth ? `t-${tone}` : 'outside', date === today ? 'today' : ''].join(' ')
          const label = agg
            ? `${date}: ${formatMoney(agg.net)}, ${agg.count} trade${agg.count === 1 ? '' : 's'}`
            : `${date}: no trades`

          const body = agg ? (
            <>
              <span className="amount">
                <span className="full">{formatMoney(agg.net)}</span>
                <span className="compact">{formatMoneyCompact(agg.net)}</span>
              </span>
              <span className="count">
                {agg.count}<span className="trades-word"> trade{agg.count === 1 ? '' : 's'}</span>
              </span>
            </>
          ) : inMonth ? (
            <span className="none">
              <span className="full">No Trades</span>
              <span className="compact">–</span>
            </span>
          ) : null

          return agg ? (
            <button key={date} className={cls} onClick={() => onSelect(date)} aria-label={label}>
              <span className="num">{dayNum}</span>
              {body}
            </button>
          ) : (
            <div key={date} className={cls} aria-label={label}>
              <span className="num">{dayNum}</span>
              {body}
            </div>
          )
        })}
      </div>
    </section>
  )
}

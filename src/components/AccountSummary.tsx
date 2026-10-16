import { formatMoney, sign, type AccountSummary as Summary } from '../lib/calendar'

const W = 300
const H = 64
const PAD = 4

function Sparkline({ series, tone }: { series: number[]; tone: 'pos' | 'neg' | 'zero' }) {
  if (series.length < 2) return null
  const min = Math.min(...series)
  const max = Math.max(...series)
  const span = max - min || 1
  const x = (i: number) => (i / (series.length - 1)) * W
  const y = (v: number) => PAD + (1 - (v - min) / span) * (H - PAD * 2)
  const pts = series.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const zeroInRange = min < 0 && max > 0
  return (
    <svg className={`spark ${tone}`} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Cumulative profit and loss over time">
      {zeroInRange && <line x1="0" x2={W} y1={y(0)} y2={y(0)} className="spark-zero" vectorEffect="non-scaling-stroke" />}
      <polyline points={pts} className="spark-line" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

export default function AccountSummary({ summary }: { summary: Summary }) {
  const tone = sign(summary.total)
  return (
    <section className="card account" aria-label="Account summary">
      <div className="account-main">
        <span className="stat-label">Account total P/L · all time</span>
        <strong className={`account-total ${tone}`}>{formatMoney(summary.total)}</strong>
        <span className="muted account-sub">
          {summary.count} trade{summary.count === 1 ? '' : 's'}
          {summary.since ? ` · since ${summary.since}` : ''}
        </span>
      </div>
      <Sparkline series={summary.series} tone={tone} />
    </section>
  )
}

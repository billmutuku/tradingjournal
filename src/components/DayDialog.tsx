import { formatMoney, longDate, sign, type DayAgg } from '../lib/calendar'
import Modal from './Modal'

export default function DayDialog({ date, agg, onClose }: { date: string; agg: DayAgg; onClose: () => void }) {
  const wins = agg.trades.filter((t) => Number(t.net) > 0).length
  const losses = agg.trades.filter((t) => Number(t.net) < 0).length
  return (
    <Modal title={longDate(date)} onClose={onClose}>
      <div className="day-summary">
        <strong className={`big ${sign(agg.net)}`}>{formatMoney(agg.net)}</strong>
        <span className="muted">
          {agg.count} trade{agg.count === 1 ? '' : 's'} · {wins} won · {losses} lost
        </span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Closed</th><th>Symbol</th><th>Side</th><th className="r">Lots</th><th className="r">Net</th></tr>
          </thead>
          <tbody>
            {agg.trades.map((t) => (
              <tr key={t.position_id}>
                <td>{t.close_time.slice(11, 16)}</td>
                <td>{t.symbol}</td>
                <td><span className={`pill ${t.side}`}>{t.side}</span></td>
                <td className="r">{Number(t.volume)}</td>
                <td className={`r ${sign(Number(t.net))}`}>{formatMoney(Number(t.net))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small-note">Times are broker server time, as in your MT5 report.</p>
    </Modal>
  )
}

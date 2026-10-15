import { useState } from 'react'
import { formatMoney, sign } from '../lib/calendar'
import type { ParsedReport } from '../lib/parseMt5'
import Modal from './Modal'

interface Props {
  fileName: string
  report: ParsedReport
  onCancel: () => void
  onConfirm: () => Promise<void>
}

export default function ImportDialog({ fileName, report, onCancel, onConfirm }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { trades } = report
  const net = trades.reduce((s, t) => s + t.profit + t.commission + t.swap, 0)

  async function go() {
    setBusy(true)
    setError(null)
    try {
      await onConfirm()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed.')
      setBusy(false)
    }
  }

  return (
    <Modal title="Import report" onClose={busy ? () => {} : onCancel}>
      <dl className="facts">
        <dt>File</dt><dd>{fileName}</dd>
        {report.account && (<><dt>Account</dt><dd>{report.account}</dd></>)}
        <dt>Closed trades</dt><dd>{trades.length}</dd>
        <dt>Period</dt>
        <dd>{trades[0].close_time.slice(0, 10)} → {trades[trades.length - 1].close_time.slice(0, 10)}</dd>
        <dt>Net result</dt><dd className={sign(net)}>{formatMoney(net)}</dd>
      </dl>
      <p className="muted small-note">
        Trades you have already imported are matched by position ID and updated, never duplicated.
        Balance operations (deposits/withdrawals) are ignored.
      </p>
      {error && <p className="error">{error}</p>}
      <div className="actions">
        <button className="btn ghost" onClick={onCancel} disabled={busy}>Cancel</button>
        <button className="btn primary" onClick={go} disabled={busy}>
          {busy ? 'Importing…' : `Import ${trades.length} trades`}
        </button>
      </div>
    </Modal>
  )
}

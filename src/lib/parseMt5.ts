import { readFirstSheet, type Cell, type Rows } from './xlsx'
import type { Trade } from './types'

export interface ParsedReport {
  trades: Trade[]
  account: string | null
  skipped: number
}

const DATE_RE = /^(\d{4})\.(\d{2})\.(\d{2}) (\d{2}:\d{2}:\d{2})$/

/** '2026.02.16 08:43:55' -> '2026-02-16 08:43:55' (or null if not a MT5 timestamp) */
function toTimestamp(v: Cell): string | null {
  if (typeof v !== 'string') return null
  const m = DATE_RE.exec(v.trim())
  return m ? `${m[1]}-${m[2]}-${m[3]} ${m[4]}` : null
}

function num(v: Cell): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string') {
    const n = Number(v.replace(/[\s ]/g, ''))
    return v.trim() !== '' && Number.isFinite(n) ? n : null
  }
  return null
}

/**
 * Extracts closed positions from the "Positions" section of an MT5 history report.
 *
 * A positions row is recognised by its shape rather than by (localised) headings:
 *   A open time | B position id | C symbol | D buy/sell | E volume | F open price | G S/L | H T/P
 *   I close time | J close price | K commission | L swap | M profit
 * Rows of the "Orders" and "Deals" sections do not have a timestamp in column I together
 * with a numeric profit in column M, so they are ignored.
 */
export function parseMt5Rows(rows: Rows): ParsedReport {
  const byId = new Map<number, Trade>()
  let skipped = 0

  for (const r of rows) {
    const side = typeof r[3] === 'string' ? r[3].trim().toLowerCase() : ''
    if (side !== 'buy' && side !== 'sell') continue
    const open = toTimestamp(r[0])
    const close = toTimestamp(r[8])
    if (!open || !close || num(r[12]) === null) continue

    const id = num(r[1])
    const volume = num(r[4])
    const profit = num(r[12])
    if (id === null || volume === null || profit === null || typeof r[2] !== 'string') {
      skipped++
      continue
    }

    byId.set(id, {
      position_id: id,
      symbol: r[2].trim(),
      side,
      volume,
      open_time: open,
      close_time: close,
      open_price: num(r[5]),
      close_price: num(r[9]),
      sl: num(r[6]),
      tp: num(r[7]),
      commission: num(r[10]) ?? 0,
      swap: num(r[11]) ?? 0,
      profit,
    })
  }

  let account: string | null = null
  for (const r of rows.slice(0, 10)) {
    const hit = r.find((c) => typeof c === 'string' && /^\d{4,}\s*\(/.test(c))
    if (typeof hit === 'string') { account = hit; break }
  }

  const trades = [...byId.values()].sort((a, b) => a.close_time.localeCompare(b.close_time))
  return { trades, account, skipped }
}

export function parseMt5File(data: ArrayBuffer | Uint8Array): ParsedReport {
  const result = parseMt5Rows(readFirstSheet(data))
  if (result.trades.length === 0) {
    throw new Error(
      'No closed positions found. In MT5 open the History tab, right-click → Report → "Open XML (MS Office Excel 2007)", and import that file.',
    )
  }
  return result
}

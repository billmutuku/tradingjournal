import { describe, expect, it } from 'vitest'
import { parseMt5Rows } from './parseMt5'
import { buildGrid, groupByDay, monthStats } from './calendar'
import type { StoredTrade } from './types'

const position = (id: number, profit: number, close = '2026.02.16 08:44:35') =>
  ['2026.02.16 08:43:55', id, 'XAUUSDr', 'buy', '0.01', 4997.88, null, null, close, 5000.35, 0, 0, profit, null, null]

describe('parseMt5Rows', () => {
  const rows = [
    ['Trade History Report'],
    ['Account:', null, null, '54768296 (USD, HFMarketsKE-Live2, real, Hedge)'],
    ['Positions'],
    ['Time', 'Position', 'Symbol', 'Type', 'Volume', 'Price', 'S / L', 'T / P', 'Time', 'Price', 'Commission', 'Swap', 'Profit'],
    position(1, 2.47),
    position(2, -13.27, '2026.02.17 15:07:48'),
    position(1, 2.47), // duplicate id inside one file
    ['Orders'],
    ['2026.02.16 08:43:55', 11, 'XAUUSDr', 'buy', '0.01 / 0.01', 'market', null, null, '2026.02.16 08:43:55', 'filled'],
    ['Deals'],
    ['2026.02.16 08:43:55', 12, 'XAUUSDr', 'buy', 'in', '0.01', 4997.88, 11, 0, 0, 0, 0, 150],
    ['2026.02.13 16:23:14', 13, null, 'balance', null, null, null, null, 0, 0, 0, 150, 150],
  ]
  const r = parseMt5Rows(rows)

  it('keeps only closed positions and de-duplicates by id', () => {
    expect(r.trades.map((t) => t.position_id)).toEqual([1, 2])
  })
  it('converts timestamps and numbers', () => {
    expect(r.trades[0]).toMatchObject({ close_time: '2026-02-16 08:44:35', volume: 0.01, profit: 2.47, sl: null })
  })
  it('reads the account line', () => {
    expect(r.account).toBe('54768296 (USD, HFMarketsKE-Live2, real, Hedge)')
  })
})

describe('calendar helpers', () => {
  it('builds a Monday-first 6-week grid', () => {
    const g = buildGrid(2026, 1) // Feb 2026 starts on a Sunday
    expect(g.dates).toHaveLength(42)
    expect(g.start).toBe('2026-01-26')
    expect(g.dates[6]).toBe('2026-02-01')
    expect(g.end).toBe('2026-03-08')
  })
  it('aggregates by day and month', () => {
    const t = (id: number, day: string, net: number) => ({ position_id: id, close_day: day, net }) as StoredTrade
    const days = groupByDay([t(1, '2026-02-02', 10), t(2, '2026-02-02', -4), t(3, '2026-02-03', -6), t(4, '2026-03-01', 99)])
    expect(days.get('2026-02-02')).toMatchObject({ net: 6, count: 2 })
    const s = monthStats(days, 2026, 1)
    expect(s).toMatchObject({ total: 0, count: 3, tradingDays: 2, avgWin: 10, avgLoss: -5 })
    expect(s.winRate).toBeCloseTo(1 / 3)
  })
})

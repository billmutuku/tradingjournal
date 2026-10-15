export interface Trade {
  position_id: number
  symbol: string
  side: 'buy' | 'sell'
  volume: number
  /** Broker server time, 'YYYY-MM-DD HH:MM:SS' (no timezone, exactly as in the MT5 report) */
  open_time: string
  close_time: string
  open_price: number | null
  close_price: number | null
  sl: number | null
  tp: number | null
  commission: number
  swap: number
  profit: number
}

/** Trade as stored in / read from Supabase (net and close_day are generated columns). */
export interface StoredTrade extends Trade {
  net: number
  close_day: string // 'YYYY-MM-DD'
}

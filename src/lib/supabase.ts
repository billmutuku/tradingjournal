import { createClient } from '@supabase/supabase-js'
import type { StoredTrade, Trade } from './types'

// Tolerate common copy/paste slips: stray quotes/spaces, trailing slash, or a pasted "/rest/v1" endpoint.
const unquote = (v?: string) => v?.trim().replace(/^["']|["']$/g, '').trim()
const url = unquote(import.meta.env.VITE_SUPABASE_URL as string | undefined)
  ?.replace(/\/(rest|auth)\/v1.*$/, '')
  .replace(/\/+$/, '')
const key = unquote(import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)

export const supabase = url && key ? createClient(url, key) : null
/** Shown on the login screen so a wrong project URL is obvious. */
export const supabaseHost = url ? url.replace(/^https?:\/\//, '') : ''

function client() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

export async function fetchTrades(from: string, to: string): Promise<StoredTrade[]> {
  const { data, error } = await client()
    .from('trades')
    .select('*')
    .gte('close_day', from)
    .lte('close_day', to)
    .order('close_time', { ascending: true })
    .limit(5000)
  if (error) throw error
  return (data ?? []) as StoredTrade[]
}

/** Every trade's day and net result (two small columns), paged past the 1000-row API limit. */
export async function fetchAllNets(): Promise<{ close_day: string; net: number }[]> {
  const out: { close_day: string; net: number }[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client()
      .from('trades')
      .select('close_day, net')
      .order('close_day', { ascending: true })
      .order('position_id', { ascending: true })
      .range(from, from + 999)
    if (error) throw error
    for (const r of data ?? []) out.push({ close_day: r.close_day as string, net: Number(r.net) })
    if (!data || data.length < 1000) break
  }
  return out
}

/** Date ('YYYY-MM-DD') of the most recent closed trade, or null if nothing is stored yet. */
export async function fetchLatestDay(): Promise<string | null> {
  const { data, error } = await client()
    .from('trades')
    .select('close_day')
    .order('close_day', { ascending: false })
    .limit(1)
  if (error) throw error
  return data?.[0]?.close_day ?? null
}

async function countTrades(): Promise<number> {
  const { count, error } = await client().from('trades').select('position_id', { count: 'exact', head: true })
  if (error) throw error
  return count ?? 0
}

/** Upsert by position id, so re-importing an overlapping report never creates duplicates. */
export async function importTrades(trades: Trade[], userId: string) {
  const before = await countTrades()
  for (let i = 0; i < trades.length; i += 200) {
    const chunk = trades.slice(i, i + 200).map((t) => ({ ...t, user_id: userId }))
    const { error } = await client().from('trades').upsert(chunk, { onConflict: 'user_id,position_id' })
    if (error) throw error
  }
  const after = await countTrades()
  return { total: trades.length, added: after - before }
}

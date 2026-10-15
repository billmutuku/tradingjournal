-- Run this once in Supabase → SQL Editor.

create table if not exists public.trades (
  user_id      uuid    not null default auth.uid() references auth.users (id) on delete cascade,
  position_id  bigint  not null,
  symbol       text    not null,
  side         text    not null check (side in ('buy', 'sell')),
  volume       numeric not null,
  -- Broker server time exactly as printed in the MT5 report (no timezone conversion).
  open_time    timestamp not null,
  close_time   timestamp not null,
  open_price   numeric,
  close_price  numeric,
  sl           numeric,
  tp           numeric,
  commission   numeric not null default 0,
  swap         numeric not null default 0,
  profit       numeric not null default 0,
  net          numeric generated always as (profit + commission + swap) stored,
  close_day    date    generated always as (close_time::date) stored,
  primary key (user_id, position_id)
);

create index if not exists trades_user_day_idx on public.trades (user_id, close_day);

-- Row Level Security: you can only ever see and change your own rows.
alter table public.trades enable row level security;

create policy "own trades: select" on public.trades for select to authenticated using (auth.uid() = user_id);
create policy "own trades: insert" on public.trades for insert to authenticated with check (auth.uid() = user_id);
create policy "own trades: update" on public.trades for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own trades: delete" on public.trades for delete to authenticated using (auth.uid() = user_id);

# Trading Calendar

A private, lightweight web app that imports your MetaTrader 5 history report (`.xlsx`) and shows
daily results on a monthly calendar: green = profit, red = loss, grey = no trades / break-even.

Stack: Vite + React + TypeScript · Supabase (Postgres + Auth) · hosted on Vercel (free tiers).
There is no server code — the browser talks to Supabase directly and Row Level Security keeps the data yours.

## 1. Supabase (≈5 min)

1. Create a project at supabase.com.
2. **SQL Editor** → paste and run `supabase/schema.sql`.
3. **Authentication → Users → Add user → Create new user** with your email + a strong password
   (tick *Auto Confirm User*).
4. **Authentication → Sign In / Providers → Email** → turn **off** *Allow new users to sign up*
   (so nobody else can ever create an account).
5. **Project Settings → API**: copy the *Project URL* and the *anon / publishable* key.

## 2. Run locally

```bash
cp .env.example .env     # paste the two values from step 1.5
npm install
npm run dev
```

## 3. Deploy to Vercel

1. Push this folder to a **private** GitHub repo (`.env` and `*.xlsx` are git-ignored).
2. Vercel → *Add New → Project* → import the repo (Vite is auto-detected).
3. Add the environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then deploy.

## Importing from MT5

MT5 → **History** tab → right-click → **Report → Open XML (MS Office Excel 2007)** → save → click
**Import report** in the app. Re-importing overlapping reports is safe: trades are matched by position ID.

## How the numbers are computed

* Only the **Positions** section is read (closed trades). Deposits/withdrawals are ignored.
* A trade's result = profit + commission + swap, assigned to the day it **closed**.
* Days follow the **broker server time** printed in the report (no timezone shifting), which is how MT5 itself groups days.
* Avg Daily = month total ÷ days that had trades. Avg Win / Avg Loss = per trade.

## Notes

* `npm test` runs the parser/calendar tests; `npm run build` type-checks and builds.
* MT5 writes its xlsx XML in UTF-16, which common xlsx libraries reject — that is why `src/lib/xlsx.ts` is a small custom reader.

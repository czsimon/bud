# Bud

Household cash forecast: a running balance chart on top, a table of income, budgets, and one-off events below. Recurring items (salaries, rent, custom budgets) and one-time hits (vacation, bonus) all feed the same projection. Data lives in [Supabase](https://supabase.com).

## Run it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). With no env vars, the app uses a **local preview** saved in the browser so you can try the forecast immediately.

## Connect Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Copy `.env.example` to `.env.local` and fill in the project URL and anon (publishable) key from **Project Settings → API**.
3. In the Supabase SQL editor, run `supabase/schema.sql`. That creates `profiles` and `events`, a signup trigger, and row-level security so each user only sees their own household.
4. Under **Authentication → Providers**, keep Email enabled. For local testing you can turn off **Confirm email**.
5. Restart `npm run dev`, open `/login`, and create an account.

Events store a positive amount plus direction (`in` / `out`), either `recurring` or `one_off`, a cadence, start date, optional end date, and who the line belongs to (you, partner, or shared). The chart starts from **cash on hand today** and only applies dates from today forward — past paychecks are assumed to already sit in that starting balance.

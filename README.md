# Bud

Household cash forecast: a running balance chart on top, a table of income, budgets, and one-off events below. Recurring items (salaries, rent, custom budgets) and one-time hits (vacation, bonus) all feed the same projection. Data lives in [Supabase](https://supabase.com).

## Run it

```bash
npm install
npm run dev
```

## Configure Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Copy `.env.example` to `.env.local` and fill in the project URL and anon (publishable) key from **Project Settings → API**. These values are required.
3. Apply the migrations with `npx supabase db push`. They create `profiles`, `events`, and `categories`, plus the signup trigger and row-level security.
4. Under **Authentication → Providers**, keep Email enabled. For local testing you can turn off **Confirm email**.
5. Restart `npm run dev`, open `/login`, and create an account.

Open [http://localhost:3000](http://localhost:3000). Unauthenticated visitors are redirected to `/login`; all profiles, events, and categories are stored in Supabase.

Events store a positive amount plus direction (`in` / `out`), either `recurring` or `one_off`, a cadence, start date, optional end date, who the line belongs to, and an optional expense category. Manage the category list on the dashboard; new households get Home, Baby, Food, Transport, Health, Fun, and Travel as a starting set. The chart starts from **cash on hand today** and only applies dates from today forward — past paychecks are assumed to already sit in that starting balance.

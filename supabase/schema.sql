-- Run this in the Supabase SQL editor after creating a project.
-- Dashboard → SQL → New query → paste → Run.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  starting_balance numeric(14, 2) not null default 0,
  currency text not null default 'USD',
  horizon_months integer not null default 12,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  type text not null default 'bank' check (
    type in ('bank', 'cash', 'investment', 'credit', 'other')
  ),
  balance numeric(14, 2) not null default 0,
  balance_date date not null default current_date,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accounts_name_not_blank check (char_length(trim(name)) > 0),
  constraint accounts_user_name_unique unique (user_id, name)
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  amount numeric(14, 2) not null,
  flow text not null check (flow in ('in', 'out')),
  kind text not null check (kind in ('recurring', 'one_off', 'balance')),
  cadence text check (
    cadence in (
      'weekly',
      'biweekly',
      'semimonthly',
      'monthly',
      'quarterly',
      'yearly'
    )
  ),
  start_date date not null,
  end_date date,
  notes text,
  category_id uuid,
  line_items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_amount_valid check (
    kind = 'balance' or amount > 0
  ),
  constraint events_recurring_needs_cadence check (
    (kind in ('one_off', 'balance') and cadence is null)
    or (kind = 'recurring' and cadence is not null)
  ),
  constraint events_end_after_start check (
    end_date is null or end_date >= start_date
  ),
  constraint events_line_items_is_array check (
    jsonb_typeof(line_items) = 'array'
  )
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  color text not null default 'slate',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_name_not_blank check (char_length(trim(name)) > 0),
  constraint categories_color_known check (
    color in (
      'moss', 'pine', 'sea', 'blue', 'indigo', 'violet', 'plum',
      'magenta', 'crimson', 'rust', 'amber', 'olive', 'stone', 'slate'
    )
  ),
  constraint categories_user_name_unique unique (user_id, name)
);

alter table public.events
  drop constraint if exists events_category_id_fkey;

alter table public.events
  add constraint events_category_id_fkey
  foreign key (category_id) references public.categories (id) on delete set null;

create index if not exists events_user_id_idx on public.events (user_id);
create index if not exists events_user_start_idx on public.events (user_id, start_date);
create index if not exists events_category_id_idx on public.events (category_id);
create index if not exists categories_user_id_idx on public.categories (user_id, position);
create index if not exists accounts_user_id_idx on public.accounts (user_id, position, name);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists events_touch_updated_at on public.events;
create trigger events_touch_updated_at
before update on public.events
for each row execute function public.touch_updated_at();

drop trigger if exists accounts_touch_updated_at on public.accounts;
create trigger accounts_touch_updated_at
before update on public.accounts
for each row execute function public.touch_updated_at();

drop trigger if exists categories_touch_updated_at on public.categories;
create trigger categories_touch_updated_at
before update on public.categories
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      split_part(new.email, '@', 1)
    )
  );
  insert into public.accounts (user_id, name, type, balance, position)
  values (new.id, 'Main account', 'bank', 0, 0);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

revoke execute on function public.handle_new_user() from public, anon, authenticated;

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.categories enable row level security;
alter table public.accounts enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
with check (auth.uid() = id);

drop policy if exists "events_select_own" on public.events;
create policy "events_select_own"
on public.events for select
using (auth.uid() = user_id);

drop policy if exists "events_insert_own" on public.events;
create policy "events_insert_own"
on public.events for insert
with check ((select auth.uid()) = user_id);

drop policy if exists "events_update_own" on public.events;
create policy "events_update_own"
on public.events for update
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "events_delete_own" on public.events;
create policy "events_delete_own"
on public.events for delete
using (auth.uid() = user_id);

drop policy if exists "categories_select_own" on public.categories;
create policy "categories_select_own"
on public.categories for select
using (auth.uid() = user_id);

drop policy if exists "categories_insert_own" on public.categories;
create policy "categories_insert_own"
on public.categories for insert
with check (auth.uid() = user_id);

drop policy if exists "categories_update_own" on public.categories;
create policy "categories_update_own"
on public.categories for update
using (auth.uid() = user_id);

drop policy if exists "categories_delete_own" on public.categories;
create policy "categories_delete_own"
on public.categories for delete
using (auth.uid() = user_id);

drop policy if exists "accounts_select_own" on public.accounts;
create policy "accounts_select_own"
on public.accounts for select
using ((select auth.uid()) = user_id);

drop policy if exists "accounts_insert_own" on public.accounts;
create policy "accounts_insert_own"
on public.accounts for insert
with check ((select auth.uid()) = user_id);

drop policy if exists "accounts_update_own" on public.accounts;
create policy "accounts_update_own"
on public.accounts for update
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "accounts_delete_own" on public.accounts;
create policy "accounts_delete_own"
on public.accounts for delete
using ((select auth.uid()) = user_id);

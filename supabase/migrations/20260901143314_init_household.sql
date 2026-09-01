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

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  amount numeric(14, 2) not null check (amount > 0),
  flow text not null check (flow in ('in', 'out')),
  kind text not null check (kind in ('recurring', 'one_off')),
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
  person text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_recurring_needs_cadence check (
    (kind = 'one_off' and cadence is null)
    or (kind = 'recurring' and cadence is not null)
  ),
  constraint events_end_after_start check (
    end_date is null or end_date >= start_date
  )
);

create index if not exists events_user_id_idx on public.events (user_id);
create index if not exists events_user_start_idx on public.events (user_id, start_date);

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
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.events enable row level security;

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
with check (auth.uid() = user_id);

drop policy if exists "events_update_own" on public.events;
create policy "events_update_own"
on public.events for update
using (auth.uid() = user_id);

drop policy if exists "events_delete_own" on public.events;
create policy "events_delete_own"
on public.events for delete
using (auth.uid() = user_id);

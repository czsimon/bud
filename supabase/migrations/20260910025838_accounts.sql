-- User-owned accounts and account assignment for every budget/event line.
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  type text not null default 'bank' check (
    type in ('bank', 'cash', 'investment', 'credit', 'other')
  ),
  balance numeric(14, 2) not null default 0,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accounts_name_not_blank check (char_length(trim(name)) > 0),
  constraint accounts_user_name_unique unique (user_id, name)
);

create index accounts_user_id_idx
on public.accounts (user_id, position, name);

create trigger accounts_touch_updated_at
before update on public.accounts
for each row execute function public.touch_updated_at();

alter table public.accounts enable row level security;

create policy "accounts_select_own"
on public.accounts for select
using (auth.uid() = user_id);

create policy "accounts_insert_own"
on public.accounts for insert
with check (auth.uid() = user_id);

create policy "accounts_update_own"
on public.accounts for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "accounts_delete_own"
on public.accounts for delete
using (auth.uid() = user_id);

-- Preserve each user's existing cash-on-hand as their first account.
insert into public.accounts (user_id, name, type, balance, position)
select id, 'Main account', 'bank', starting_balance, 0
from public.profiles
on conflict (user_id, name) do nothing;

alter table public.events add column account_id uuid;

update public.events as event
set account_id = (
  select account.id
  from public.accounts as account
  where account.user_id = event.user_id
  order by account.position, account.created_at
  limit 1
);

alter table public.events
  alter column account_id set not null,
  add constraint events_account_id_fkey
    foreign key (account_id) references public.accounts (id) on delete restrict;

create index events_account_id_idx on public.events (account_id);

-- An event may only reference an account owned by the same signed-in user.
drop policy if exists "events_insert_own" on public.events;
create policy "events_insert_own"
on public.events for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.accounts
    where accounts.id = account_id and accounts.user_id = auth.uid()
  )
);

drop policy if exists "events_update_own" on public.events;
create policy "events_update_own"
on public.events for update
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.accounts
    where accounts.id = account_id and accounts.user_id = auth.uid()
  )
);

-- New users receive a usable account alongside their profile and categories.
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
  perform public.seed_default_categories(new.id);
  return new;
end;
$$;

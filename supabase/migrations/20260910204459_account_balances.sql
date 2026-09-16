-- Known account balances can be recorded on multiple dates.
create table public.account_balances (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  as_of date not null,
  amount numeric(14, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_balances_account_date_unique unique (account_id, as_of)
);

create index account_balances_account_id_idx
on public.account_balances (account_id, as_of desc);

create trigger account_balances_touch_updated_at
before update on public.account_balances
for each row execute function public.touch_updated_at();

alter table public.account_balances enable row level security;

create policy "account_balances_select_own"
on public.account_balances for select
using (
  exists (
    select 1 from public.accounts
    where accounts.id = account_balances.account_id
      and accounts.user_id = (select auth.uid())
  )
);

create policy "account_balances_insert_own"
on public.account_balances for insert
with check (
  exists (
    select 1 from public.accounts
    where accounts.id = account_balances.account_id
      and accounts.user_id = (select auth.uid())
  )
);

create policy "account_balances_update_own"
on public.account_balances for update
using (
  exists (
    select 1 from public.accounts
    where accounts.id = account_balances.account_id
      and accounts.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.accounts
    where accounts.id = account_balances.account_id
      and accounts.user_id = (select auth.uid())
  )
);

create policy "account_balances_delete_own"
on public.account_balances for delete
using (
  exists (
    select 1 from public.accounts
    where accounts.id = account_balances.account_id
      and accounts.user_id = (select auth.uid())
  )
);

insert into public.account_balances (account_id, as_of, amount)
select id, balance_date, balance
from public.accounts;

alter table public.accounts drop column balance;
alter table public.accounts drop column balance_date;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_account_id uuid;
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      split_part(new.email, '@', 1)
    )
  );
  insert into public.accounts (user_id, name, type, position)
  values (new.id, 'Main account', 'bank', 0)
  returning id into new_account_id;
  insert into public.account_balances (account_id, as_of, amount)
  values (new_account_id, current_date, 0);
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

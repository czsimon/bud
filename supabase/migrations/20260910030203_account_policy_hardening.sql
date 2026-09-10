-- Cache auth.uid() once per statement and keep trigger-only code out of RPC.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

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

drop policy if exists "events_insert_own" on public.events;
create policy "events_insert_own"
on public.events for insert
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.accounts
    where accounts.id = account_id
      and accounts.user_id = (select auth.uid())
  )
);

drop policy if exists "events_update_own" on public.events;
create policy "events_update_own"
on public.events for update
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.accounts
    where accounts.id = account_id
      and accounts.user_id = (select auth.uid())
  )
);

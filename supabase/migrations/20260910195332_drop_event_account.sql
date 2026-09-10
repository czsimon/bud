-- Budget lines and events are household cash flow, not per-account ledgers.
drop policy if exists "events_insert_own" on public.events;
drop policy if exists "events_update_own" on public.events;

alter table public.events drop constraint if exists events_account_id_fkey;
drop index if exists public.events_account_id_idx;
alter table public.events drop column if exists account_id;

create policy "events_insert_own"
on public.events for insert
with check ((select auth.uid()) = user_id);

create policy "events_update_own"
on public.events for update
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- One-off snapshots: set an account's balance to a known amount on a date.
alter table public.events drop constraint if exists events_kind_check;
alter table public.events
  add constraint events_kind_check
  check (kind in ('recurring', 'one_off', 'balance'));

alter table public.events drop constraint if exists events_amount_check;
alter table public.events
  add constraint events_amount_valid
  check (kind = 'balance' or amount > 0);

alter table public.events drop constraint if exists events_recurring_needs_cadence;
alter table public.events
  add constraint events_recurring_needs_cadence check (
    (kind in ('one_off', 'balance') and cadence is null)
    or (kind = 'recurring' and cadence is not null)
  );

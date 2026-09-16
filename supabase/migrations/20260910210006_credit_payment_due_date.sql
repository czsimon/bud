-- Credit accounts can carry a statement due date used as a cash-flow event.
alter table public.accounts
  add column payment_due_date date;

alter table public.accounts
  add constraint accounts_payment_due_credit_only check (
    payment_due_date is null or type = 'credit'
  );

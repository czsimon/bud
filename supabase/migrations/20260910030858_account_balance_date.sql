-- Date from which an account's opening balance is known.
alter table public.accounts
  add column balance_date date not null default current_date;

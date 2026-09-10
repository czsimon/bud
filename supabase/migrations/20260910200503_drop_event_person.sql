-- Everything in the forecast is household-level, so events no longer track a person.
alter table public.events drop column if exists person;

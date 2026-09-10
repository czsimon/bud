-- Itemized costs on an event (Flight, Hotel, Food, …). Empty array = single amount.
alter table public.events
  add column if not exists line_items jsonb not null default '[]'::jsonb;

alter table public.events
  drop constraint if exists events_line_items_is_array;

alter table public.events
  add constraint events_line_items_is_array
  check (jsonb_typeof(line_items) = 'array');

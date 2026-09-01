-- Expense categories (user-managed) plus optional category on events.

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  color text not null default '#5c7069',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_name_not_blank check (char_length(trim(name)) > 0),
  constraint categories_user_name_unique unique (user_id, name)
);

create index if not exists categories_user_id_idx on public.categories (user_id, position);

drop trigger if exists categories_touch_updated_at on public.categories;
create trigger categories_touch_updated_at
before update on public.categories
for each row execute function public.touch_updated_at();

alter table public.events
  add column if not exists category_id uuid references public.categories (id) on delete set null;

create index if not exists events_category_id_idx on public.events (category_id);

alter table public.categories enable row level security;

drop policy if exists "categories_select_own" on public.categories;
create policy "categories_select_own"
on public.categories for select
using (auth.uid() = user_id);

drop policy if exists "categories_insert_own" on public.categories;
create policy "categories_insert_own"
on public.categories for insert
with check (auth.uid() = user_id);

drop policy if exists "categories_update_own" on public.categories;
create policy "categories_update_own"
on public.categories for update
using (auth.uid() = user_id);

drop policy if exists "categories_delete_own" on public.categories;
create policy "categories_delete_own"
on public.categories for delete
using (auth.uid() = user_id);

create or replace function public.seed_default_categories(for_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and auth.uid() <> for_user then
    raise exception 'not allowed';
  end if;
  insert into public.categories (user_id, name, color, position)
  values
    (for_user, 'Home', '#1f7a6e', 0),
    (for_user, 'Baby', '#be185d', 1),
    (for_user, 'Food', '#b45309', 2),
    (for_user, 'Transport', '#1d4ed8', 3),
    (for_user, 'Health', '#0f766e', 4),
    (for_user, 'Fun', '#7c3aed', 5),
    (for_user, 'Travel', '#c0562a', 6)
  on conflict (user_id, name) do nothing;
end;
$$;

grant execute on function public.seed_default_categories(uuid) to authenticated;

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
  perform public.seed_default_categories(new.id);
  return new;
end;
$$;

insert into public.categories (user_id, name, color, position)
select
  p.id,
  seed.name,
  seed.color,
  seed.position
from public.profiles p
cross join (
  values
    ('Home', '#1f7a6e', 0),
    ('Baby', '#be185d', 1),
    ('Food', '#b45309', 2),
    ('Transport', '#1d4ed8', 3),
    ('Health', '#0f766e', 4),
    ('Fun', '#7c3aed', 5),
    ('Travel', '#c0562a', 6)
) as seed(name, color, position)
on conflict (user_id, name) do nothing;

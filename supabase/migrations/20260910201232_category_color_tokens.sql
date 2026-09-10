-- Categories now store a palette name. The app maps it to a light or dark hex,
-- so a stored hex could only ever be right for one theme.
update public.categories
set color = case lower(color)
  when '#1f7a6e' then 'pine'
  when '#0f766e' then 'pine'
  when '#c0562a' then 'rust'
  when '#b45309' then 'amber'
  when '#7c3aed' then 'violet'
  when '#1d4ed8' then 'blue'
  when '#be185d' then 'magenta'
  when '#44403c' then 'stone'
  else 'slate'
end
where color like '#%';

alter table public.categories alter column color set default 'slate';

alter table public.categories
  drop constraint if exists categories_color_known;

alter table public.categories
  add constraint categories_color_known check (
    color in (
      'moss', 'pine', 'sea', 'blue', 'indigo', 'violet', 'plum',
      'magenta', 'crimson', 'rust', 'amber', 'olive', 'stone', 'slate'
    )
  );

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
    (for_user, 'Home', 'pine', 0),
    (for_user, 'Baby', 'magenta', 1),
    (for_user, 'Food', 'amber', 2),
    (for_user, 'Transport', 'blue', 3),
    (for_user, 'Health', 'sea', 4),
    (for_user, 'Fun', 'violet', 5),
    (for_user, 'Travel', 'rust', 6)
  on conflict (user_id, name) do nothing;
end;
$$;

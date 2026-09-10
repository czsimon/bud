-- Categories are user-created only. New households start with an empty list.
revoke execute on function public.seed_default_categories(uuid) from authenticated, anon, public;
drop function if exists public.seed_default_categories(uuid);

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
  insert into public.accounts (user_id, name, type, balance, position)
  values (new.id, 'Main account', 'bank', 0, 0);
  return new;
end;
$$;

-- Run this in the Supabase SQL Editor before testing the new signup form.
-- It does three things:
-- 1. Makes USATT IDs unique (ignoring case/extra spaces)
-- 2. Lets the public signup form check whether a USATT ID is available
-- 3. Updates the auth.users trigger so new signups populate the members table

create unique index if not exists members_usatt_id_unique_idx
on public.members (upper(btrim(usatt_id)))
where usatt_id is not null;

create or replace function public.check_usatt_id_available(candidate_usatt_id text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select not exists (
    select 1
    from public.members
    where upper(btrim(usatt_id)) = upper(btrim(candidate_usatt_id))
  );
$$;

grant execute on function public.check_usatt_id_available(text) to anon;
grant execute on function public.check_usatt_id_available(text) to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.members (
    id,
    email,
    first_name,
    last_name,
    phone,
    club_name,
    city,
    state,
    usatt_id,
    usatt_rating
  )
  values (
    new.id,
    new.email,
    nullif(trim(new.raw_user_meta_data ->> 'first_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'last_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'phone'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'club_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'city'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'state'), ''),
    upper(nullif(trim(new.raw_user_meta_data ->> 'usatt_id'), '')),
    nullif(trim(new.raw_user_meta_data ->> 'usatt_rating'), '')::integer
  );

  return new;
end;
$$;

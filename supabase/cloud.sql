-- Run this once in the Supabase SQL editor (after schema.sql).
-- Enables username login, friend lookup, and notices between accounts.

create or replace function public.email_for_login(p_id text)
returns text
language sql
security definer
set search_path = public
as $$
  select email
  from public.profiles
  where lower(username) = lower(trim(p_id))
     or lower(email) = lower(trim(p_id))
  limit 1;
$$;

create or replace function public.lookup_friend(p_username text)
returns table(id uuid, username text)
language sql
security definer
set search_path = public
as $$
  select p.id, p.username
  from public.profiles p
  where lower(p.username) = lower(trim(p_username))
  limit 1;
$$;

create or replace function public.profiles_for_ids(p_ids uuid[])
returns table(id uuid, username text)
language sql
security definer
set search_path = public
as $$
  select p.id, p.username
  from public.profiles p
  where p.id = any(p_ids);
$$;

grant execute on function public.email_for_login(text) to anon, authenticated;
grant execute on function public.lookup_friend(text) to authenticated, anon;
grant execute on function public.profiles_for_ids(uuid[]) to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, email)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'username', ''), split_part(new.email, '@', 1)),
    coalesce(new.email, '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop policy if exists "own notices" on public.notices;
drop policy if exists "read own notices" on public.notices;
drop policy if exists "update own notices" on public.notices;
drop policy if exists "send notices" on public.notices;
create policy "read own notices" on public.notices for select using (user_id = auth.uid());
create policy "update own notices" on public.notices for update using (user_id = auth.uid());
create policy "send notices" on public.notices for insert with check (
  user_id = auth.uid()
  or exists (
    select 1 from public.friendships f
    where (f.user_a = auth.uid() and f.user_b = user_id)
       or (f.user_b = auth.uid() and f.user_a = user_id)
  )
);

create unique index if not exists friendships_unordered_pair
  on public.friendships (least(user_a, user_b), greatest(user_a, user_b));

alter table public.creatures add column if not exists gender text not null default 'kiz';

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  delete from public.pairs where user_a = uid or user_b = uid;
  delete from public.profiles where id = uid;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;

create table if not exists public.user_ai_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  text text not null,
  source text not null default 'said' check (source in ('said', 'observed')),
  created_at timestamptz not null default now()
);
alter table public.user_ai_memory enable row level security;
drop policy if exists "own ai memory" on public.user_ai_memory;
create policy "own ai memory" on public.user_ai_memory
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

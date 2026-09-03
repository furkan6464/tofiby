-- Tofiby schema. Apply in the Supabase SQL editor.
-- All day-bound writes must use the user's timezone on the server, never the client clock.

create extension if not exists "pgcrypto";
create extension if not exists "pg_cron";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  email text unique not null,
  timezone text not null default 'Europe/Istanbul',
  onboarded boolean not null default false,
  theme text not null default 'ink',
  notify_poke boolean not null default true,
  notify_evolution boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.creatures (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  species_id text not null,
  stage text not null default 'egg',
  total_gp numeric not null default 0,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  hue_shift numeric not null default 0,
  union_bar_pct numeric not null default 0,
  adult_reached_at timestamptz,
  adult_gp_snapshot numeric,
  status text not null default 'active' check (status in ('active', 'retired')),
  spouse_owner_id uuid,
  spouse_creature_name text,
  married_at timestamptz,
  created_at date not null default current_date,
  retired_at date,
  parent_a_id uuid,
  parent_b_id uuid,
  generation int not null default 1,
  genetics jsonb not null default '{}'::jsonb,
  egg_shell_variant text,
  rare_mutation boolean not null default false,
  unlocked_room_items text[] not null default '{}',
  letters jsonb not null default '[]'::jsonb
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  note text not null default '',
  target_date date,
  frequency_pattern jsonb not null,
  color text not null,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at date not null default current_date
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  goal_id uuid references public.goals(id) on delete set null,
  date date not null,
  title text not null,
  note text not null default '',
  weight numeric not null default 1,
  completed boolean not null default false,
  completed_at timestamptz
);

create table if not exists public.daily_scores (
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  dcs numeric,
  is_streak_day boolean not null default false,
  gp_earned numeric not null default 0,
  finalized boolean not null default false,
  primary key (user_id, date)
);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  unique (user_a, user_b)
);

create table if not exists public.pairs (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  creature_a_id uuid not null references public.creatures(id),
  creature_b_id uuid not null references public.creatures(id),
  status text not null default 'bonded' check (status in ('bonded', 'married')),
  sync_points int not null default 0,
  bonded_at timestamptz not null default now(),
  married_at timestamptz
);

create table if not exists public.pokes (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references public.profiles(id) on delete cascade,
  to_user uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  unique (from_user, to_user, date)
);

create table if not exists public.offspring_log (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  resulting_species_id text not null,
  resulting_hue numeric not null,
  created_at timestamptz not null default now()
);

create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null,
  read boolean not null default false,
  href text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.creatures enable row level security;
alter table public.goals enable row level security;
alter table public.tasks enable row level security;
alter table public.daily_scores enable row level security;
alter table public.friendships enable row level security;
alter table public.pairs enable row level security;
alter table public.pokes enable row level security;
alter table public.offspring_log enable row level security;
alter table public.notices enable row level security;

create policy "own profile" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "own creatures" on public.creatures for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "friend creature peek" on public.creatures for select using (
  exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.user_a = auth.uid() and f.user_b = owner_id) or (f.user_b = auth.uid() and f.user_a = owner_id))
  )
);
create policy "own goals" on public.goals for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own tasks" on public.tasks for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own scores" on public.daily_scores for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own friendships" on public.friendships for all using (user_a = auth.uid() or user_b = auth.uid());
create policy "own pairs" on public.pairs for all using (user_a = auth.uid() or user_b = auth.uid());
create policy "own pokes" on public.pokes for all using (from_user = auth.uid() or to_user = auth.uid());
create policy "own notices" on public.notices for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own offspring" on public.offspring_log for select using (
  exists (select 1 from public.pairs p where p.id = pair_id and (p.user_a = auth.uid() or p.user_b = auth.uid()))
);

-- Wave A: goal / task richness (local store is live; this keeps the remote schema ready)
alter table public.goals add column if not exists start_date date;
alter table public.goals add column if not exists weekly_frequency int;
alter table public.goals add column if not exists daily_duration_minutes int;
alter table public.profiles add column if not exists weekly_review_seen text;
alter table public.profiles add column if not exists soft_day_caps jsonb not null default '{}'::jsonb;

alter table public.tasks add column if not exists milestone_id uuid;
alter table public.tasks add column if not exists time text;
alter table public.tasks add column if not exists description text not null default '';
alter table public.tasks add column if not exists estimated_duration_minutes int;
alter table public.tasks add column if not exists priority text not null default 'medium';
alter table public.tasks add column if not exists tag text;
alter table public.tasks add column if not exists repeat_pattern jsonb;
alter table public.tasks add column if not exists checklist_items jsonb not null default '[]'::jsonb;
alter table public.tasks add column if not exists reminder_offset_minutes int;
alter table public.tasks add column if not exists status text not null default 'pending';
alter table public.tasks add column if not exists postponed_to_date date;

create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  title text not null,
  order_index int not null default 0,
  weight numeric not null default 1,
  completed_at timestamptz
);

create table if not exists public.busy_slots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  start_min int not null,
  end_min int not null,
  source text not null default 'app' check (source in ('app', 'external')),
  title text
);

alter table public.milestones enable row level security;
alter table public.busy_slots enable row level security;
create policy "own milestones" on public.milestones for all using (
  exists (select 1 from public.goals g where g.id = goal_id and g.user_id = auth.uid())
);
create policy "own busy slots" on public.busy_slots for all using (user_id = auth.uid()) with check (user_id = auth.uid());

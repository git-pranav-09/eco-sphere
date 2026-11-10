-- Echo Sphere schema. Run this in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  story_text text not null check (char_length(story_text) between 30 and 500),
  ai_summary text,
  themes text[] not null default '{}',
  sentiment_label text,
  country text not null default 'Other / prefer not to say',
  latitude double precision,
  longitude double precision,
  language text default 'English',
  moderation_status text not null default 'pending'
    check (moderation_status in ('pending','approved','rejected')),
  moderation_reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz not null default now()
);

alter table public.stories enable row level security;
alter table public.profiles enable row level security;

-- Public users can only read approved stories. Submissions are created by the Edge Function.
drop policy if exists "Anyone can read approved stories" on public.stories;
create policy "Anyone can read approved stories"
on public.stories for select
using (moderation_status = 'approved');

-- Only admins can read pending/rejected stories and moderate.
drop policy if exists "Admins can read all stories" on public.stories;
create policy "Admins can read all stories"
on public.stories for select to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "Admins can moderate stories" on public.stories;
create policy "Admins can moderate stories"
on public.stories for update to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles for select to authenticated using (id = auth.uid());

-- Admin role assignment is done manually by the project owner in SQL Editor.
-- Do not expose a policy that lets a user promote their own role.

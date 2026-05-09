create extension if not exists pgcrypto;

create table if not exists public.guest_invites (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  guest_name text,
  email text,
  is_used boolean not null default false,
  rsvp_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.rsvps (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid references public.guest_invites(id) on delete set null,
  invite_code text not null,
  full_name text not null,
  email text not null,
  attending boolean not null,
  guest_count int not null default 0,
  meal text,
  dietary text,
  song text,
  message text,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.guest_invites enable row level security;
alter table public.rsvps enable row level security;

drop policy if exists invites_select_authenticated on public.guest_invites;
create policy invites_select_authenticated
on public.guest_invites
for select
to authenticated, anon
using (true);

drop policy if exists invites_update_authenticated on public.guest_invites;
create policy invites_update_authenticated
on public.guest_invites
for update
to authenticated, anon
using (true)
with check (true);

drop policy if exists rsvps_insert_authenticated on public.rsvps;
create policy rsvps_insert_authenticated
on public.rsvps
for insert
to authenticated, anon
with check (true);

drop policy if exists rsvps_select_authenticated on public.rsvps;
create policy rsvps_select_authenticated
on public.rsvps
for select
to authenticated
using (true);

drop policy if exists rsvps_update_authenticated on public.rsvps;
create policy rsvps_update_authenticated
on public.rsvps
for update
to authenticated
using (true)
with check (true);

drop policy if exists rsvps_delete_authenticated on public.rsvps;
create policy rsvps_delete_authenticated
on public.rsvps
for delete
to authenticated
using (true);

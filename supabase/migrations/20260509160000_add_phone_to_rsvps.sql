-- Optional guest phone for RSVP contact
alter table public.rsvps add column if not exists phone text;

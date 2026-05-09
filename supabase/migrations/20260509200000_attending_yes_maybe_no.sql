-- Migrate legacy boolean `attending` → text yes | maybe | no.
-- Safe if column is already text (fresh installs with updated init migration).

do $$
declare
  col_type text;
begin
  select c.data_type into col_type
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'rsvps'
    and c.column_name = 'attending';

  if col_type = 'boolean' then
    alter table public.rsvps add column attending_response text;
    update public.rsvps
      set attending_response = case when attending then 'yes' else 'no' end;
    alter table public.rsvps drop column attending;
    alter table public.rsvps rename column attending_response to attending;
    alter table public.rsvps alter column attending set not null;
  end if;
end $$;

alter table public.rsvps drop constraint if exists rsvps_attending_chk;
alter table public.rsvps drop constraint if exists rsvps_attending_check;

alter table public.rsvps add constraint rsvps_attending_chk
  check (attending in ('yes', 'maybe', 'no'));

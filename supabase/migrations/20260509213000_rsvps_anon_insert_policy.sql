-- Open RSVP: anon must be able to INSERT. SELECT remains authenticated-only (dashboard).
-- When using PostgREST insert+returning, the anon role would need SELECT on the new row;
-- the app uses plain insert without returning instead.

drop policy if exists rsvps_insert_authenticated on public.rsvps;
create policy rsvps_insert_authenticated
on public.rsvps
for insert
to anon, authenticated
with check (true);

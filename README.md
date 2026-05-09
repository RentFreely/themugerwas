# The Mugerwas — Tim & Rebecca

Production-ready hybrid wedding website:
- Guest-facing pages: `index.html`, `rsvp.html`, `details.html`
- Admin dashboard by direct link only: `dashboard.html`
- Supabase-backed RSVPs, invite codes, deadline checks, and dashboard refresh
- Creative coding accents: portal transitions, welcome overlay, subtle particles/hearts
- Gold-themed WhatsApp share button with inline icon

## Quick run

```bash
cd "/Users/Apple/Desktop/ode-workspace/themugerwas"
python3 -m http.server 8765
```

Open:
- Guest homepage: `http://localhost:8765/index.html`
- RSVP: `http://localhost:8765/rsvp.html`
- Dashboard: `http://localhost:8765/dashboard.html`

## Supabase setup

1. Create a Supabase project.
2. Run SQL from `supabase-schema.sql` in Supabase SQL editor.
3. Copy `config.example.js` to `config.js`.
4. Set:
   - `supabaseUrl`
   - `supabaseAnonKey`
   - `rsvpDeadlineIso`
5. Create at least one row in `guest_invites`:
   - `code`: e.g. `MUG-4F92AC`
   - `guest_name`
   - `email`

Guests RSVP with links like:

`https://your-domain.com/rsvp.html?guest=MUG-4F92AC`

## Confirmation email

`rsvp.js` optionally calls `confirmationEmailEndpoint`.
Use `send-rsvp-confirmation.example.ts` as a starter for a Supabase Edge Function.

## Notes

- Dashboard is not linked in guest navigation (direct URL access only).
- Dashboard refreshes every 30 seconds.
- Includes edit and delete controls for RSVP entries.
- Includes WhatsApp share on homepage.
- Couple photos are used from `public/themugerwas1.jpeg` .. `public/themugerwas3.jpeg`.

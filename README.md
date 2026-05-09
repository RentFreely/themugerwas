# The Mugerwas — Tim & Rebecca

Production-ready hybrid wedding RSVP website with a guest-facing experience and a direct-link admin dashboard.

**Emergency commands:** see [OPERATIONS.md](OPERATIONS.md).

## What this project includes

- Guest pages:
  - `index.html` (landing + countdown + story + share)
  - `rsvp.html` (multi-step RSVP flow)
  - `details.html` (event details)
- Admin page:
  - `dashboard.html` (direct URL access; not linked in guest nav)
- Data layer:
  - Supabase tables and RLS in `supabase-schema.sql`
  - Migration in `supabase/migrations/20260509131000_init_wedding_schema.sql`
- Core scripts:
  - `main.js` (global interactions and transitions)
  - `rsvp.js` (submission flow and validations)
  - `dashboard.js` (auth + list/search/edit/delete + refresh)

## Local run

```bash
cd "/Users/Apple/Desktop/ode-workspace/themugerwas"
python3 -m http.server 8765
```

Open:
- `http://localhost:8765/index.html`
- `http://localhost:8765/rsvp.html`
- `http://localhost:8765/details.html`
- `http://localhost:8765/dashboard.html`

## Supabase setup (required)

1. Create Supabase project.
2. Apply schema:
   - Use SQL editor with `supabase-schema.sql`, or
   - Use migration: `supabase/migrations/20260509131000_init_wedding_schema.sql`.
3. Configure `config.js`:
   - `supabaseUrl`
   - `supabaseAnonKey` (publishable/anon only)
   - `rsvpDeadlineIso`
   - `siteBaseUrl` (or keep `window.location.origin`)
4. Seed `guest_invites` with invite codes.

Example invite URL:

`https://your-domain.com/rsvp.html?guest=MUG-4F92AC`

## Current deployment notes (DigitalOcean)

- Droplet OS: Ubuntu 24.04 LTS
- Web server: Nginx
- Static root: `/var/www/themugerwas`
- Site config: `/etc/nginx/sites-available/themugerwas`

Basic deploy flow:

```bash
scp -r /Users/Apple/Desktop/ode-workspace/themugerwas/* root@YOUR_IP:/var/www/themugerwas/
ssh root@YOUR_IP "nginx -t && systemctl reload nginx"
```

## Domain and HTTPS

1. Point DNS records:
   - `A @ -> your_droplet_ip`
   - `A www -> your_droplet_ip` (or `CNAME www -> @`)
2. Install certbot and issue cert:

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

3. In Supabase Auth settings:
   - Site URL: `https://yourdomain.com`
   - Additional redirect URLs: `https://www.yourdomain.com`

## Security essentials (do not skip)

- Never expose `service_role` key in frontend code.
- `config.js` on client should only contain publishable/anon key.
- Keep dashboard unlinked from guest navigation.
- Use invite codes; do not accept open anonymous RSVPs without code checks.
- Keep server firewall enabled:
  - `ufw allow OpenSSH`
  - `ufw allow 'Nginx Full'`
- Use SSH keys (disable password SSH when ready).
- Keep Ubuntu patched regularly:

```bash
sudo apt update && sudo apt upgrade -y
```

- Backup strategy:
  - Enable Supabase backups (where available by plan)
  - Export RSVP CSV periodically from dashboard
  - Keep a copy of this repo in GitHub

## Important RLS warning

Current policies are permissive for `guest_invites` (`anon` can select/update) to keep the invite-code flow simple.
Before a high-traffic public launch, tighten policies (or route invite validation and marking through a secured server/Edge Function) to reduce abuse risk.

## Feature notes

- Dashboard auto-refresh every 30 seconds.
- RSVP deadline enforcement is client-side via `rsvpDeadlineIso`.
- Optional confirmation emails via `confirmationEmailEndpoint` in `config.js`.
  - Starter function: `send-rsvp-confirmation.example.ts`

## Go-live checklist

- [ ] Domain resolves to server IP
- [ ] HTTPS certificate active
- [ ] Supabase URL and anon key valid in `config.js`
- [ ] Auth URL settings updated in Supabase
- [ ] Invite codes seeded in `guest_invites`
- [ ] Test RSVP submit (accept + decline)
- [ ] Verify dashboard login and row visibility
- [ ] Verify edit/delete actions in dashboard
- [ ] Test on phone (home, RSVP, details, dashboard)

## Recovery checklist

If site fails after an update:

1. Re-upload known-good files to `/var/www/themugerwas`.
2. Test Nginx config: `nginx -t`.
3. Reload Nginx: `systemctl reload nginx`.
4. Verify Supabase project status and keys.
5. Re-test from browser and mobile.

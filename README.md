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
  - Supabase tables and RLS via ordered SQL in `supabase/migrations/` (see Supabase setup below)
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
2. Apply schema (migrations are the single source of truth):
   - **Recommended:** from this folder run `supabase link` (once) then `supabase db push`, which applies every file in `supabase/migrations/` in order; or
   - **Manual:** in the Supabase SQL editor, run each `supabase/migrations/*.sql` file in filename order (early timestamps may be no-ops kept for history parity with hosted projects).
3. Configure `config.js`:
   - `supabaseUrl`
   - `supabaseAnonKey` (publishable/anon only)
   - `rsvpDeadlineIso`
   - `siteBaseUrl` (or keep `window.location.origin`)
4. RSVP mode (current): **open registration** — guests use `rsvp.html` without invitation codes. Rows are stored with `invite_code` set to `WEB` and `invite_id` null.

Optional later: per-guest codes via `guest_invites` and URL query `?guest=CODE`.

RSVP URL:

`https://your-domain.com/rsvp.html`

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
- Open RSVP links can receive spam or duplicate entries; monitor the dashboard and tighten RLS or add rate limiting / captcha before wide public share if needed.
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

Current policies allow open inserts on `rsvps` for anon (see migration). The app previously validated rows in `guest_invites`; that is disabled for now.
Before a high-traffic public launch, consider stricter RLS, Edge Function validation, or re-enabling invite-only codes.

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
- [ ] Test RSVP submit with link only (accept + maybe + decline)
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

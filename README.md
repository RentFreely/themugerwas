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

RSVP URL (production):

`https://the-mugerwas-wedding.online/rsvp.html`

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

Production domain: **`the-mugerwas-wedding.online`** (Namecheap). Point it at your DigitalOcean droplet’s **public IPv4** (verify in the Droplet dashboard; it was `164.92.131.118` when this site was last deployed—confirm before typing DNS).

### 1. DNS at Namecheap

1. Namecheap → **Domain List** → **Manage** next to `the-mugerwas-wedding.online`.
2. Open the **Advanced DNS** tab.
3. Remove any **URL Redirect** / parking records that conflict with your site.
4. Add:
   - **A Record** · Host `@` · Value **your droplet IPv4** · TTL Automatic (or 30 min).
   - **A Record** · Host `www` · Value **same IPv4** · TTL Automatic.

   (Alternatively, some setups use a **CNAME** for `www` pointing to `the-mugerwas-wedding.online.` — either works if Namecheap allows it alongside your other records.)

5. Wait for propagation (often minutes, sometimes up to a few hours). Check with `dig the-mugerwas-wedding.online +short` or an online DNS checker.

### 2. Nginx + Let’s Encrypt on the droplet

Ensure your site’s `server_name` includes the domain, then obtain certificates:

```bash
sudo nano /etc/nginx/sites-available/themugerwas
# Ensure: server_name the-mugerwas-wedding.online www.the-mugerwas-wedding.online;
sudo nginx -t && sudo systemctl reload nginx

sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d the-mugerwas-wedding.online -d www.the-mugerwas-wedding.online
```

### 3. Supabase Auth (dashboard)

In **Authentication → URL Configuration**:

- **Site URL:** `https://the-mugerwas-wedding.online`
- **Additional redirect URLs:** include both  
  `https://www.the-mugerwas-wedding.online`  
  and `https://the-mugerwas-wedding.online`  
  (and any dev URLs you still use, e.g. `http://localhost:8765` if you test auth locally).

This repo also keeps `[auth].site_url` and `[auth].additional_redirect_urls` in `supabase/config.toml`; running **`supabase config push`** from this folder applies them to the linked hosted project (same effect as manual Dashboard edits when kept in sync).

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

- [x] DNS for `the-mugerwas-wedding.online` (and `www`) points to the droplet IP
- [x] HTTPS certificate active (certbot)
- [x] Supabase URL and anon key valid in `config.js`
- [x] Supabase Auth Site URL / redirect URLs include the production domain (via Dashboard **or** `supabase config push` from `[auth]` in `supabase/config.toml`)
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

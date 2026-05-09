# Operations runbook — The Mugerwas

One-page reference for deploy, verify, and recovery. Full context lives in [README.md](README.md).

## Paths and URLs

| Item | Value |
|------|--------|
| Static root (Droplet) | `/var/www/themugerwas` |
| Nginx site config | `/etc/nginx/sites-available/themugerwas` |
| Supabase schema | `supabase/migrations/*` (use `supabase db push` when linked) |
| Client config | `config.js` (anon/publishable key only) |

Replace `YOUR_IP` and `yourdomain.com` below.

---

## Deploy or redeploy (from your laptop)

```bash
scp -r /path/to/themugerwas/* root@YOUR_IP:/var/www/themugerwas/
ssh root@YOUR_IP "chmod -R a+rX /var/www/themugerwas && nginx -t && systemctl reload nginx"
```

---

## Quick health checks

```bash
curl -I "http://YOUR_IP/"
curl -I "http://YOUR_IP/rsvp.html"
curl -I "http://YOUR_IP/dashboard.html"
```

With HTTPS after certbot:

```bash
curl -I "https://yourdomain.com/"
```

---

## Nginx: test and reload

```bash
ssh root@YOUR_IP
nginx -t && systemctl reload nginx
journalctl -u nginx -n 50 --no-pager
```

---

## Firewall (Ubuntu)

```bash
ufw status
ufw allow OpenSSH
ufw allow 'Nginx Full'
```

---

## HTTPS (Let’s Encrypt) — after DNS points to the server

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com -d www.yourdomain.com
certbot renew --dry-run
```

Update Nginx `server_name` to your domain before or during certbot.

---

## Supabase (CLI, from repo root)

```bash
supabase migration list
supabase db push --linked -p 'YOUR_DB_PASSWORD'
```

Dashboard: Auth → URL configuration → set Site URL and redirect URLs to production `https://`.

---

## If the site is down

1. **Can you SSH?** `ssh root@YOUR_IP`
2. **Nginx running?** `systemctl status nginx`
3. **Config valid?** `nginx -t`
4. **Files present?** `ls -la /var/www/themugerwas`
5. **Permissions?** `chmod -R a+rX /var/www/themugerwas`
6. **Disk full?** `df -h`
7. **Supabase:** check project status and keys in `config.js`

---

## Secrets (never commit)

- **OK in browser:** `supabaseAnonKey` / publishable key in `config.js`
- **Never in repo or frontend:** `service_role`, database password, SMTP secrets, Edge Function secrets

Rotate keys in Supabase dashboard if exposed.

---

## Emergency CSV backup

Use the dashboard **CSV** export after login. Store offline before risky changes.

---

## Who to call

- **Hosting:** DigitalOcean Droplet + Nginx
- **Data:** Supabase project (tables `guest_invites`, `rsvps`)

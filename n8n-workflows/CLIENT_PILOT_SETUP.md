# Client Pilot Setup Runbook

Provisions a fully isolated copy of this CRM on a small VPS for a single
pilot client — separate database, separate n8n instance, their own
credentials. Nothing of the client's data or workflows ever touches your
own instance, and vice versa.

Not multi-tenant: this is one clone per client. Fine for a handful of
pilots; a real multi-tenant redesign is a separate, much bigger project.

## 0. Prerequisites

- A VPS (DigitalOcean, Hetzner, etc.) — smallest tier is enough for a pilot.
- A domain or subdomain pointed at the VPS's IP (e.g. `roofingco-pilot.yourdomain.com`).
- SSH access to the VPS as root or a sudo user.

## 1. Base install on the VPS

```bash
apt update && apt install -y postgresql nodejs npm nginx certbot python3-certbot-nginx
npm install -g pm2 n8n
```

## 2. Clone the database schema (structure only, no data)

On your own machine, dump the current schema — this already reflects every
migration that's been applied, so it's more reliable than manually
replaying the individual `*_add.sql` / `*_schema.sql` files in this
directory:

```bash
pg_dump -d n8n_vectordb --schema-only --no-owner --no-privileges -f crm_schema_dump.sql
scp crm_schema_dump.sql root@<vps-ip>:~/
```

On the VPS:

```bash
sudo -u postgres createdb n8n_vectordb
sudo -u postgres psql -d n8n_vectordb -f ~/crm_schema_dump.sql
```

## 3. Start n8n on the VPS

```bash
pm2 start n8n --name n8n
```

Log into the n8n editor (default `http://<vps-ip>:5678`, put it behind
nginx + SSL before actually handing this to the client — see step 7).

Generate an API key: n8n editor → **Settings → API** → create key. Save it,
you'll need it for step 4.

## 4. Import the workflows

From your own machine (this repo):

```bash
cd n8n-workflows/scripts
export DEPLOY_N8N_BASE_URL=https://roofingco-pilot.yourdomain.com   # or http://<vps-ip>:5678 before SSL is set up
export DEPLOY_N8N_API_KEY=<the key from step 3>

node deploy-workflows.cjs --dry-run   # sanity check first
node deploy-workflows.cjs             # actually push
```

This creates all 85 workflows on the target instance, **deactivated**, still
pointing at your original credential IDs (which don't exist there yet —
that's expected, see step 5).

## 5. Reassign credentials

In the client's n8n editor, for each credential type actually in use
(Postgres, Gmail/SMTP, Google Calendar OAuth, Stripe if applicable):

1. Create a new credential using the **client's own accounts** — not yours.
2. Open each workflow that references the old credential, reassign it to
   the new one in the relevant node(s).
3. Only activate a workflow once its credentials are reassigned —
   activating with a missing credential just errors on first trigger.

The Postgres credential is the one every workflow needs — set that one
first, pointing at the DB created in step 2.

## 6. Deploy the frontend

On your own machine:

```bash
# Point the build at the client's own n8n webhook base URL, not localhost
echo "VITE_API_BASE_URL=https://roofingco-pilot.yourdomain.com" > .env.production
npm run build
scp -r dist root@<vps-ip>:/var/www/roofingco-pilot
```

Configure nginx to serve `/var/www/roofingco-pilot` as the site root, and
reverse-proxy `/webhook/*` (and any other API paths this app calls) through
to n8n on `localhost:5678`.

## 7. Lock it down

```bash
certbot --nginx -d roofingco-pilot.yourdomain.com
ufw allow 80,443/tcp
ufw allow OpenSSH
ufw enable
```

- Put n8n's editor UI (`/`, the actual n8n admin interface) behind basic
  auth or restrict it to your IP — the client only needs the CRM frontend,
  never the n8n editor itself.
- Confirm the webhook CORS `allowedOrigins` on each webhook trigger node
  matches the real frontend domain, not `localhost:5173` (a leftover from
  local dev — checked and fixed on `import-contacts` already; worth a
  sweep across the rest before handing this over).

## 8. Start everything persistently

```bash
cd /path/to/crm-app-on-vps
npm install
pm2 start ecosystem.config.cjs   # observability/compiler/pdf servers
pm2 save
pm2 startup                       # run the one printed command so pm2 survives reboots
```

## 9. Seed starter data

Not your own business's contacts/deals — generic pipeline stages, a
starter email/proposal/contract template set, and the "lead speed" +
stage-reminder automations from the outreach pitch. Keep this minimal;
the client's own data should dominate within the first week.

## 10. Track the "saves time" numbers

This is the actual point of the pilot. Use the existing
`Observability Dashboard`, `automation_runs`, and `workflow_run_log` tables
to produce a short weekly note: leads auto-responded to, reminders sent
without a human, hours of manual work avoided. That report is the case
study that turns the free trial into a paid engagement.

## Rollback / cleanup

If the pilot doesn't convert: `pm2 delete all`, drop the VPS. Nothing here
ever touched your own database or n8n instance, so there's no cleanup
required on your side.

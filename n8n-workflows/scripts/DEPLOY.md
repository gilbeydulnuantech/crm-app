# Pushing Workflows to a VPS

Two different machines are involved here, and it's easy to mix up which
commands run where. This doc is just that split, made explicit. For the
full pilot setup (VPS provisioning, DB, frontend, SSL), see
`../CLIENT_PILOT_SETUP.md` — this doc only covers the workflow-push part.

## The two machines

| | Runs where | What it does |
|---|---|---|
| `deploy-workflows.cjs` | **Your own machine**, in this repo | Reads local `.json` workflow files, sends them over HTTPS to the VPS's n8n API |
| n8n itself | **The VPS** | Just needs to be running and reachable — it receives the API calls, nothing more |

You never copy `deploy-workflows.cjs` onto the VPS. It never runs there.
It only ever talks to the VPS over the network, the same way a browser
talks to a website.

## Step 1 — on the VPS (via SSH), one time

Make sure n8n is installed and running:

```bash
ssh root@<vps-ip>
npm install -g n8n
pm2 start n8n --name n8n
```

In the n8n editor (`http://<vps-ip>:5678`, or your real domain once SSL is
set up), go to **Settings → API → Create an API key**. Copy it — you'll
paste it on your own machine next, not here.

## Step 2 — on your own machine, in this repo

```bash
cd n8n-workflows/scripts

export DEPLOY_N8N_BASE_URL=https://roofingco-pilot.yourdomain.com
export DEPLOY_N8N_API_KEY=<paste the key from Step 1>

node deploy-workflows.cjs --dry-run
```

The `--dry-run` prints what it *would* create — no files change, nothing
is sent, safe to run any time. Check the output: it should list every
workflow in `n8n-workflows/*.json` with `-> (new)` next to each.

If that looks right, run it for real:

```bash
node deploy-workflows.cjs
```

This sends all 85 workflows to the VPS's n8n over its API. You'll see
each one logged as it's created, plus a summary at the end.

## What you'll see afterward, on the VPS

Open the VPS's n8n editor in a browser — all 85 workflows are now there,
**deactivated**, each showing a "credential not found" warning on any node
that used a credential (Postgres, Gmail, Google Calendar, etc.). That's
expected: the workflows still reference *your* credential IDs, which don't
exist on the VPS.

Fix that in the n8n editor itself (a browser, pointed at the VPS — not a
terminal command): create new credentials there using the client's own
accounts, reassign each workflow's nodes to use them, then activate.

## Running it again later

If you edit a workflow locally and want to push the update:

```bash
node deploy-workflows.cjs
```

Same command. It remembers which workflow got which ID on the VPS (saved
in `.workflow-id-map.json` next to this file) and updates that one in
place instead of creating a duplicate.

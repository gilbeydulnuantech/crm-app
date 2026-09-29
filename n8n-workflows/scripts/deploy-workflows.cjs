// Bulk-imports every workflow JSON file in n8n-workflows/ into a target n8n
// instance via its REST API — for standing up a fresh clone (e.g. a client
// pilot VPS) from this repo's workflow exports, without hand-importing each
// file through the n8n editor UI one at a time.
//
// Target instance credentials come from env vars, NOT this project's own
// .env (that one points at YOUR n8n, not the client's):
//   DEPLOY_N8N_BASE_URL   e.g. https://roofingco-pilot.yourdomain.com
//   DEPLOY_N8N_API_KEY    an API key generated on the TARGET instance
//
// Usage:
//   DEPLOY_N8N_BASE_URL=... DEPLOY_N8N_API_KEY=... node deploy-workflows.cjs
//   DEPLOY_N8N_BASE_URL=... DEPLOY_N8N_API_KEY=... node deploy-workflows.cjs --dry-run
//
// What this does NOT do:
//   - Does not create/reassign credentials (Gmail, Postgres, Google
//     Calendar, Stripe, etc). Every node keeps referencing this repo's
//     original credential IDs, which won't exist on the target instance —
//     each workflow will show "credential not found" in the n8n editor
//     until you open it there and pick the client's own credential from
//     the dropdown. Re-running this script after that is safe (see
//     idempotency note below) as long as you don't overwrite those
//     reassignments from a stale local file first.
//   - Does not touch the Postgres schema/data — run the schema-only dump
//     against the target DB separately before this.
//
// Idempotency: on first run every workflow is POSTed (created fresh) and
// its new ID is recorded in .workflow-id-map.json next to this script. On
// later runs, files already in that map are PUT (updated in place) instead
// of creating duplicates — same pattern as compile-lib.cjs's pushToN8n.

const fs = require('fs');
const path = require('path');

const WORKFLOWS_DIR = path.join(__dirname, '..');
const ID_MAP_PATH = path.join(__dirname, '.workflow-id-map.json');

const N8N_BASE_URL = process.env.DEPLOY_N8N_BASE_URL;
const N8N_API_KEY = process.env.DEPLOY_N8N_API_KEY;
const DRY_RUN = process.argv.includes('--dry-run');

// n8n's public API rejects unknown settings keys (see the "must NOT have
// additional properties" error hit while fixing import-contacts) — only
// forward the handful of keys it actually accepts.
const ALLOWED_SETTINGS_KEYS = ['executionOrder', 'errorWorkflow', 'timezone', 'saveExecutionProgress', 'saveManualExecutions', 'saveDataErrorExecution', 'saveDataSuccessExecution', 'executionTimeout'];

function loadIdMap() {
  if (!fs.existsSync(ID_MAP_PATH)) return {};
  return JSON.parse(fs.readFileSync(ID_MAP_PATH, 'utf8'));
}

function saveIdMap(map) {
  fs.writeFileSync(ID_MAP_PATH, JSON.stringify(map, null, 2));
}

function listWorkflowFiles() {
  return fs.readdirSync(WORKFLOWS_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort();
}

function toApiPayload(raw) {
  const settings = raw.settings || {};
  const trimmedSettings = {};
  for (const key of ALLOWED_SETTINGS_KEYS) {
    if (key in settings) trimmedSettings[key] = settings[key];
  }
  return {
    name: raw.name,
    nodes: raw.nodes,
    connections: raw.connections,
    settings: trimmedSettings,
  };
}

async function pushOne(fileName, existingId) {
  const raw = JSON.parse(fs.readFileSync(path.join(WORKFLOWS_DIR, fileName), 'utf8'));
  const payload = toApiPayload(raw);
  const headers = { 'X-N8N-API-KEY': N8N_API_KEY, 'Content-Type': 'application/json' };

  if (DRY_RUN) {
    return { id: existingId || '(new)', action: existingId ? 'update' : 'create', wasActive: !!raw.active };
  }

  let res, body;
  if (existingId) {
    res = await fetch(`${N8N_BASE_URL}/api/v1/workflows/${existingId}`, { method: 'PUT', headers, body: JSON.stringify(payload) });
  } else {
    res = await fetch(`${N8N_BASE_URL}/api/v1/workflows`, { method: 'POST', headers, body: JSON.stringify(payload) });
  }
  body = await res.json();
  if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(body)}`);
  const workflowId = body.id;

  // Original export's `active` flag reflects whether it should run once
  // credentials are wired up — leave it deactivated by default even if
  // the source was active, since a freshly-imported workflow pointing at
  // missing credentials will just error on every trigger until someone
  // reassigns them in the editor.
  return { id: workflowId, action: existingId ? 'update' : 'create', wasActive: !!raw.active };
}

async function main() {
  if (!N8N_BASE_URL || !N8N_API_KEY) {
    console.error('Set DEPLOY_N8N_BASE_URL and DEPLOY_N8N_API_KEY (the TARGET instance, not your own).');
    process.exit(1);
  }

  const files = listWorkflowFiles();
  const idMap = loadIdMap();
  const results = { created: 0, updated: 0, failed: [], activeButSkipped: [] };

  console.log(`${DRY_RUN ? '[dry run] ' : ''}Deploying ${files.length} workflow files to ${N8N_BASE_URL}\n`);

  for (const fileName of files) {
    const existingId = idMap[fileName];
    try {
      const { id, action, wasActive } = await pushOne(fileName, existingId);
      idMap[fileName] = id;
      results[action === 'create' ? 'created' : 'updated']++;
      if (wasActive) results.activeButSkipped.push(fileName);
      console.log(`  ${action === 'create' ? '+' : '~'} ${fileName} -> ${id}`);
    } catch (err) {
      results.failed.push({ fileName, error: err.message });
      console.log(`  ! ${fileName} FAILED: ${err.message}`);
    }
  }

  if (!DRY_RUN) saveIdMap(idMap);

  console.log(`\nDone. ${results.created} created, ${results.updated} updated, ${results.failed.length} failed.`);
  if (results.activeButSkipped.length) {
    console.log(`\n${results.activeButSkipped.length} workflows were active in the source export but left DEACTIVATED here —`);
    console.log('reassign their credentials in the n8n editor first, then activate each manually.');
  }
  if (results.failed.length) {
    console.log('\nFailures:');
    for (const f of results.failed) console.log(`  - ${f.fileName}: ${f.error}`);
    process.exitCode = 1;
  }
}

main();

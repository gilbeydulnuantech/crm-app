#!/usr/bin/env node
// Translator: reads one CRM automation (contact / trigger_event='created' only,
// for now) from Postgres and compiles it into a real, standalone n8n workflow —
// a real Webhook trigger, a real IF node for the condition, real action nodes —
// instead of the old generic-interpreter engine evaluating it out of a shared
// poll loop. Pushes the compiled workflow live via n8n's REST API and stores
// the resulting workflow id back onto the automation row.
//
// Usage: node --env-file=.env compile-automation.cjs <automationId>

const { execFileSync } = require('child_process');

const PG_DB = 'n8n_vectordb';
const POSTGRES_CREDENTIAL = { id: 'OJlr1rmibAS2w3rj', name: 'myRag' };
const GMAIL_CREDENTIAL = { id: 'VKDbMYV2U0WoSc16', name: 'n8n072826' };
const N8N_BASE_URL = process.env.N8N_BASE_URL || 'http://localhost:5678';
const N8N_API_KEY = process.env.N8N_API_KEY;

function psqlJson(sql) {
  const out = execFileSync('psql', ['-d', PG_DB, '-t', '-A', '-c', sql], { encoding: 'utf8' });
  const trimmed = out.trim();
  return trimmed ? JSON.parse(trimmed) : null;
}

function psqlExec(sql) {
  execFileSync('psql', ['-d', PG_DB, '-c', sql], { encoding: 'utf8' });
}

function sqlStringLiteral(v) {
  return `'${String(v).replace(/'/g, "''")}'`;
}

function loadAutomation(id) {
  const automation = psqlJson(
    `SELECT row_to_json(a) FROM (SELECT id, name, trigger_type, trigger_event, condition_tree, is_active, created_by, n8n_workflow_id FROM automations WHERE id = ${Number(id)}) a;`
  );
  if (!automation) throw new Error(`Automation ${id} not found.`);
  const actions = psqlJson(
    `SELECT COALESCE(json_agg(row_to_json(x) ORDER BY x.branch, x.sort_order), '[]') FROM (SELECT id, branch, action_type, action_config, sort_order FROM automation_actions WHERE automation_id = ${Number(id)}) x;`
  ) || [];
  automation.actions = actions;
  return automation;
}

// --- Merge-field resolver embedded in compiled Code nodes (contact-trigger subset
// of the old engine's Prepare Email `fill()` — see Automation Engine.json) ---
const FILL_FN_SOURCE = `
function toTitleCase(s) { return (s || '').toString().toLowerCase().split(' ').map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' '); }
function dateStr(d) { return d ? new Date(d).toLocaleDateString() : ''; }
function fill(template, row) {
  return (template || '')
    .replace(/{{\\s*first_name\\s*}}/gi, toTitleCase(row.first_name) || 'there')
    .replace(/{{\\s*last_name\\s*}}/gi, toTitleCase(row.last_name))
    .replace(/{{\\s*email\\s*}}/gi, row.email || '')
    .replace(/{{\\s*phone\\s*}}/gi, row.phone || '')
    .replace(/{{\\s*job_title\\s*}}/gi, row.job_title || '')
    .replace(/{{\\s*lead_status\\s*}}/gi, row.lead_status || '')
    .replace(/{{\\s*city\\s*}}/gi, row.city || '')
    .replace(/{{\\s*state\\s*}}/gi, row.state || '')
    .replace(/{{\\s*country\\s*}}/gi, row.country || '')
    .replace(/{{\\s*owner_name\\s*}}/gi, toTitleCase(row.owner_name) || 'your account team')
    .replace(/{{\\s*owner_email\\s*}}/gi, row.owner_email || '')
    .replace(/{{\\s*owner_phone\\s*}}/gi, row.owner_phone || '')
    .replace(/{{\\s*today\\s*}}/gi, dateStr(new Date()))
    .replace(/{{\\s*contact\\.id\\s*}}/gi, row.id != null ? String(row.id) : '')
    .replace(/{{\\s*contact\\.first_name\\s*}}/gi, toTitleCase(row.first_name))
    .replace(/{{\\s*contact\\.last_name\\s*}}/gi, toTitleCase(row.last_name))
    .replace(/{{\\s*contact\\.full_name\\s*}}/gi, toTitleCase(\`\${row.first_name || ''} \${row.last_name || ''}\`.trim()))
    .replace(/{{\\s*contact\\.email\\s*}}/gi, row.email || '')
    .replace(/{{\\s*contact\\.phone\\s*}}/gi, row.phone || '')
    .replace(/{{\\s*contact\\.city\\s*}}/gi, row.city || '')
    .replace(/{{\\s*contact\\.state\\s*}}/gi, row.state || '')
    .replace(/{{\\s*contact\\.country\\s*}}/gi, row.country || '')
    .replace(/{{\\s*contact\\.source\\s*}}/gi, row.lead_source || '')
    .replace(/{{\\s*user\\.full_name\\s*}}/gi, toTitleCase(row.owner_name) || 'your account team')
    .replace(/{{\\s*user\\.email\\s*}}/gi, row.owner_email || '')
    .replace(/{{\\s*user\\.phone\\s*}}/gi, row.owner_phone || '')
    .replace(/{{\\s*system\\.current_date\\s*}}/gi, dateStr(new Date()))
    .replace(/{{\\s*system\\.current_datetime\\s*}}/gi, new Date().toLocaleString())
    .replace(/{{[^{}]*}}/g, '');
}
`;

function jsStr(v) {
  return JSON.stringify(String(v == null ? '' : v));
}

const CONDITION_OPERATOR_MAP = {
  equals: (t) => ({ type: t, operation: 'equals' }),
  not_equals: (t) => ({ type: t, operation: 'notEquals' }),
  contains: () => ({ type: 'string', operation: 'contains' }),
  greater_than: () => ({ type: 'number', operation: 'gt' }),
  less_than: () => ({ type: 'number', operation: 'lt' }),
  is_true: () => ({ type: 'boolean', operation: 'true', singleValue: true }),
  is_false: () => ({ type: 'boolean', operation: 'false', singleValue: true }),
};

function buildConditionNode(conditionTree, id) {
  const valueType = typeof conditionTree.value === 'number' ? 'number' : typeof conditionTree.value === 'boolean' ? 'boolean' : 'string';
  const op = CONDITION_OPERATOR_MAP[conditionTree.operator](valueType);
  const condition = {
    id: `${id}-cond`,
    leftValue: `={{ $json.${conditionTree.field} }}`,
    operator: { type: op.type, operation: op.operation, ...(op.singleValue ? { singleValue: true } : {}) },
  };
  if (!op.singleValue) condition.rightValue = conditionTree.value;
  return {
    id,
    name: 'Check Condition',
    type: 'n8n-nodes-base.if',
    typeVersion: 2.3,
    position: [0, 0],
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
        combinator: 'and',
        conditions: [condition],
      },
      options: {},
    },
  };
}

// Builds the node chain for one branch's actions. Returns { nodes, connections (array
// of [fromName, toName] pairs), entryName, exitName }. Every action's queryable/config
// values (tag name, message text, field value, wait duration) are known at compile time,
// so they're baked in as literals — only per-execution data (the contact row) is dynamic.
function buildActionChain(actions, automation, prefix) {
  const nodes = [];
  const edges = [];
  let prevName = null;
  let firstName = null;

  for (const action of actions) {
    const idBase = `${prefix}-a${action.id}`;
    const cfg = action.action_config || {};
    let entryName;
    let exitName;

    if (action.action_type === 'send_email') {
      const prepName = `Prepare Email #${action.id}`;
      nodes.push({
        id: `${idBase}-prep`, name: prepName, type: 'n8n-nodes-base.code', typeVersion: 2, position: [0, 0],
        parameters: {
          jsCode: `${FILL_FN_SOURCE}\nconst row = $('Fetch Contact').item.json;\nreturn [{ json: { to: row.email, subject: fill(${jsStr(cfg.subject)}, row), htmlBody: fill(${jsStr(cfg.body)}, row).replace(/\\n/g, '<br>') } }];`,
        },
      });
      const sendName = `Send Email #${action.id}`;
      nodes.push({
        id: `${idBase}-send`, name: sendName, type: 'n8n-nodes-base.gmail', typeVersion: 2.2, position: [0, 0],
        parameters: { sendTo: '={{ $json.to }}', subject: '={{ $json.subject }}', emailType: 'html', message: '={{ $json.htmlBody }}', options: {} },
        credentials: { gmailOAuth2: GMAIL_CREDENTIAL },
        onError: 'continueRegularOutput',
      });
      edges.push([prepName, sendName]);
      entryName = prepName;
      exitName = sendName;
    } else if (action.action_type === 'add_tag') {
      const resolveName = `Resolve Tag #${action.id}`;
      nodes.push({
        id: `${idBase}-tag`, name: resolveName, type: 'n8n-nodes-base.postgres', typeVersion: 2.6, position: [0, 0],
        parameters: {
          operation: 'executeQuery',
          query: `INSERT INTO tags (name) VALUES (${sqlStringLiteral(cfg.tag_name)}) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id, name;`,
          options: {},
        },
        credentials: { postgres: POSTGRES_CREDENTIAL },
      });
      const insertName = `Insert Taggable #${action.id}`;
      nodes.push({
        id: `${idBase}-taggable`, name: insertName, type: 'n8n-nodes-base.postgres', typeVersion: 2.6, position: [0, 0],
        parameters: {
          operation: 'executeQuery',
          query: `INSERT INTO taggables (tag_id, entity_type, entity_id) VALUES ($1, 'contact', $2) ON CONFLICT (tag_id, entity_type, entity_id) DO NOTHING RETURNING id;`,
          options: { queryReplacement: "={{ [ $json.id, $('Fetch Contact').item.json.id ] }}" },
        },
        credentials: { postgres: POSTGRES_CREDENTIAL },
      });
      edges.push([resolveName, insertName]);
      entryName = resolveName;
      exitName = insertName;
    } else if (action.action_type === 'send_team_notification') {
      const prepName = `Prepare Notification #${action.id}`;
      nodes.push({
        id: `${idBase}-prep`, name: prepName, type: 'n8n-nodes-base.code', typeVersion: 2, position: [0, 0],
        parameters: { jsCode: `${FILL_FN_SOURCE}\nconst row = $('Fetch Contact').item.json;\nreturn [{ json: { text: fill(${jsStr(cfg.message)}, row) } }];` },
      });
      const memberName = `Ensure Membership #${action.id}`;
      nodes.push({
        id: `${idBase}-member`, name: memberName, type: 'n8n-nodes-base.postgres', typeVersion: 2.6, position: [0, 0],
        parameters: {
          operation: 'executeQuery',
          query: `INSERT INTO conversation_members (conversation_id, user_id, joined_at, last_read_at) VALUES (${Number(cfg.channel_id)}, ${Number(automation.created_by)}, now(), now()) ON CONFLICT (conversation_id, user_id) DO UPDATE SET last_read_at = now();`,
          options: {},
        },
        credentials: { postgres: POSTGRES_CREDENTIAL },
      });
      const msgName = `Insert Message #${action.id}`;
      nodes.push({
        id: `${idBase}-msg`, name: msgName, type: 'n8n-nodes-base.postgres', typeVersion: 2.6, position: [0, 0],
        parameters: {
          operation: 'executeQuery',
          query: `INSERT INTO messages (conversation_id, sender_id, body) VALUES (${Number(cfg.channel_id)}, ${Number(automation.created_by)}, $1) RETURNING id;`,
          options: { queryReplacement: '={{ [ $json.text ] }}' },
        },
        credentials: { postgres: POSTGRES_CREDENTIAL },
      });
      edges.push([prepName, memberName], [memberName, msgName]);
      entryName = prepName;
      exitName = msgName;
    } else if (action.action_type === 'update_field') {
      const FIELD_MAP = { lead_status: { column: 'lead_status', cast: 'text' }, owner_id: { column: 'owner_id', cast: 'int' } };
      const field = FIELD_MAP[cfg.field];
      if (!field) throw new Error(`update_field action #${action.id}: unsupported field "${cfg.field}" for contact trigger.`);
      const valueLiteral = field.cast === 'int' ? Number(cfg.value) : sqlStringLiteral(cfg.value);
      const updateName = `Update Field #${action.id}`;
      nodes.push({
        id: `${idBase}-update`, name: updateName, type: 'n8n-nodes-base.postgres', typeVersion: 2.6, position: [0, 0],
        parameters: {
          operation: 'executeQuery',
          query: `UPDATE contacts SET ${field.column} = ${valueLiteral}, updated_at = now() WHERE id = $1 RETURNING id;`,
          options: { queryReplacement: "={{ [ $('Fetch Contact').item.json.id ] }}" },
        },
        credentials: { postgres: POSTGRES_CREDENTIAL },
      });
      entryName = updateName;
      exitName = updateName;
    } else if (action.action_type === 'wait') {
      const unitMap = { minutes: 'minutes', hours: 'hours', days: 'days', months: 'days' };
      const amount = cfg.unit === 'months' ? Number(cfg.amount) * 30 : Number(cfg.amount);
      const waitName = `Wait #${action.id}`;
      nodes.push({
        id: `${idBase}-wait`, name: waitName, type: 'n8n-nodes-base.wait', typeVersion: 1.1, position: [0, 0],
        parameters: { resume: 'timeInterval', amount, unit: unitMap[cfg.unit] || 'minutes' },
        webhookId: `${idBase}-wait-resume`,
        ...(cfg.unit === 'months' ? { notes: 'Compiled from a "months" wait — n8n has no native months unit, so this is amount*30 days.', notesInFlow: true } : {}),
      });
      entryName = waitName;
      exitName = waitName;
    } else {
      continue; // unsupported action type for this trigger — skipped, not fatal
    }

    nodes.push(); // no-op guard (keeps array shape stable if entry/exit weren't set is impossible here)
    if (prevName) edges.push([prevName, entryName]);
    if (!firstName) firstName = entryName;
    prevName = exitName;
  }

  return { nodes: nodes.filter(Boolean), edges, entryName: firstName, exitName: prevName };
}

function compile(automation) {
  const id = automation.id;
  const prefix = `auto${id}`;
  const allNodes = [];
  const allConnections = {};

  function connect(from, to) {
    allConnections[from] = allConnections[from] || { main: [[]] };
    allConnections[from].main[0].push({ node: to, type: 'main', index: 0 });
  }

  const webhookName = `Webhook: automation-${id}-trigger`;
  allNodes.push({
    id: `${prefix}-webhook`, name: webhookName, type: 'n8n-nodes-base.webhook', typeVersion: 2.1, position: [0, 0],
    parameters: { httpMethod: 'POST', path: `automation-${id}-trigger`, responseMode: 'responseNode', options: {} },
    webhookId: `${prefix}-webhook-${id}`,
  });

  const parseName = 'Parse Trigger Payload';
  allNodes.push({
    id: `${prefix}-parse`, name: parseName, type: 'n8n-nodes-base.code', typeVersion: 2, position: [220, 0],
    parameters: { jsCode: "const body = $input.first().json.body || {};\nconst contactId = parseInt(body.contact_id, 10);\nif (!Number.isInteger(contactId)) throw new Error('\"contact_id\" is required.');\nreturn [{ json: { contactId } }];" },
  });
  connect(webhookName, parseName);

  const fetchName = 'Fetch Contact';
  allNodes.push({
    id: `${prefix}-fetch`, name: fetchName, type: 'n8n-nodes-base.postgres', typeVersion: 2.6, position: [440, 0],
    parameters: {
      operation: 'executeQuery',
      query: 'SELECT c.*, u.name AS owner_name, u.email AS owner_email, u.phone AS owner_phone FROM contacts c LEFT JOIN users u ON u.id = c.owner_id WHERE c.id = $1;',
      options: { queryReplacement: '={{ [ $json.contactId ] }}' },
    },
    credentials: { postgres: POSTGRES_CREDENTIAL },
  });
  connect(parseName, fetchName);

  function respondNodeName(suffix) {
    const name = `Respond${suffix}`;
    allNodes.push({
      id: `${prefix}-respond${suffix.replace(/\s/g, '')}`, name, type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1.5, position: [0, 0],
      parameters: { respondWith: 'json', responseBody: '={{ { success: true } }}', options: {} },
    });
    return name;
  }

  function wireBranch(actions, branchLabel, afterNode) {
    const { nodes, edges, entryName, exitName } = buildActionChain(actions, automation, `${prefix}-${branchLabel}`);
    allNodes.push(...nodes);
    edges.forEach(([f, t]) => connect(f, t));
    const respondName = respondNodeName(` (${branchLabel})`);
    if (entryName) {
      connect(afterNode, entryName);
      connect(exitName, respondName);
    } else {
      connect(afterNode, respondName);
    }
  }

  if (automation.condition_tree) {
    const condNode = buildConditionNode(automation.condition_tree, `${prefix}-cond`);
    condNode.position = [660, 0];
    allNodes.push(condNode);
    connect(fetchName, condNode.name);
    allConnections[condNode.name] = { main: [[], []] };
    const trueActions = (automation.actions || []).filter((a) => a.branch === 'true').sort((a, b) => a.sort_order - b.sort_order);
    const falseActions = (automation.actions || []).filter((a) => a.branch === 'false').sort((a, b) => a.sort_order - b.sort_order);

    function wireOutput(actions, branchLabel, outputIndex) {
      const { nodes, edges, entryName, exitName } = buildActionChain(actions, automation, `${prefix}-${branchLabel}`);
      allNodes.push(...nodes);
      edges.forEach(([f, t]) => connect(f, t));
      const respondName = respondNodeName(` (${branchLabel})`);
      const target = entryName || respondName;
      allConnections[condNode.name].main[outputIndex].push({ node: target, type: 'main', index: 0 });
      if (entryName) connect(exitName, respondName);
    }
    wireOutput(trueActions, 'true', 0);
    wireOutput(falseActions, 'false', 1);
  } else {
    const actions = (automation.actions || []).sort((a, b) => a.sort_order - b.sort_order);
    wireBranch(actions, 'default', fetchName);
  }

  return {
    name: `[Automation] ${automation.name} (#${id})`,
    nodes: allNodes.map((n, i) => ({ ...n, position: n.position[0] !== 0 || n.position[1] !== 0 ? n.position : [220 * (i + 2), 0] })),
    connections: allConnections,
    settings: { executionOrder: 'v1' },
  };
}

async function pushToN8n(workflow, existingId) {
  const headers = { 'X-N8N-API-KEY': N8N_API_KEY, 'Content-Type': 'application/json' };
  let res, body;
  if (existingId) {
    res = await fetch(`${N8N_BASE_URL}/api/v1/workflows/${existingId}`, { method: 'PUT', headers, body: JSON.stringify(workflow) });
    body = await res.json();
    if (!res.ok) throw new Error(`n8n PUT failed (${res.status}): ${JSON.stringify(body)}`);
  } else {
    res = await fetch(`${N8N_BASE_URL}/api/v1/workflows`, { method: 'POST', headers, body: JSON.stringify(workflow) });
    body = await res.json();
    if (!res.ok) throw new Error(`n8n POST failed (${res.status}): ${JSON.stringify(body)}`);
  }
  const workflowId = body.id;
  // deactivate+reactivate forces webhook re-registration (PUT alone doesn't reliably do it)
  await fetch(`${N8N_BASE_URL}/api/v1/workflows/${workflowId}/deactivate`, { method: 'POST', headers });
  const actRes = await fetch(`${N8N_BASE_URL}/api/v1/workflows/${workflowId}/activate`, { method: 'POST', headers });
  if (!actRes.ok) throw new Error(`n8n activate failed (${actRes.status}): ${await actRes.text()}`);
  return workflowId;
}

async function main() {
  const automationId = process.argv[2];
  if (!automationId) {
    console.error('Usage: node compile-automation.cjs <automationId>');
    process.exit(1);
  }
  if (!N8N_API_KEY) {
    console.error('N8N_API_KEY not set — run with: node --env-file=.env compile-automation.cjs <id>');
    process.exit(1);
  }
  const automation = loadAutomation(automationId);
  if (automation.trigger_type !== 'contact' || automation.trigger_event !== 'created') {
    console.error(`Automation ${automationId}: only trigger_type='contact' + trigger_event='created' is supported by the compiler right now (got trigger_type=${automation.trigger_type}, trigger_event=${automation.trigger_event}).`);
    process.exit(1);
  }
  const workflow = compile(automation);
  console.log(`Compiled "${automation.name}" — ${workflow.nodes.length} nodes.`);
  const workflowId = await pushToN8n(workflow, automation.n8n_workflow_id);
  psqlExec(`UPDATE automations SET n8n_workflow_id = ${sqlStringLiteral(workflowId)} WHERE id = ${Number(automationId)};`);
  console.log(`Deployed and activated as n8n workflow ${workflowId}. automations.n8n_workflow_id updated.`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

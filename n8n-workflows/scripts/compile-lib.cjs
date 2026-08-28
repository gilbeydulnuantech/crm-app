// Shared compiler core, used by both compile-automation.cjs (CLI) and
// compiler-server.cjs (HTTP, called by the Automations.json save-automation
// workflow so saving in the CRM UI auto-compiles a real n8n workflow).

const { execFileSync } = require('child_process');

const PG_DB = 'n8n_vectordb';
const POSTGRES_CREDENTIAL = { id: 'OJlr1rmibAS2w3rj', name: 'myRag' };
const GMAIL_CREDENTIAL = { id: 'VKDbMYV2U0WoSc16', name: 'n8n072826' };

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
    `SELECT row_to_json(a) FROM (SELECT id, name, trigger_type, trigger_event, trigger_config, condition_tree, is_active, created_by, n8n_workflow_id FROM automations WHERE id = ${Number(id)}) a;`
  );
  if (!automation) throw new Error(`Automation ${id} not found.`);
  const actions = psqlJson(
    `SELECT COALESCE(json_agg(row_to_json(x) ORDER BY x.branch, x.sort_order), '[]') FROM (SELECT id, branch, action_type, action_config, sort_order FROM automation_actions WHERE automation_id = ${Number(id)}) x;`
  ) || [];
  automation.actions = actions;
  return automation;
}

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

function buildConditionNode(conditionTree, id, displayName, contactSourceName) {
  const valueType = typeof conditionTree.value === 'number' ? 'number' : typeof conditionTree.value === 'boolean' ? 'boolean' : 'string';
  const op = CONDITION_OPERATOR_MAP[conditionTree.operator](valueType);
  const condition = {
    id: `${id}-cond`,
    // Always reads the named contact-source node, never bare $json — the
    // node immediately feeding this IF node isn't necessarily a contact
    // fetch (e.g. add_tag's output is just {id} from its RETURNING clause),
    // so $json.field would silently read the wrong shape whenever another
    // action precedes a branch_if in the same sequence.
    leftValue: `={{ $('${contactSourceName}').item.json.${conditionTree.field} }}`,
    operator: { type: op.type, operation: op.operation, ...(op.singleValue ? { singleValue: true } : {}) },
  };
  if (!op.singleValue) condition.rightValue = conditionTree.value;
  return {
    id,
    // n8n keys the `connections` object by node NAME (not id) — every
    // condition node in the workflow must have a distinct name, or two
    // conditions' outgoing connections collide/merge onto one entry. This
    // matters now that branch_if allows multiple condition nodes per
    // workflow (nested branches), not just the single legacy top-level one.
    name: displayName || 'Check Condition',
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

// Builds ONE sequence — the actions whose `branch` exactly equals `branchPath`
// (e.g. 'default', 'default.true', 'default.true.false') — in sort_order.
// A `branch_if` action forks the sequence: everything after it must belong to
// `${branchPath}.true` / `${branchPath}.false` instead (enforced by the UI
// that writes these rows), so branch_if is always the LAST item processed at
// a given level. Returns { nodes, edges, entryName, exitName, fork } where
// `fork` (if set) means exitName is actually a 2-output IF node's name —
// the caller must wire both of its outputs into recursive child sequences
// rather than treating exitName as a normal single-output tail.
function buildActionChain(actions, automation, prefix, branchPath, contactSourceIn) {
  const items = actions.filter((a) => a.branch === branchPath).sort((a, b) => a.sort_order - b.sort_order);
  const nodes = [];
  const edges = [];
  let prevName = null;
  let firstName = null;
  let fork = null;
  // Tracks the most recent Assign Owner node's name in THIS sequence, so a
  // later send_dm action with recipient:'assigned_owner' can reference its
  // output — mirrors the hand-built Sub: Hot Lead Actions pattern (Build DM
  // Key reading Assign Owner's RETURNING owner_id).
  let lastAssignOwnerNode = null;
  // Which node currently holds the freshest contact row. Starts as whatever
  // the caller last fetched; a `wait` action re-fetches afterward (a reply
  // may have arrived during the wait) and advances this, so every action
  // downstream of a wait — including a branch_if checking email_replied —
  // reads current data, not a snapshot from before the automation paused.
  let contactSource = contactSourceIn;

  for (const action of items) {
    const idBase = `${prefix}-a${action.id}`;
    const cfg = action.action_config || {};
    let entryName;
    let exitName;

    if (action.action_type === 'branch_if') {
      const condNode = buildConditionNode(cfg, `${idBase}-cond`, `Check Condition #${action.id}`, contactSource);
      nodes.push(condNode);
      if (prevName) edges.push([prevName, condNode.name]);
      if (!firstName) firstName = condNode.name;
      fork = { condNodeName: condNode.name, truePath: `${branchPath}.true`, falsePath: `${branchPath}.false`, contactSource };
      break; // nothing else at this level executes after a fork
    }

    if (action.action_type === 'send_email') {
      const prepName = `Prepare Email #${action.id}`;
      nodes.push({
        id: `${idBase}-prep`, name: prepName, type: 'n8n-nodes-base.code', typeVersion: 2, position: [0, 0],
        parameters: {
          jsCode: `${FILL_FN_SOURCE}\nconst row = $('${contactSource}').item.json;\nreturn [{ json: { to: row.email, subject: fill(${jsStr(cfg.subject)}, row), htmlBody: fill(${jsStr(cfg.body)}, row).replace(/\\n/g, '<br>') } }];`,
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
          options: { queryReplacement: `={{ [ $json.id, $('${contactSource}').item.json.id ] }}` },
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
        parameters: { jsCode: `${FILL_FN_SOURCE}\nconst row = $('${contactSource}').item.json;\nreturn [{ json: { text: fill(${jsStr(cfg.message)}, row) } }];` },
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
          options: { queryReplacement: `={{ [ $('${contactSource}').item.json.id ] }}` },
        },
        credentials: { postgres: POSTGRES_CREDENTIAL },
      });
      entryName = updateName;
      exitName = updateName;
    } else if (action.action_type === 'wait') {
      const unitMap = { seconds: 'seconds', minutes: 'minutes', hours: 'hours', days: 'days', months: 'days' };
      const amount = cfg.unit === 'months' ? Number(cfg.amount) * 30 : Number(cfg.amount);
      const waitName = `Wait #${action.id}`;
      nodes.push({
        id: `${idBase}-wait`, name: waitName, type: 'n8n-nodes-base.wait', typeVersion: 1.1, position: [0, 0],
        parameters: { resume: 'timeInterval', amount, unit: unitMap[cfg.unit] || 'minutes' },
        webhookId: `${idBase}-wait-resume`,
        ...(cfg.unit === 'months' ? { notes: 'Compiled from a "months" wait — n8n has no native months unit, so this is amount*30 days.', notesInFlow: true } : {}),
      });
      // Re-fetch immediately after the wait — a reply may have arrived while
      // paused, and everything downstream (especially a branch_if checking
      // email_replied) must see current data, not the pre-wait snapshot.
      const refetchName = `Fetch Contact #${action.id} (after wait)`;
      nodes.push({
        id: `${idBase}-refetch`, name: refetchName, type: 'n8n-nodes-base.postgres', typeVersion: 2.6, position: [0, 0],
        parameters: {
          operation: 'executeQuery',
          query: contactFetchQuery(),
          options: { queryReplacement: `={{ [ $('${contactSource}').item.json.id ] }}` },
        },
        credentials: { postgres: POSTGRES_CREDENTIAL },
      });
      edges.push([waitName, refetchName]);
      contactSource = refetchName;
      entryName = waitName;
      exitName = refetchName;
    } else if (action.action_type === 'assign_owner_round_robin') {
      const assignName = `Assign Owner #${action.id}`;
      nodes.push({
        id: `${idBase}-assign`, name: assignName, type: 'n8n-nodes-base.postgres', typeVersion: 2.6, position: [0, 0],
        parameters: {
          operation: 'executeQuery',
          query: `UPDATE contacts SET owner_id = (\n  SELECT u.id FROM users u\n  LEFT JOIN contacts c2 ON c2.owner_id = u.id AND c2.is_archived = false\n  WHERE u.role = 'user' AND u.active = true\n  GROUP BY u.id\n  ORDER BY COUNT(c2.id) ASC, u.id ASC\n  LIMIT 1\n), updated_at = now()\nWHERE id = $1\nRETURNING owner_id;`,
          options: { queryReplacement: `={{ [ $('${contactSource}').item.json.id ] }}` },
        },
        credentials: { postgres: POSTGRES_CREDENTIAL },
        notes: 'Least-loaded among active role=\'user\' reps — self-balancing, no cursor table needed.',
        notesInFlow: true,
      });
      entryName = assignName;
      exitName = assignName;
      lastAssignOwnerNode = assignName;
    } else if (action.action_type === 'send_dm') {
      const recipientExpr = cfg.recipient === 'assigned_owner'
        ? (lastAssignOwnerNode ? `$('${lastAssignOwnerNode}').item.json.owner_id` : (() => { throw new Error(`send_dm action #${action.id}: recipient is 'assigned_owner' but no Assign Owner action precedes it in this branch.`); })())
        : Number(cfg.recipient);
      const keyName = `Build DM Key #${action.id}`;
      nodes.push({
        id: `${idBase}-dmkey`, name: keyName, type: 'n8n-nodes-base.code', typeVersion: 2, position: [0, 0],
        parameters: {
          jsCode: `const NOTIFIER_USER_ID = ${Number(automation.created_by)};\nconst recipientId = ${recipientExpr};\nconst dmKey = [NOTIFIER_USER_ID, recipientId].sort((a, b) => a - b).join('-');\nreturn [{ json: { notifierUserId: NOTIFIER_USER_ID, recipientId, dmKey } }];`,
        },
      });
      const createName = `Create DM If Missing #${action.id}`;
      nodes.push({
        id: `${idBase}-dmcreate`, name: createName, type: 'n8n-nodes-base.postgres', typeVersion: 2.6, position: [0, 0],
        parameters: {
          operation: 'executeQuery',
          query: `INSERT INTO conversations (type, dm_key, created_by) VALUES ('dm', $1, $2) ON CONFLICT (dm_key) WHERE type = 'dm' DO NOTHING;`,
          options: { queryReplacement: `={{ [ $json.dmKey, $json.notifierUserId ] }}` },
        },
        credentials: { postgres: POSTGRES_CREDENTIAL },
      });
      const getIdName = `Get DM Id #${action.id}`;
      nodes.push({
        id: `${idBase}-dmgetid`, name: getIdName, type: 'n8n-nodes-base.postgres', typeVersion: 2.6, position: [0, 0],
        parameters: {
          operation: 'executeQuery',
          query: `SELECT id FROM conversations WHERE type = 'dm' AND dm_key = $1;`,
          options: { queryReplacement: `={{ [ $('${keyName}').item.json.dmKey ] }}` },
        },
        credentials: { postgres: POSTGRES_CREDENTIAL },
      });
      const membersName = `Ensure DM Members #${action.id}`;
      nodes.push({
        id: `${idBase}-dmmembers`, name: membersName, type: 'n8n-nodes-base.postgres', typeVersion: 2.6, position: [0, 0],
        parameters: {
          operation: 'executeQuery',
          query: `INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1, $2), ($1, $3) ON CONFLICT DO NOTHING;`,
          options: { queryReplacement: `={{ [ $json.id, $('${keyName}').item.json.notifierUserId, $('${keyName}').item.json.recipientId ] }}` },
        },
        credentials: { postgres: POSTGRES_CREDENTIAL },
      });
      const textName = `Prepare DM Text #${action.id}`;
      nodes.push({
        id: `${idBase}-dmtext`, name: textName, type: 'n8n-nodes-base.code', typeVersion: 2, position: [0, 0],
        parameters: { jsCode: `${FILL_FN_SOURCE}\nconst row = $('${contactSource}').item.json;\nreturn [{ json: { text: fill(${jsStr(cfg.message)}, row) } }];` },
      });
      const msgName = `Insert DM Message #${action.id}`;
      nodes.push({
        id: `${idBase}-dmmsg`, name: msgName, type: 'n8n-nodes-base.postgres', typeVersion: 2.6, position: [0, 0],
        parameters: {
          operation: 'executeQuery',
          query: `INSERT INTO messages (conversation_id, sender_id, body) VALUES ($1, $2, $3);`,
          options: { queryReplacement: `={{ [ $('${getIdName}').item.json.id, $('${keyName}').item.json.notifierUserId, $json.text ] }}` },
        },
        credentials: { postgres: POSTGRES_CREDENTIAL },
      });
      edges.push([keyName, createName], [createName, getIdName], [getIdName, membersName], [membersName, textName], [textName, msgName]);
      entryName = keyName;
      exitName = msgName;
    } else if (action.action_type === 'enroll_nurture') {
      const enrollName = `Enroll In Nurture #${action.id}`;
      nodes.push({
        id: `${idBase}-enroll`, name: enrollName, type: 'n8n-nodes-base.postgres', typeVersion: 2.6, position: [0, 0],
        parameters: {
          operation: 'executeQuery',
          query: `INSERT INTO nurture_enrollments (sequence_id, contact_id, current_step, status, enrolled_at) VALUES (${Number(cfg.sequence_id)}, $1, 0, 'active', now()) ON CONFLICT (sequence_id, contact_id) DO NOTHING;`,
          options: { queryReplacement: `={{ [ $('${contactSource}').item.json.id ] }}` },
        },
        credentials: { postgres: POSTGRES_CREDENTIAL },
      });
      entryName = enrollName;
      exitName = enrollName;
    } else {
      continue;
    }

    nodes.push();
    if (prevName) edges.push([prevName, entryName]);
    if (!firstName) firstName = entryName;
    prevName = exitName;
  }

  return { nodes: nodes.filter(Boolean), edges, entryName: firstName, exitName: prevName, fork, contactSource };
}

// Shared by the initial Fetch Contact node and every post-wait refetch, so
// email_replied and the owner_* joins are always computed identically.
// email_replied = has this contact received a real reply (logged by
// contacts-email-reply.json into email_logs) since THIS contact record was
// created — matches the semantics the hand-built Lead Response Sequence
// used (compare against contact.created_at, not against enrollment/step
// times, since a compiled automation has no separate "enrollment" concept).
function contactFetchQuery() {
  return `SELECT c.*, u.name AS owner_name, u.email AS owner_email, u.phone AS owner_phone,
  EXISTS (
    SELECT 1 FROM jsonb_array_elements(COALESCE(c.email_logs, '[]'::jsonb)) e
    WHERE e->>'type' = 'received' AND (e->>'sent_at')::timestamptz > c.created_at
  ) AS email_replied
FROM contacts c LEFT JOIN users u ON u.id = c.owner_id WHERE c.id = $1;`;
}

function compile(automation) {
  const id = automation.id;
  const prefix = `auto${id}`;
  const allNodes = [];
  const allConnections = {};
  let respondCounter = 0;

  // Generalized over connect() from earlier versions — supports multi-output
  // nodes (an IF/branch_if node has 2 outputs; everything else has 1).
  function connectOut(from, to, idx = 0) {
    allConnections[from] = allConnections[from] || { main: [] };
    while (allConnections[from].main.length <= idx) allConnections[from].main.push([]);
    allConnections[from].main[idx].push({ node: to, type: 'main', index: 0 });
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
  connectOut(webhookName, parseName);

  const fetchName = 'Fetch Contact';
  allNodes.push({
    id: `${prefix}-fetch`, name: fetchName, type: 'n8n-nodes-base.postgres', typeVersion: 2.6, position: [440, 0],
    parameters: {
      operation: 'executeQuery',
      query: contactFetchQuery(),
      options: { queryReplacement: '={{ [ $json.contactId ] }}' },
    },
    credentials: { postgres: POSTGRES_CREDENTIAL },
  });
  connectOut(parseName, fetchName);

  function respondNodeName(label) {
    respondCounter += 1;
    const name = `Respond #${respondCounter} (${label})`;
    allNodes.push({
      id: `${prefix}-respond${respondCounter}`, name, type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1.5, position: [0, 0],
      parameters: { respondWith: 'json', responseBody: '={{ { success: true } }}', options: {} },
    });
    return name;
  }

  // Recursively wires one branch path: builds its action chain, connects it
  // from `afterNode`/`afterOutputIdx`, and — if the chain ends in a
  // branch_if fork — recurses into the two child branch paths instead of
  // responding. Otherwise terminates in its own Respond node (each leaf of
  // the tree ends independently; there's no merge-back, matching how
  // Lead Response Sequence was hand-built).
  function wireSequence(branchPath, afterNode, afterOutputIdx, label, contactSourceIn) {
    const chain = buildActionChain(automation.actions || [], automation, `${prefix}-${branchPath.replace(/\./g, '-')}`, branchPath, contactSourceIn);
    allNodes.push(...chain.nodes);
    chain.edges.forEach(([f, t]) => connectOut(f, t));
    if (chain.entryName) connectOut(afterNode, chain.entryName, afterOutputIdx);

    if (chain.fork) {
      // chain.fork.condNodeName is always the chain's own last node here —
      // buildActionChain only sets `fork` after pushing the cond node itself.
      // Both children inherit whatever contact source was freshest at the
      // point of the fork (post-wait refetch if one happened before it).
      wireSequence(chain.fork.truePath, chain.fork.condNodeName, 0, `${label} → yes`, chain.fork.contactSource);
      wireSequence(chain.fork.falsePath, chain.fork.condNodeName, 1, `${label} → no`, chain.fork.contactSource);
      return;
    }

    const respondName = respondNodeName(label);
    if (chain.entryName) {
      connectOut(chain.exitName, respondName);
    } else {
      connectOut(afterNode, respondName, afterOutputIdx);
    }
  }

  if (automation.condition_tree) {
    // Legacy path: the OLD single top-level condition (still supported for
    // backward compatibility / the field-state trigger model). Its 'true'/
    // 'false' branches are themselves valid branch paths that CAN contain
    // nested branch_if actions underneath them, via the same recursion.
    const condNode = buildConditionNode(automation.condition_tree, `${prefix}-cond`, undefined, fetchName);
    condNode.position = [660, 0];
    allNodes.push(condNode);
    connectOut(fetchName, condNode.name);
    wireSequence('true', condNode.name, 0, 'true', fetchName);
    wireSequence('false', condNode.name, 1, 'false', fetchName);
  } else {
    wireSequence('default', fetchName, 0, 'default', fetchName);
  }

  return {
    name: `[Automation] ${automation.name} (#${id})`,
    nodes: allNodes.map((n, i) => ({ ...n, position: n.position[0] !== 0 || n.position[1] !== 0 ? n.position : [220 * (i + 2), 0] })),
    connections: allConnections,
    settings: { executionOrder: 'v1' },
  };
}

// Schedule-based automations (trigger_event='inactive') poll on their own
// dedicated Schedule Trigger instead of reacting to a webhook — per the
// architecture decision that CRM automations needing polling should each
// compile to their own scoped schedule, not a shared scanner. Scoped
// narrowly for now: only a single enroll_nurture action is supported,
// since it's naturally idempotent (ON CONFLICT DO NOTHING on
// (sequence_id, contact_id)) — re-evaluating "is this contact still
// inactive" every hour and re-running enroll_nurture is always safe. Other
// action types would need a separate "already fired" tracking mechanism
// this doesn't build yet, so they're rejected rather than silently
// re-firing every hour.
function compileScheduleTrigger(automation) {
  const id = automation.id;
  const prefix = `auto${id}`;
  const allNodes = [];
  const allConnections = {};

  function connectOut(from, to, idx = 0) {
    allConnections[from] = allConnections[from] || { main: [] };
    while (allConnections[from].main.length <= idx) allConnections[from].main.push([]);
    allConnections[from].main[idx].push({ node: to, type: 'main', index: 0 });
  }

  const cfg = automation.trigger_config || {};
  if (cfg.field !== 'days_since_last_activity' || cfg.operator !== 'greater_than' || !(Number(cfg.value) > 0)) {
    throw new Error(`Automation ${id}: an 'inactive' trigger needs trigger_config = { field: 'days_since_last_activity', operator: 'greater_than', value: <days> }.`);
  }
  const days = Number(cfg.value);

  const actions = (automation.actions || []).filter((a) => a.branch === 'default');
  if (actions.length !== 1 || actions[0].action_type !== 'enroll_nurture') {
    throw new Error(`Automation ${id}: an 'inactive' trigger only supports a single 'enroll_nurture' action today.`);
  }
  const sequenceId = Number(actions[0].action_config.sequence_id);
  if (!sequenceId) throw new Error(`Automation ${id}: enroll_nurture needs a sequence_id.`);

  const scheduleName = `Schedule Trigger: automation-${id}`;
  allNodes.push({
    id: `${prefix}-schedule`, name: scheduleName, type: 'n8n-nodes-base.scheduleTrigger', typeVersion: 1.2, position: [0, 0],
    parameters: { rule: { interval: [{ field: 'hours', hoursInterval: 1 }] } },
  });

  const selectName = 'Select Inactive Contacts';
  allNodes.push({
    id: `${prefix}-select`, name: selectName, type: 'n8n-nodes-base.postgres', typeVersion: 2.6, position: [220, 0],
    parameters: {
      operation: 'executeQuery',
      query: `SELECT c.id FROM contacts c\nWHERE c.is_archived = false\n  AND GREATEST(c.updated_at, COALESCE((SELECT MAX(created_at) FROM entity_activity_log WHERE entity_type = 'contact' AND entity_id = c.id), c.created_at)) <= now() - interval '${days} days';`,
      options: {},
    },
    credentials: { postgres: POSTGRES_CREDENTIAL },
  });
  connectOut(scheduleName, selectName);

  const enrollName = 'Enroll In Nurture';
  allNodes.push({
    id: `${prefix}-enroll`, name: enrollName, type: 'n8n-nodes-base.postgres', typeVersion: 2.6, position: [440, 0],
    parameters: {
      operation: 'executeQuery',
      query: `INSERT INTO nurture_enrollments (sequence_id, contact_id, current_step, status, enrolled_at) VALUES (${sequenceId}, $1, 0, 'active', now()) ON CONFLICT (sequence_id, contact_id) DO NOTHING;`,
      options: { queryReplacement: '={{ [ $json.id ] }}' },
    },
    credentials: { postgres: POSTGRES_CREDENTIAL },
  });
  connectOut(selectName, enrollName);

  return {
    name: `[Automation] ${automation.name} (#${id})`,
    nodes: allNodes,
    connections: allConnections,
    settings: { executionOrder: 'v1' },
  };
}

async function pushToN8n(workflow, existingId, n8nBaseUrl, n8nApiKey) {
  const headers = { 'X-N8N-API-KEY': n8nApiKey, 'Content-Type': 'application/json' };
  let res, body;
  if (existingId) {
    res = await fetch(`${n8nBaseUrl}/api/v1/workflows/${existingId}`, { method: 'PUT', headers, body: JSON.stringify(workflow) });
    body = await res.json();
    if (!res.ok) throw new Error(`n8n PUT failed (${res.status}): ${JSON.stringify(body)}`);
  } else {
    res = await fetch(`${n8nBaseUrl}/api/v1/workflows`, { method: 'POST', headers, body: JSON.stringify(workflow) });
    body = await res.json();
    if (!res.ok) throw new Error(`n8n POST failed (${res.status}): ${JSON.stringify(body)}`);
  }
  const workflowId = body.id;
  await fetch(`${n8nBaseUrl}/api/v1/workflows/${workflowId}/deactivate`, { method: 'POST', headers });
  const actRes = await fetch(`${n8nBaseUrl}/api/v1/workflows/${workflowId}/activate`, { method: 'POST', headers });
  if (!actRes.ok) throw new Error(`n8n activate failed (${actRes.status}): ${await actRes.text()}`);
  return workflowId;
}

async function compileAndDeploy(automationId, n8nBaseUrl, n8nApiKey) {
  const automation = loadAutomation(automationId);
  if (automation.trigger_type !== 'contact' || !['created', 'inactive'].includes(automation.trigger_event)) {
    throw new Error(`Automation ${automationId}: only trigger_type='contact' with trigger_event='created' or 'inactive' is supported by the compiler right now (got trigger_type=${automation.trigger_type}, trigger_event=${automation.trigger_event}).`);
  }
  const workflow = automation.trigger_event === 'inactive' ? compileScheduleTrigger(automation) : compile(automation);
  const workflowId = await pushToN8n(workflow, automation.n8n_workflow_id, n8nBaseUrl, n8nApiKey);
  psqlExec(`UPDATE automations SET n8n_workflow_id = ${sqlStringLiteral(workflowId)} WHERE id = ${Number(automationId)};`);
  return { workflowId, nodeCount: workflow.nodes.length };
}

module.exports = { loadAutomation, compile, pushToN8n, compileAndDeploy, psqlExec, sqlStringLiteral };

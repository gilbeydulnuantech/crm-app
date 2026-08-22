#!/usr/bin/env node
// Standalone observability server — reads n8n's own SQLite execution
// history directly off disk (n8n has no built-in dashboard API reachable
// from a sandboxed Code node) plus host CPU/RAM/disk, and serves it as one
// combined JSON payload. Same pattern as pdf-server.cjs: a plain Node HTTP
// process n8n calls over localhost via a normal HTTP Request node.
const http = require('http');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const PORT = 5681;
const DB_PATH = path.join(os.homedir(), '.n8n', 'database.sqlite');

// n8n stores execution error/result data as a `flatted`-encoded graph (to
// survive circular references). n8n ships its own copy of the `flatted`
// package — reuse it instead of adding a new dependency.
const { parse: flattedParse } = require(
  path.join(os.homedir(), '.nvm/versions/node/v20.20.2/lib/node_modules/n8n/node_modules/flatted')
);

const SERVICE_NODE_PREFIXES = {
  gmail: ['n8n-nodes-base.gmail'],
  google_drive: ['n8n-nodes-base.googleDrive'],
  google_calendar: ['n8n-nodes-base.googleCalendar'],
  google_sheets: ['n8n-nodes-base.googleSheets'],
  slack: ['n8n-nodes-base.slack'],
  postgres: ['n8n-nodes-base.postgres'],
};
const SERVICE_CREDENTIAL_TYPES = {
  gmail: ['gmailOAuth2'],
  google_drive: ['googleDriveOAuth2Api'],
  google_calendar: ['googleCalendarOAuth2Api'],
  google_sheets: ['googleSheetsOAuth2Api'],
  slack: ['slackApi'],
  postgres: ['postgres'],
};
const SERVICE_LABELS = {
  gmail: 'Gmail',
  google_drive: 'Google Drive',
  google_calendar: 'Google Calendar',
  google_sheets: 'Google Sheets',
  slack: 'Slack',
  postgres: 'Postgres',
};

function runQuery(sql) {
  const out = execFileSync('sqlite3', ['-json', DB_PATH, sql], {
    maxBuffer: 1024 * 1024 * 32,
    timeout: 8000,
  }).toString();
  if (!out.trim()) return [];
  return JSON.parse(out);
}

function durationMsExpr(alias) {
  return `CAST((julianday(${alias}.stoppedAt) - julianday(${alias}.startedAt)) * 86400000 AS INTEGER)`;
}

function getSummary() {
  const todayRows = runQuery(`
    SELECT status, COUNT(*) as cnt
    FROM execution_entity
    WHERE date(startedAt, 'localtime') = date('now', 'localtime')
    GROUP BY status;
  `);
  let executionsToday = 0;
  let successToday = 0;
  let failedToday = 0;
  for (const r of todayRows) {
    executionsToday += r.cnt;
    if (r.status === 'success') successToday += r.cnt;
    else if (r.status === 'error' || r.status === 'crashed') failedToday += r.cnt;
  }
  const successRatePct = executionsToday > 0 ? Math.round((successToday / executionsToday) * 1000) / 10 : null;

  const runningRows = runQuery(`
    SELECT COUNT(*) as cnt FROM execution_entity WHERE status IN ('running', 'waiting', 'new');
  `);
  const runningCount = runningRows[0]?.cnt ?? 0;

  const avgRows = runQuery(`
    SELECT AVG(${durationMsExpr('e')}) as avgMs
    FROM execution_entity e
    WHERE e.stoppedAt IS NOT NULL AND e.startedAt >= datetime('now', '-7 days');
  `);
  const avgExecutionMs = avgRows[0]?.avgMs != null ? Math.round(avgRows[0].avgMs) : null;

  const wfRows = runQuery(`SELECT COUNT(*) as total, SUM(CASE WHEN active THEN 1 ELSE 0 END) as activeCount FROM workflow_entity;`);
  const totalWorkflows = wfRows[0]?.total ?? 0;
  const activeWorkflows = wfRows[0]?.activeCount ?? 0;

  return {
    executionsToday,
    successToday,
    failedToday,
    runningCount,
    successRatePct,
    avgExecutionMs,
    totalWorkflows,
    activeWorkflows,
  };
}

function getExecutions(limit = 50) {
  return runQuery(`
    SELECT e.id, e.workflowId, w.name as workflowName, e.status, e.mode, e.startedAt, e.stoppedAt,
      ${durationMsExpr('e')} as durationMs
    FROM execution_entity e
    LEFT JOIN workflow_entity w ON w.id = e.workflowId
    ORDER BY e.id DESC
    LIMIT ${Number(limit)};
  `);
}

function getWorkflowStats() {
  return runQuery(`
    SELECT w.id, w.name, w.active,
      COUNT(e.id) as totalRuns,
      SUM(CASE WHEN e.status='success' THEN 1 ELSE 0 END) as successCount,
      SUM(CASE WHEN e.status='error' THEN 1 ELSE 0 END) as errorCount,
      AVG(CASE WHEN e.stoppedAt IS NOT NULL THEN ${durationMsExpr('e')} END) as avgMs,
      MAX(e.startedAt) as lastRunAt
    FROM workflow_entity w
    LEFT JOIN execution_entity e ON e.workflowId = w.id AND e.startedAt >= datetime('now', '-30 days')
    GROUP BY w.id
    HAVING totalRuns > 0
    ORDER BY totalRuns DESC
    LIMIT 15;
  `).map((r) => ({
    id: r.id,
    name: r.name,
    active: !!r.active,
    totalRuns: r.totalRuns,
    successCount: r.successCount,
    errorCount: r.errorCount,
    avgMs: r.avgMs != null ? Math.round(r.avgMs) : null,
    lastRunAt: r.lastRunAt,
  }));
}

function getTimeseries(days = 14) {
  return runQuery(`
    SELECT date(startedAt, 'localtime') as day,
      SUM(CASE WHEN status='success' THEN 1 ELSE 0 END) as success,
      SUM(CASE WHEN status='error' THEN 1 ELSE 0 END) as error,
      COUNT(*) as total
    FROM execution_entity
    WHERE startedAt >= datetime('now', '-${Number(days)} days')
    GROUP BY day
    ORDER BY day ASC;
  `);
}

function getErrorsWithDetail(limit = 20) {
  const rows = runQuery(`
    SELECT e.id, e.workflowId, w.name as workflowName, e.startedAt, ed.data
    FROM execution_entity e
    LEFT JOIN workflow_entity w ON w.id = e.workflowId
    LEFT JOIN execution_data ed ON ed.executionId = e.id
    WHERE e.status = 'error'
    ORDER BY e.id DESC
    LIMIT ${Number(limit)};
  `);

  return rows.map((r) => {
    let message = null;
    let nodeName = null;
    let nodeType = null;
    if (r.data) {
      try {
        const parsed = flattedParse(r.data);
        const err = parsed?.resultData?.error;
        message = err?.message || null;
        nodeName = err?.node?.name || parsed?.resultData?.lastNodeExecuted || null;
        nodeType = err?.node?.type || null;
      } catch {
        // execution_data missing/unparseable (e.g. pruned) — show what we have
      }
    }
    return {
      id: r.id,
      workflowId: r.workflowId,
      workflowName: r.workflowName,
      startedAt: r.startedAt,
      nodeName,
      nodeType,
      message,
    };
  });
}

function getServerResources() {
  const cpuBefore = os.cpus();
  // Delta-sample CPU over a short window for a real utilization %, not just
  // the 1-minute load average (which reads oddly on multi-core machines).
  return new Promise((resolve) => {
    setTimeout(() => {
      const cpuAfter = os.cpus();
      let idleDelta = 0;
      let totalDelta = 0;
      for (let i = 0; i < cpuBefore.length; i++) {
        const b = cpuBefore[i].times;
        const a = cpuAfter[i].times;
        const bTotal = b.user + b.nice + b.sys + b.idle + b.irq;
        const aTotal = a.user + a.nice + a.sys + a.idle + a.irq;
        totalDelta += aTotal - bTotal;
        idleDelta += a.idle - b.idle;
      }
      const cpuUsagePct = totalDelta > 0 ? Math.round((1 - idleDelta / totalDelta) * 1000) / 10 : 0;

      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;

      let disk = null;
      try {
        const dfOut = execFileSync('df', ['-k', '/'], { timeout: 3000 }).toString();
        const lines = dfOut.trim().split('\n');
        const cols = lines[lines.length - 1].trim().split(/\s+/);
        // macOS/BSD df -k: Filesystem 1024-blocks Used Available Capacity Mounted
        const totalKb = Number(cols[1]);
        const usedKb = Number(cols[2]);
        const availKb = Number(cols[3]);
        disk = {
          totalBytes: totalKb * 1024,
          usedBytes: usedKb * 1024,
          freeBytes: availKb * 1024,
          usedPct: totalKb > 0 ? Math.round((usedKb / (usedKb + availKb)) * 1000) / 10 : null,
        };
      } catch {
        disk = null;
      }

      resolve({
        cpu: { usagePct: cpuUsagePct, cores: cpuBefore.length, loadAvg: os.loadavg() },
        memory: { totalBytes: totalMem, usedBytes: usedMem, freeBytes: freeMem, usedPct: Math.round((usedMem / totalMem) * 1000) / 10 },
        disk,
        uptimeSeconds: os.uptime(),
      });
    }, 150);
  });
}

function getApiStatus(errorsDetail) {
  let credRows = [];
  try {
    credRows = runQuery(`SELECT type FROM credentials_entity;`);
  } catch {
    credRows = [];
  }
  const configuredTypes = new Set(credRows.map((r) => r.type));

  const recentErrorNodeTypes = new Set(
    errorsDetail
      .filter((e) => {
        if (!e.startedAt) return false;
        const ageMs = Date.now() - new Date(e.startedAt).getTime();
        return ageMs <= 24 * 3600 * 1000;
      })
      .map((e) => e.nodeType)
      .filter(Boolean)
  );

  return Object.keys(SERVICE_LABELS).map((key) => {
    const configured = SERVICE_CREDENTIAL_TYPES[key].some((t) => configuredTypes.has(t));
    const degraded = SERVICE_NODE_PREFIXES[key].some((prefix) =>
      [...recentErrorNodeTypes].some((nt) => nt.startsWith(prefix))
    );
    return {
      key,
      label: SERVICE_LABELS[key],
      status: !configured ? 'not_configured' : degraded ? 'degraded' : 'connected',
    };
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (url.pathname !== '/dashboard') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  try {
    const errors = getErrorsWithDetail(20);
    const [summary, executions, workflowStats, timeseries, serverResources] = await Promise.all([
      getSummary(),
      getExecutions(50),
      getWorkflowStats(),
      getTimeseries(14),
      getServerResources(),
    ]);
    const apiStatus = getApiStatus(errors);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ summary, executions, workflowStats, timeseries, errors, serverResources, apiStatus }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message || 'Internal error' }));
  }
});

server.listen(PORT, () => {
  console.log(`Observability server listening on http://localhost:${PORT}`);
});

#!/usr/bin/env node
// Standalone compiler server — kept running as its own process alongside
// n8n and Vite, same pattern as pdf-server.cjs/observability-server.cjs.
// The Automations.json save-automation flow hits this over plain HTTP
// after writing an automation's DB rows, so that saving an event-driven
// (trigger_event='created') automation in the CRM UI automatically
// compiles and deploys a real n8n workflow via the translator — no manual
// script run needed.
const http = require('http');
process.loadEnvFile(require('path').join(__dirname, '.env'));

const { compileAndDeploy } = require('./compile-lib.cjs');

const PORT = 5682;
const N8N_BASE_URL = process.env.N8N_BASE_URL || 'http://localhost:5678';
const N8N_API_KEY = process.env.N8N_API_KEY;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const match = url.pathname.match(/^\/compile\/(\d+)$/);
  if (req.method !== 'POST' || !match) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  const automationId = match[1];
  try {
    const { workflowId, nodeCount } = await compileAndDeploy(automationId, N8N_BASE_URL, N8N_API_KEY);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, n8n_workflow_id: workflowId, node_count: nodeCount }));
  } catch (err) {
    console.error(`[compile ${automationId}]`, err.message);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: err.message }));
  }
});

server.listen(PORT, () => console.log(`Compiler server listening on http://localhost:${PORT}`));

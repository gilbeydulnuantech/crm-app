#!/usr/bin/env node
// CLI wrapper around compile-lib.cjs — for manually compiling one automation.
// Usage: node --env-file=.env compile-automation.cjs <automationId>
// (compiler-server.cjs is the one the CRM's save-automation flow calls automatically.)

const { compileAndDeploy } = require('./compile-lib.cjs');

const N8N_BASE_URL = process.env.N8N_BASE_URL || 'http://localhost:5678';
const N8N_API_KEY = process.env.N8N_API_KEY;

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
  const { workflowId, nodeCount } = await compileAndDeploy(automationId, N8N_BASE_URL, N8N_API_KEY);
  console.log(`Compiled — ${nodeCount} nodes. Deployed and activated as n8n workflow ${workflowId}.`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

// pm2 process definitions for this app's standalone Node services — the
// small HTTP servers n8n workflows call over localhost for work that can't
// run inside n8n's sandboxed Code node (see each script's own header
// comment for why). Cross-platform replacement for the old macOS-only
// LaunchAgent: `npm run services:start` brings all of these up the same
// way on any machine, instead of hand-authoring an OS-specific service
// file per script.
//
// One-time setup on a new machine:
//   npm install
//   npm run services:start
//   npx pm2 save          # remembers this process list
//   npx pm2 startup       # prints the one OS-specific command to run so
//                          # pm2 itself (and these apps) come back after a
//                          # reboot — this is the one step that can't be
//                          # avoided on any process manager, any OS.
const path = require('path');
const SCRIPTS_DIR = path.join(__dirname, 'n8n-workflows', 'scripts');

module.exports = {
  apps: [
    {
      name: 'observability-server',
      cwd: SCRIPTS_DIR,
      script: 'observability-server.cjs',
      autorestart: true,
    },
    {
      name: 'compiler-server',
      cwd: SCRIPTS_DIR,
      script: 'compiler-server.cjs',
      autorestart: true,
    },
    {
      name: 'pdf-server',
      cwd: SCRIPTS_DIR,
      script: 'pdf-server.cjs',
      autorestart: true,
      // Requires `npm install puppeteer` first — not currently a project
      // dependency, so this app will crash-loop until that's added.
    },
  ],
};

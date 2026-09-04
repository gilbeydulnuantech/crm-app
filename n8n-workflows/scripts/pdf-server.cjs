#!/usr/bin/env node
// Standalone Puppeteer PDF server — kept running as its own process
// alongside n8n and Vite. Puppeteer's internal error classes assign to
// error.name, which n8n's sandboxed Code node VM rejects ("Cannot assign
// to read only property 'name' of object 'Error'") — running as a real,
// separate Node process (hit over plain HTTP from n8n) sidesteps that
// entirely, no sandbox involved.
const http = require('http');
const puppeteer = require('puppeteer');

const PORT = 5680;

// Launching Chromium from scratch is most of the latency on every request
// (measured 24s+ of a ~28s total PDF-fetch step) — keep one browser warm for
// the life of this process and just open/close a page per request instead.
// Re-launches lazily if the browser ever crashes/disconnects.
let browserPromise = null;
function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  }
  return browserPromise;
}

async function launchBrowser() {
  const browser = await getBrowser();
  if (!browser.connected) {
    browserPromise = null;
    return getBrowser();
  }
  return browser;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname !== '/generate-pdf') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  const token = url.searchParams.get('token');
  if (!token) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Missing token query param' }));
    return;
  }

  const proposalToken = url.searchParams.get('proposalToken');
  const printUrl = new URL(`http://localhost:5173/print/contract/${token}`);
  if (proposalToken) printUrl.searchParams.set('proposal', proposalToken);

  let page;
  try {
    const browser = await launchBrowser();
    page = await browser.newPage();
    // Stripe's fraud-detection script (js.stripe.com plus its
    // m.stripe.network/m.stripe.com telemetry follow-ups) was a large chunk
    // of the render time here — one of those requests alone measured 12.5s,
    // almost certainly Stripe slow-walking a detected headless/automated
    // browser. This page is a static snapshot of an already-signed
    // document — nothing on it is ever interactive, so there's no
    // legitimate reason for Stripe to load here at all; block it outright.
    await page.setRequestInterception(true);
    page.on('request', (r) => {
      const host = new URL(r.url()).hostname;
      if (/(^|\.)(js\.stripe\.com|m\.stripe\.network|m\.stripe\.com)$/.test(host)) {
        r.abort();
      } else {
        r.continue();
      }
    });
    await page.goto(printUrl.toString(), { waitUntil: 'networkidle0', timeout: 30000 });
    const pdfBuffer = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: { top: '40px', bottom: '40px', left: '40px', right: '40px' },
    });
    res.writeHead(200, { 'Content-Type': 'application/pdf' });
    res.end(Buffer.from(pdfBuffer));
  } catch (err) {
    console.error(err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message || 'Failed to generate PDF.' }));
  } finally {
    if (page) await page.close();
  }
});

server.listen(PORT, () => console.log(`PDF server listening on http://localhost:${PORT}`));

// Launch eagerly so the first real request doesn't pay the cold-start cost.
getBrowser().catch((err) => console.error('Failed to pre-launch browser:', err));

async function shutdown() {
  if (browserPromise) {
    try {
      const browser = await browserPromise;
      await browser.close();
    } catch {
      // already gone
    }
  }
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

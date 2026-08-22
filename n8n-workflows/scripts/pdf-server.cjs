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

  let browser;
  try {
    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.goto(`http://localhost:5173/print/contract/${token}`, { waitUntil: 'networkidle0', timeout: 30000 });
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
    if (browser) await browser.close();
  }
});

server.listen(PORT, () => console.log(`PDF server listening on http://localhost:${PORT}`));

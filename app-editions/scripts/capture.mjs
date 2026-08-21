// Usage: node scripts/capture.mjs <url> <out.png>
// Drives Edge via puppeteer-core: loads, waits, scrolls the full page to trigger lazy/scroll
// content, screenshots full-page, and reports console errors + failed requests for debugging.
import puppeteer from 'puppeteer-core';

const url = process.argv[2] || 'http://localhost:3000/editions/winter-2026';
const out = process.argv[3] || 'C:\\Users\\ACER\\AppData\\Local\\Temp\\cap.png';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

void EDGE;
// Connect to an already-running Edge (launched with --remote-debugging-port=9222).
const ver = await (await fetch('http://localhost:9222/json/version')).json();
const browser = await puppeteer.connect({
  browserWSEndpoint: ver.webSocketDebuggerUrl,
  protocolTimeout: 120000,
  defaultViewport: { width: 1440, height: 900 },
});
const page = await browser.newPage();
const errors = [], failed = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
page.on('pageerror', (e) => errors.push('PAGEERR: ' + e.message.slice(0, 200)));
page.on('requestfailed', (r) => failed.push(`${r.failure()?.errorText} ${r.url().slice(0, 120)}`));

try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
} catch (e) { console.log('goto note:', e.message.slice(0, 120)); }
await new Promise((r) => setTimeout(r, 6000)); // let hydration + animations settle
await page.screenshot({ path: out, fullPage: false });
console.log('shot:', out);
console.log('scrollHeight:', await page.evaluate(() => document.body.scrollHeight));
console.log('console errors:', errors.length);
errors.slice(0, 15).forEach((e) => console.log('  ERR', e));
const failedAssets = failed.filter((f) => /\.(png|jpe?g|webp|svg|mp4|webm|woff2?|js|css)/i.test(f));
console.log('failed requests:', failed.length, '(asset-ish:', failedAssets.length + ')');
[...new Set(failedAssets)].slice(0, 15).forEach((f) => console.log('  FAIL', f));
await page.close();
await browser.disconnect();

// Lightweight hydration check: connect to running Edge, load, wait, report DOM state + errors.
// No screenshot (screenshots hang on the continuous-rAF WebGL page).
import puppeteer from 'puppeteer-core';
const url = process.argv[2] || 'http://localhost:3000/editions/winter2026';
const ver = await (await fetch('http://localhost:9222/json/version')).json();
const browser = await puppeteer.connect({ browserWSEndpoint: ver.webSocketDebuggerUrl, protocolTimeout: 60000, defaultViewport: { width: 1440, height: 900 } });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message.slice(0, 160)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 40000 }); } catch (e) { console.log('goto:', e.message.slice(0, 80)); }
await new Promise((r) => setTimeout(r, 7000));
const info = await page.evaluate(() => ({
  title: document.title,
  scrollH: document.body.scrollHeight,
  appError: document.body.innerText.includes('Application Error'),
  shopify: (document.body.innerText.match(/Shopify/g) || []).length,
  hellens: (document.body.innerText.match(/Hellens/g) || []).length,
  imgs: document.querySelectorAll('img').length,
  canvases: document.querySelectorAll('canvas').length,
  firstText: document.body.innerText.replace(/\s+/g, ' ').slice(0, 160),
}));
console.log(JSON.stringify(info, null, 2));
console.log('errors:', errors.length);
[...new Set(errors)].slice(0, 8).forEach((e) => console.log('  ERR', e));
await page.close();
await browser.disconnect();

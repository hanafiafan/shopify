// Complete the offline mirror: load each edition, collect any 404 (lazy chunks/fonts HTTrack
// never crawled), fetch them from the live CDN into public/, and repeat until no 404s remain
// (a fetched chunk may import further chunks). Localizes baked cdn URLs in fetched js/css.
// Requires: dev server on :3000 and Edge on --remote-debugging-port=9222.
import puppeteer from 'puppeteer-core';
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

const PUB = resolve('public');
const urls = process.argv.slice(2);
const ver = await (await fetch('http://localhost:9222/json/version')).json();
const browser = await puppeteer.connect({ browserWSEndpoint: ver.webSocketDebuggerUrl, protocolTimeout: 90000 });

async function fetchTo(pathname) {
  const parts = pathname.replace(/^\//, '').split('/');
  const host = parts.shift();
  const remote = `https://${host}/${parts.join('/')}`;
  const dest = join(PUB, pathname.replace(/^\//, ''));
  if (existsSync(dest)) return 'exists';
  try {
    const r = await fetch(remote, { signal: AbortSignal.timeout(30000) });
    if (!r.ok) return `FAIL ${r.status}`;
    const buf = Buffer.from(await r.arrayBuffer());
    await mkdir(dirname(dest), { recursive: true });
    if (/\.(js|css)$/i.test(dest)) {
      let t = buf.toString('utf8');
      if (t.includes('https://cdn.shopify.com')) t = t.split('https://cdn.shopify.com').join('/cdn.shopify.com');
      await writeFile(dest, t);
    } else await writeFile(dest, buf);
    return 'fetched';
  } catch (e) { return `ERR ${e.message.slice(0, 40)}`; }
}

let totalFetched = 0;
for (const url of urls) {
  for (let iter = 0; iter < 6; iter++) {
    const page = await browser.newPage();
    const nf = new Set();
    page.on('response', (r) => { if (r.status() === 404) { try { nf.add(new URL(r.url()).pathname); } catch {} } });
    try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 40000 }); } catch {}
    await new Promise((r) => setTimeout(r, 5000));
    await page.close();
    if (!nf.size) { console.log(`${url}: clean (iter ${iter})`); break; }
    console.log(`${url}: iter ${iter} — ${nf.size} 404s`);
    for (const p of nf) {
      const res = await fetchTo(p);
      if (res === 'fetched') totalFetched++;
      console.log('   ', res, p.slice(0, 90));
    }
  }
}
console.log(`\nTOTAL fetched: ${totalFetched}`);
await browser.disconnect();

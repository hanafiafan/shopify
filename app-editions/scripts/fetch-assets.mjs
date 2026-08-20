import { readFile, writeFile, mkdir, copyFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, extname, resolve, dirname } from 'node:path';

const SCRAPE_ROOT = resolve('..');                              // d:\WEB\sopify
const EDITIONS_DIR = join(SCRAPE_ROOT, 'www.shopify.com', 'editions');
const OUT = resolve('public', 'assets');
const EXT = 'png|jpe?g|webp|svg|gif|mp4|webm';

function collectRefs(text) {
  const refs = new Set();
  const attrRe = new RegExp(`(?:src|href|content)="([^"]+?\\.(?:${EXT})(?:\\?[^"]*)?)"`, 'gi');
  const srcsetRe = /srcset="([^"]+)"/gi;
  const absRe = new RegExp(`https?:\\/\\/[^"')\\s]+?\\.(?:${EXT})(?:\\?[^"')\\s]*)?`, 'gi');
  const extTest = new RegExp(`\\.(?:${EXT})(?:\\?|$)`, 'i');
  for (const m of text.matchAll(attrRe)) refs.add(m[1]);
  for (const m of text.matchAll(srcsetRe))
    for (const part of m[1].split(',')) {
      const u = part.trim().split(/\s+/)[0];
      if (u && extTest.test(u)) refs.add(u);
    }
  for (const m of text.matchAll(absRe)) refs.add(m[0]);
  return refs;
}

const stripQuery = (u) => u.split('?')[0].split('#')[0];
const cleanExt = (u) => extname(stripQuery(u)) || '.bin';
const localName = (ref) => createHash('sha1').update(ref).digest('hex').slice(0, 16) + cleanExt(ref);
const toRemote = (ref) => 'https://' + ref.replace(/^(\.\.\/)+/, '');

function toLocal(ref, htmlPath) {
  if (/^https?:/i.test(ref)) {
    const u = new URL(ref);
    return join(SCRAPE_ROOT, u.host, decodeURIComponent(u.pathname).replace(/^\//, ''));
  }
  return stripQuery(resolve(dirname(htmlPath), ref));
}

async function findHtml(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await findHtml(p));
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const map = {}, missing = [];
let copied = 0, downloaded = 0;
await mkdir(OUT, { recursive: true });

for (const html of await findHtml(EDITIONS_DIR)) {
  const text = await readFile(html, 'utf8');
  for (const ref of collectRefs(text)) {
    if (map[ref]) continue;
    const name = localName(ref), dest = join(OUT, name);
    map[ref] = `/assets/${name}`;
    if (existsSync(dest)) continue;
    const local = toLocal(ref, html);
    if (existsSync(local)) {
      // ponytail: copy can fail on Windows MAX_PATH (>260 char scrape paths); fall through to network
      try { await copyFile(local, dest); copied++; continue; } catch { /* fall through to fetch */ }
    }
    const remote = /^https?:/i.test(ref) ? ref : toRemote(ref);
    try {
      // ponytail: 30s cap per request so one dead connection/huge video can't hang the whole run
      const r = await fetch(remote, { signal: AbortSignal.timeout(30000) });
      if (!r.ok) { missing.push(`${ref} -> ${remote} (HTTP ${r.status})`); continue; }
      await writeFile(dest, Buffer.from(await r.arrayBuffer())); downloaded++;
    } catch (e) { missing.push(`${ref} -> ${remote} (${e.name === 'TimeoutError' ? 'timeout after 30s' : e.message})`); }
  }
}

await writeFile('asset-map.json', JSON.stringify(map, null, 2));
console.log(`assets: ${copied} copied, ${downloaded} downloaded, ${Object.keys(map).length} total`);
if (missing.length) {
  console.error(`MISSING (${missing.length}):\n` + missing.slice(0, 60).join('\n'));
  process.exit(1);
}
console.log('all assets resolved ✓');

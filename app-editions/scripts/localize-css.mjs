// Usage: node scripts/localize-css.mjs <src-css-relative-to-scrape-root> <out-basename>
// Copies a scraped CSS into app/vendor/<out-basename>.css, localizing every url()
// (skips data: URIs). Missing assets are fetched from the reconstructed CDN URL.
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, extname, resolve, dirname, relative, sep } from 'node:path';

const SCRAPE_ROOT = resolve('..');
const OUT_ASSETS = resolve('public', 'assets');
const OUT_CSS = resolve('app', 'vendor');
const [srcRel, outBase] = process.argv.slice(2);
if (!srcRel || !outBase) { console.error('usage: localize-css.mjs <src-css> <out-basename>'); process.exit(1); }

const srcPath = join(SCRAPE_ROOT, srcRel);
const cssDir = dirname(srcPath);
const stripQ = (u) => u.split('?')[0].split('#')[0];
const cleanExt = (u) => extname(stripQ(u)) || '.bin';
const nameFor = (ref) => createHash('sha1').update(ref).digest('hex').slice(0, 16) + cleanExt(ref);

await mkdir(OUT_ASSETS, { recursive: true });
await mkdir(OUT_CSS, { recursive: true });

let css = await readFile(srcPath, 'utf8');
const refs = [...css.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g)].map((m) => m[2]);
const missing = [];

for (const raw of new Set(refs)) {
  if (raw.startsWith('data:')) continue;
  const local = nameFor(raw);
  const dest = join(OUT_ASSETS, local);
  if (!existsSync(dest)) {
    const abs = /^https?:/i.test(raw) ? null : stripQ(resolve(cssDir, raw));
    if (abs && existsSync(abs)) { try { await copyFile(abs, dest); } catch {} }
    if (!existsSync(dest)) {
      const remote = /^https?:/i.test(raw)
        ? raw
        : 'https://' + relative(SCRAPE_ROOT, abs).split(sep).join('/');
      try {
        const r = await fetch(remote, { signal: AbortSignal.timeout(30000) });
        if (r.ok) await writeFile(dest, Buffer.from(await r.arrayBuffer()));
        else missing.push(`${raw} -> ${remote} (HTTP ${r.status})`);
      } catch (e) { missing.push(`${raw} -> ${remote} (${e.message})`); }
    }
  }
  css = css.split(raw).join(`/assets/${local}`);
}

await writeFile(join(OUT_CSS, `${outBase}.css`), css);
console.log(`${outBase}.css: ${new Set(refs).size} url() refs, ${missing.length} missing`);
if (missing.length) console.error('MISSING:\n' + missing.join('\n'));

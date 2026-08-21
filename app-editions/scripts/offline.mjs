// One-time offline preparation: make public/ a fully self-contained local mirror.
//  1) Place every downloaded asset (asset-map: url -> /assets/<hash>) at public/<host>/<path>.
//  2) Rewrite baked absolute "https://cdn.shopify.com" inside every .js/.css under
//     public/cdn.shopify.com to the local root-relative "/cdn.shopify.com" (so the module graph
//     and CSS load from one local origin — no external CDN, no dual-React).
//  3) Fetch the handful of @font-face woff2/ttf referenced by the served CSS to their local paths.
import { readFile, writeFile, mkdir, copyFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve, dirname, extname } from 'node:path';

const PUB = resolve('public');
const map = JSON.parse(await readFile('asset-map.json', 'utf8'));

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p));
    else out.push(p);
  }
  return out;
}

// 1) place downloaded assets at their original host paths
let placed = 0, srcMissing = 0;
for (const [url, local] of Object.entries(map)) {
  if (!/^https?:/i.test(url)) continue; // relative refs are already inside the copied cdn tree
  const u = new URL(url);
  const dest = join(PUB, u.host, decodeURIComponent(u.pathname).replace(/^\//, ''));
  if (existsSync(dest)) continue;
  const src = join(PUB, local.replace(/^\//, '')); // public/assets/<hash>
  if (!existsSync(src)) { srcMissing++; continue; }
  await mkdir(dirname(dest), { recursive: true });
  await copyFile(src, dest);
  placed++;
}
console.log(`assets placed: ${placed} (source missing: ${srcMissing})`);

// 2) rewrite baked absolute cdn URLs in js/css -> local root-relative
let rewritten = 0;
const cdnFiles = await walk(join(PUB, 'cdn.shopify.com'));
for (const f of cdnFiles) {
  if (!/\.(js|css)$/i.test(f)) continue;
  let t = await readFile(f, 'utf8');
  if (t.includes('https://cdn.shopify.com')) {
    await writeFile(f, t.split('https://cdn.shopify.com').join('/cdn.shopify.com'));
    rewritten++;
  }
}
console.log(`js/css rewritten to local origin: ${rewritten}`);

// 3) fetch fonts referenced by served CSS (now local root-relative) to their local paths
let fontsOk = 0, fontsFail = 0;
for (const f of cdnFiles) {
  if (!/\.css$/i.test(f)) continue;
  const t = await readFile(f, 'utf8');
  for (const m of t.matchAll(/url\((\/cdn\.shopify\.com\/[^)'"]+\.(?:woff2?|ttf))\)/gi)) {
    const localPath = m[1];
    const dest = join(PUB, localPath.replace(/^\//, ''));
    if (existsSync(dest)) continue;
    const remote = 'https:/' + localPath; // /cdn.shopify.com/x -> https://cdn.shopify.com/x
    try {
      const r = await fetch(remote, { signal: AbortSignal.timeout(30000) });
      if (!r.ok) { fontsFail++; console.error(`font ${r.status}: ${remote}`); continue; }
      await mkdir(dirname(dest), { recursive: true });
      await writeFile(dest, Buffer.from(await r.arrayBuffer()));
      fontsOk++;
    } catch (e) { fontsFail++; console.error(`font err: ${remote} ${e.message}`); }
  }
}
console.log(`fonts fetched: ${fontsOk} (failed: ${fontsFail})`);
void extname;

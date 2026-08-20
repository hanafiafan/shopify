# Hellens Editions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the HTTrack-scraped Shopify Editions pages as a modern Next.js + Tailwind site, rebranded to "Hellens", running fully offline from local assets.

**Architecture:** Next.js App Router app in `app-editions/`, one route per edition. Shared shell (`SiteNav`, `SiteFooter`) + one component per page section. A Node asset pipeline copies local scrape images and re-fetches missing formats (webp/svg/video/font) from `cdn.shopify.com`. Animations via Lenis + anime.js; Three.js/Theatre.js hero best-effort.

**Tech Stack:** Next.js (App Router, TypeScript), Tailwind CSS, Lenis, anime.js, Three.js (hero only), Node (scripts).

## Global Constraints

- App lives in `d:\WEB\sopify\app-editions\`; the scrape (`www.shopify.com/`, `cdn.shopify.com/`, etc.) is **read-only source**, never modified.
- Brand name: replace every visible "Shopify" → "Hellens". `© Shopify Inc` → `© Hellens Inc`. Visible `shopify.com` → `hellens.dev`.
- Feature/product names (Sidekick, Shop app, B2B, Checkout, Marketing, Finance, Shipping, Developer) **unchanged**.
- External deep links to `help.shopify.com` / `shopify.dev` / `apps.shopify.com` left as-is.
- Brand assets source: `C:\Users\ACER\Downloads\72ppi\`. Mark SVG preferred where it scales.
- All referenced assets must resolve to `/assets/...` or `/brand/...` locally (offline-complete). No unresolved remote refs on a completed page.
- Node scripts must be cross-platform (Windows host); no bash-only syntax.

---

### Task 1: Project scaffold + git

**Files:**
- Create: `app-editions/` (via create-next-app)
- Create: `app-editions/.gitignore` (default from create-next-app)
- Modify: `app-editions/app/globals.css` (strip default boilerplate to empty Tailwind layers)

**Interfaces:**
- Produces: a running Next.js app with Tailwind, App Router, TypeScript at `app-editions/`.

- [ ] **Step 1: Init git at repo root** (commits need a repo; env starts non-git)

Run: `git init` (in `d:\WEB\sopify`)
Expected: `Initialized empty Git repository`

- [ ] **Step 2: Add a root .gitignore excluding the scrape + node_modules**

Create `d:\WEB\sopify\.gitignore`:
```gitignore
node_modules/
app-editions/node_modules/
app-editions/.next/
# scrape source is large + copyrighted — keep out of history
www.shopify.com/
cdn.shopify.com/
embed-ssl.wistia.com/
www.gstatic.com/
hts-cache/
*.gif
hts-log.txt
cookies.txt
```

- [ ] **Step 3: Scaffold Next.js app**

Run (in `d:\WEB\sopify`):
`npx create-next-app@latest app-editions --ts --tailwind --app --eslint --no-src-dir --import-alias "@/*" --use-npm`
Expected: project created, `npm install` completes.

- [ ] **Step 4: Verify dev server boots**

Run: `cd app-editions && npm run dev`
Expected: server starts on `http://localhost:3000`, default page renders. Stop it (Ctrl+C).

- [ ] **Step 5: Reset globals.css to bare Tailwind**

Replace `app-editions/app/globals.css` contents with:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 6: Commit**

```bash
git add .gitignore app-editions
git commit -m "chore: scaffold Next.js + Tailwind app for Hellens Editions"
```

---

### Task 2: Asset pipeline + Hellens brand assets

**Files:**
- Create: `app-editions/scripts/fetch-assets.mjs`
- Create: `app-editions/public/brand/` (Hellens logos)
- Create: `app-editions/public/assets/` (populated by script)
- Create: `app-editions/asset-map.json` (generated)

**Interfaces:**
- Produces: `asset-map.json` mapping original URL → local `/assets/<hash>.<ext>`; all assets present under `public/`.
- Consumes: scrape HTML at `../www.shopify.com/editions/*.html`; brand PNG/SVG at `C:\Users\ACER\Downloads\72ppi\`.

- [ ] **Step 1: Copy Hellens brand assets into `public/brand/`**

Copy and rename (PowerShell):
```powershell
$src = "C:\Users\ACER\Downloads\72ppi"
$dst = "app-editions\public\brand"
New-Item -ItemType Directory -Force $dst | Out-Null
Copy-Item "$src\New folder\SVG\Asset 7.svg" "$dst\mark-outline.svg"
Copy-Item "$src\New folder\SVG\Asset 8.svg" "$dst\mark-white.svg"
Copy-Item "$src\Asset 3@72x.png" "$dst\mark.png"
Copy-Item "$src\Asset 2@72x.png" "$dst\logo-horizontal.png"
Copy-Item "$src\Asset 1@72x.png" "$dst\logo-vertical.png"
Copy-Item "$src\Asset 4@72x.png" "$dst\wordmark.png"
```
Expected: 6 files in `public/brand/`.

- [ ] **Step 2: Write `scripts/fetch-assets.mjs`**

```js
// Collects every asset URL referenced by the scraped edition HTML + scraped CSS,
// copies local scrape files into public/assets, downloads missing ones from cdn.shopify.com,
// writes asset-map.json, and asserts every required asset resolves.
import { readFile, writeFile, mkdir, copyFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, extname, resolve } from 'node:path';

const SCRAPE_ROOT = resolve('..');                 // d:\WEB\sopify
const EDITIONS_DIR = join(SCRAPE_ROOT, 'www.shopify.com', 'editions');
const OUT = resolve('public', 'assets');
const ASSET_RE = /https?:\/\/[^"')\s]+?\.(?:png|jpe?g|webp|svg|gif|mp4|webm|woff2?|ttf)/gi;
const REL_RE = /(?:src|href)="((?:\.\.\/|\/)[^"]+?\.(?:png|jpe?g|webp|svg|gif|mp4|webm))"/gi;

const localName = (url) => {
  const ext = extname(new URL(url, 'https://x').pathname) || '.bin';
  return createHash('sha1').update(url).digest('hex').slice(0, 16) + ext;
};

async function findHtml(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await findHtml(p));
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

// Resolve a scrape-relative asset ref (as HTTrack rewrote it) to an absolute local path.
function localPathFor(url, htmlPath) {
  if (url.startsWith('http')) {
    // HTTrack mirrors remote hosts under folders named after the host.
    const u = new URL(url);
    return join(SCRAPE_ROOT, u.host, u.pathname.replace(/^\//, ''));
  }
  return resolve(join(htmlPath, '..', url)); // relative ref
}

const map = {};
const missing = [];
let downloaded = 0, copied = 0;

await mkdir(OUT, { recursive: true });
const htmlFiles = await findHtml(EDITIONS_DIR);

for (const html of htmlFiles) {
  const text = await readFile(html, 'utf8');
  const urls = new Set();
  for (const m of text.matchAll(ASSET_RE)) urls.add(m[0]);
  for (const m of text.matchAll(REL_RE)) urls.add(m[1]);

  for (const url of urls) {
    if (map[url]) continue;
    const name = localName(url);
    const dest = join(OUT, name);
    map[url] = `/assets/${name}`;
    if (existsSync(dest)) continue;

    const src = localPathFor(url, html);
    if (existsSync(src)) {
      await copyFile(src, dest); copied++; continue;
    }
    if (!url.startsWith('http')) { missing.push(url); continue; }
    try {
      const res = await fetch(url);
      if (!res.ok) { missing.push(`${url} (HTTP ${res.status})`); continue; }
      await writeFile(dest, Buffer.from(await res.arrayBuffer())); downloaded++;
    } catch (e) { missing.push(`${url} (${e.message})`); }
  }
}

await writeFile('asset-map.json', JSON.stringify(map, null, 2));
console.log(`assets: ${copied} copied, ${downloaded} downloaded, ${Object.keys(map).length} total`);
if (missing.length) {
  console.error(`MISSING (${missing.length}):\n` + missing.join('\n'));
  process.exit(1); // self-check: fail if anything unresolved
}
console.log('all assets resolved ✓');
```

- [ ] **Step 3: Run the pipeline**

Run: `cd app-editions && node scripts/fetch-assets.mjs`
Expected: prints counts, ends `all assets resolved ✓`, exit 0. `asset-map.json` created, `public/assets/` populated. If it exits 1 with a MISSING list, investigate those URLs (CDN 404 → find a fallback ref or record as an accepted gap in the spec) before continuing.

- [ ] **Step 4: Commit**

```bash
git add app-editions/scripts app-editions/public/brand app-editions/asset-map.json
git commit -m "feat: asset pipeline + Hellens brand assets"
```
(Note: `public/assets/` is git-ignored if large — add `app-editions/public/assets/` to `.gitignore` and keep it local. `asset-map.json` is the reproducible record.)

---

### Task 3: Port fonts + base CSS

**Files:**
- Create: `app-editions/app/fonts.css` (or `@font-face` in globals)
- Modify: `app-editions/app/globals.css`
- Modify: `app-editions/tailwind.config.ts`

**Interfaces:**
- Produces: Tailwind theme extended with the scraped font families + any custom colors; `@font-face` pointing at `/assets/<hash>.woff2`.

- [ ] **Step 1: Extract font-face + custom properties from scraped CSS**

Read `../cdn.shopify.com/.../fonts-latin-*.css` and `styles-*.css`. Copy the `@font-face` blocks into `app/fonts.css`, rewriting each `url(...)` woff2 reference to its `/assets/<hash>.woff2` value from `asset-map.json`.

- [ ] **Step 2: Import fonts + set body defaults in globals.css**

```css
@import "./fonts.css";
@tailwind base;
@tailwind components;
@tailwind utilities;

:root { color-scheme: light; }
body { font-family: var(--font-body, system-ui, sans-serif); }
```

- [ ] **Step 3: Extend Tailwind theme**

In `tailwind.config.ts`, add the font families + any brand colors pulled from the scraped Tailwind config (grep the scraped `tailwind-*.css` for CSS variables / custom colors and mirror the ones actually used).

- [ ] **Step 4: Verify a text sample renders in the scraped typeface**

Temporarily drop a heading in `app/page.tsx`, run `npm run dev`, confirm the font loads (Network tab: woff2 200 from `/assets/`). Revert the temp heading.

- [ ] **Step 5: Commit**

```bash
git add app-editions/app app-editions/tailwind.config.ts
git commit -m "feat: port fonts and base CSS"
```

---

### Task 4: Global layout — Lenis + Hellens metadata

**Files:**
- Create: `app-editions/lib/animate/LenisProvider.tsx`
- Modify: `app-editions/app/layout.tsx`
- Create: `app-editions/app/icon.png` (favicon = brand mark)

**Interfaces:**
- Produces: `<LenisProvider>` client component wrapping children with smooth scroll; root metadata titled "Hellens Editions".
- Consumes: `public/brand/mark.png`.

- [ ] **Step 1: Install Lenis**

Run: `npm i lenis`

- [ ] **Step 2: Write `lib/animate/LenisProvider.tsx`**

```tsx
'use client';
import { useEffect } from 'react';
import Lenis from 'lenis';

export default function LenisProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const lenis = new Lenis({ smoothWheel: true });
    let raf = 0;
    const loop = (t: number) => { lenis.raf(t); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); lenis.destroy(); };
  }, []);
  return <>{children}</>;
}
```

- [ ] **Step 3: Set favicon**

Copy `public/brand/mark.png` → `app/icon.png` (Next.js App Router auto-serves `app/icon.png` as favicon).

- [ ] **Step 4: Update `app/layout.tsx`**

```tsx
import './globals.css';
import type { Metadata } from 'next';
import LenisProvider from '@/lib/animate/LenisProvider';

export const metadata: Metadata = {
  title: 'Hellens Editions',
  description: 'A new world of commerce. 150+ product updates.',
  openGraph: { title: 'Hellens Editions', siteName: 'Hellens' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body><LenisProvider>{children}</LenisProvider></body>
    </html>
  );
}
```

- [ ] **Step 5: Verify**

Run `npm run dev`, confirm tab shows "Hellens Editions" + mark favicon, and scrolling on a tall stub page is smooth.

- [ ] **Step 6: Commit**

```bash
git add app-editions/lib app-editions/app
git commit -m "feat: global layout with Lenis smooth scroll + Hellens identity"
```

---

### Task 5: SiteNav (Hellens logo + editions switcher)

**Files:**
- Create: `app-editions/components/SiteNav.tsx`
- Create: `app-editions/lib/editions.ts`

**Interfaces:**
- Produces: `EDITIONS` list `{ slug, label, tagline }[]`; `<SiteNav current={slug} />`.
- Consumes: `public/brand/logo-horizontal.png`, `public/brand/mark.png`.

- [ ] **Step 1: Define the editions registry `lib/editions.ts`**

```ts
export type Edition = { slug: string; label: string; tagline: string };
export const EDITIONS: Edition[] = [
  { slug: 'winter-2026', label: "Winter '26", tagline: 'Renaissance' },
  { slug: 'summer-2025', label: "Summer '25", tagline: 'Horizons' },
  { slug: 'winter-2025', label: "Winter '25", tagline: 'Boring' },
  // add others as pages are built
];
```

- [ ] **Step 2: Write `components/SiteNav.tsx`**

Port the scraped nav DOM structure (grep the `<header>`/nav region in `winter2026.html`), replacing the Shopify logo `<img>`/`<svg>` with:
```tsx
import Image from 'next/image';
import Link from 'next/link';
import { EDITIONS } from '@/lib/editions';

export default function SiteNav({ current }: { current: string }) {
  return (
    <header className="/* ported nav classes */">
      <Link href="/" aria-label="Hellens">
        <Image src="/brand/logo-horizontal.png" alt="Hellens" width={160} height={32}
               className="hidden md:block" priority />
        <Image src="/brand/mark.png" alt="Hellens" width={32} height={32}
               className="md:hidden" priority />
      </Link>
      <nav>{/* Editions switcher from EDITIONS, highlight current */}</nav>
      {/* Start for free button — text kept, links to "/" */}
    </header>
  );
}
```
Replace "Shopify.com" text → "hellens.dev". Keep "Start for free", "Sidekick", etc.

- [ ] **Step 3: Verify on a stub page**

Render `<SiteNav current="winter-2026" />` in `app/page.tsx`, confirm Hellens logo shows and switcher lists editions.

- [ ] **Step 4: Commit**

```bash
git add app-editions/components app-editions/lib
git commit -m "feat: SiteNav with Hellens branding + editions switcher"
```

---

### Task 6: SiteFooter

**Files:**
- Create: `app-editions/components/SiteFooter.tsx`

**Interfaces:**
- Produces: `<SiteFooter />`.
- Consumes: `public/brand/logo-vertical.png`.

- [ ] **Step 1: Write `components/SiteFooter.tsx`**

Port the scraped footer DOM. Replace logo with `public/brand/logo-vertical.png`, `© Shopify Inc` → `© Hellens Inc`, keep "Terms of Service" / "Privacy Policy" links (point to `/`). Keep feature-name columns unchanged.

- [ ] **Step 2: Verify**

Render under the stub page, confirm Hellens logo + `© Hellens Inc`.

- [ ] **Step 3: Commit**

```bash
git add app-editions/components/SiteFooter.tsx
git commit -m "feat: SiteFooter with Hellens branding"
```

---

### Task 7: Page-extraction helper + reveal animation primitive

**Files:**
- Create: `app-editions/scripts/extract-page.mjs`
- Create: `app-editions/lib/animate/useReveal.ts`

**Interfaces:**
- Produces: `extract-page.mjs <edition-slug>` → prints the SSR body HTML for that edition with (a) asset URLs rewritten via `asset-map.json`, (b) "Shopify" → "Hellens" in text nodes, for hand-porting into section components.
- Produces: `useReveal()` hook returning a `ref` that fades/translates its element in on scroll via anime.js + IntersectionObserver.

- [ ] **Step 1: Install anime.js**

Run: `npm i animejs @types/animejs`

- [ ] **Step 2: Write `lib/animate/useReveal.ts`**

```ts
'use client';
import { useEffect, useRef } from 'react';
import anime from 'animejs';

export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.opacity = '0';
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      anime({ targets: el, opacity: [0, 1], translateY: [24, 0], duration: 700, easing: 'easeOutCubic' });
      io.disconnect();
    }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}
```

- [ ] **Step 3: Write `scripts/extract-page.mjs`**

```js
// Usage: node scripts/extract-page.mjs winter2026
import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const slug = process.argv[2];
if (!slug) { console.error('usage: extract-page.mjs <edition-html-basename>'); process.exit(1); }
const map = JSON.parse(await readFile('asset-map.json', 'utf8'));
const html = await readFile(resolve('..', 'www.shopify.com', 'editions', `${slug}.html`), 'utf8');

let out = html;
for (const [url, local] of Object.entries(map)) out = out.split(url).join(local);
// Rewrite brand name in text — conservative: whole-word Shopify not inside a URL/attr is hard
// with regex, so this is a first pass; final copy edits happen in the component by hand.
out = out.replace(/Shopify/g, 'Hellens').replace(/shopify\.com/g, 'hellens.dev');
process.stdout.write(out);
```
`ponytail: blanket Shopify→Hellens replace also hits feature copy that mentions Shopify by design; the per-section hand-port is where feature names (Sidekick etc.) are confirmed unchanged. Upgrade path: a proper DOM walker if the blanket pass proves too noisy.`

- [ ] **Step 4: Smoke-test the helper**

Run: `node scripts/extract-page.mjs winter2026 > /tmp/w26.html`
Expected: file written, asset URLs now `/assets/...`, "Shopify" replaced. Used as reference for the port (not shipped directly).

- [ ] **Step 5: Commit**

```bash
git add app-editions/scripts/extract-page.mjs app-editions/lib/animate/useReveal.ts
git commit -m "feat: page-extraction helper + scroll reveal primitive"
```

---

### Task 8: Winter '26 — hero section

**Files:**
- Create: `app-editions/components/sections/Hero.tsx`
- Create: `app-editions/lib/animate/hero3d.ts` (only if the hero needs Three.js)

**Interfaces:**
- Produces: `<Hero />` for Winter '26 ("The Renaissance Edition / A new world of commerce. 150+ product updates.").
- Consumes: `useReveal`, hero assets from `public/assets/`.

- [ ] **Step 1: Identify the hero DOM + assets**

From the extracted `w26.html`, isolate the first `<section>` (hero). Note its background asset(s), heading, subcopy, CTA.

- [ ] **Step 2: Build `Hero.tsx` with ported markup + Tailwind classes**

Reproduce the hero layout using the ported class names and `/assets/...` image/video refs. Use `next/image` for images, native `<video autoPlay muted loop playsInline>` for background video. Heading text: "The Renaissance Edition"; subcopy "A new world of commerce. 150+ product updates."

- [ ] **Step 3: Best-effort motion**

If the original hero used a Three.js/Theatre.js canvas, add a lightweight equivalent in `hero3d.ts` (client-only, dynamic import). If reproduction is infeasible from the scrape, render the static poster frame and mark:
`// ponytail: static hero poster; original Theatre.js sequence not reconstructable from scrape. Upgrade: rebuild timeline from cdn theatre project JSON if recovered.`

- [ ] **Step 4: Verify**

Wire `<SiteNav/> <Hero/> <SiteFooter/>` into `app/editions/winter-2026/page.tsx`, run `npm run dev`, load `/editions/winter-2026`. Confirm hero matches the scraped render (compare against opening `www.shopify.com/editions/winter2026.html` in a browser).

- [ ] **Step 5: Commit**

```bash
git add app-editions/components/sections/Hero.tsx app-editions/lib/animate app-editions/app/editions
git commit -m "feat: Winter '26 hero section"
```

---

### Task 9: Winter '26 — remaining sections

**Files:**
- Create: `app-editions/components/sections/<SectionName>.tsx` (one per remaining section, ~11)

**Interfaces:**
- Produces: one component per section, each self-contained, using `useReveal` for entrance.

- [ ] **Step 1: Enumerate sections**

From `w26.html`, list the remaining `<section>` blocks in order (e.g. Sidekick, and the other ~10). Name each component after its heading.

- [ ] **Step 2..N: Port each section (repeat per section)**

For each section: create `components/sections/<Name>.tsx`, port markup + Tailwind classes + `/assets/...` refs, apply the copy rewrite rule (confirm feature names unchanged), wrap the top element with a `useReveal` ref. After each, load the page and visually diff that section against the scrape. Commit per section:
```bash
git add app-editions/components/sections/<Name>.tsx
git commit -m "feat: Winter '26 <Name> section"
```

---

### Task 10: Winter '26 — assembly + offline verification

**Files:**
- Modify: `app-editions/app/editions/winter-2026/page.tsx`
- Modify: `app-editions/app/page.tsx` (redirect root → `/editions/winter-2026`)

**Interfaces:**
- Consumes: all Winter '26 section components + `SiteNav`/`SiteFooter`.

- [ ] **Step 1: Assemble the page in section order**

```tsx
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';
import Hero from '@/components/sections/Hero';
// ...import remaining sections
export default function Page() {
  return (
    <>
      <SiteNav current="winter-2026" />
      <main>
        <Hero />
        {/* remaining sections in order */}
      </main>
      <SiteFooter />
    </>
  );
}
```

- [ ] **Step 2: Root redirect**

`app/page.tsx`:
```tsx
import { redirect } from 'next/navigation';
export default function Home() { redirect('/editions/winter-2026'); }
```

- [ ] **Step 3: Production build passes**

Run: `npm run build`
Expected: build succeeds, no type/lint errors.

- [ ] **Step 4: Offline-completeness link check**

Run (checks the built page has no remaining remote asset refs):
`grep -roE "https://cdn\.shopify\.com[^\"')]+\.(png|jpe?g|webp|svg|mp4|webm|woff2?)" .next/ || echo "no remote asset refs ✓"`
Expected: `no remote asset refs ✓` (external help/dev/apps deep links are allowed; only *asset* hotlinks must be gone).

- [ ] **Step 5: Commit**

```bash
git add app-editions/app
git commit -m "feat: assemble Winter '26 page + root redirect"
```

---

### Task 11: Additional editions (repeat per edition)

**Files:**
- Create: `app-editions/app/editions/<slug>/page.tsx` per edition
- Create: reused/new section components as needed
- Modify: `app-editions/lib/editions.ts` (ensure slug present)

**Interfaces:**
- Consumes: the Task 7–10 pattern.

- [ ] **Step 1: Pick the next edition** (order confirmed with user; default: summer-2025, then winter-2025).

- [ ] **Step 2: Extract + port**

Run `node scripts/extract-page.mjs <basename>`, then repeat Task 8–10 for that edition: reuse existing section components where the layout matches, create new ones only where it differs. Apply the copy rewrite rule.

- [ ] **Step 3: Verify + commit** (per edition)

Run `npm run build` + the link check from Task 10 Step 4. Then:
```bash
git add app-editions
git commit -m "feat: <edition> page"
```

---

## Self-Review

- **Spec coverage:** scaffold (T1), asset pipeline + re-fetch (T2), fonts/CSS port (T3), global shell + Hellens identity/favicon (T4–T6), extraction + animation primitives (T7), Winter '26 full incl. best-effort hero motion (T8–T10), other editions (T11), copy rewrite rule (T5/T6/T8/T9/T11), offline-completeness check (T2 self-check + T10 link check). All spec sections mapped.
- **Placeholders:** section names in T9/T11 are intentionally enumerated at execution time from the source HTML (their exact set is data, not a design decision); every code step contains real code.
- **Type consistency:** `EDITIONS`/`Edition` (T5) reused in T11; `useReveal` (T7) used in T8–T9; `asset-map.json` (T2) consumed by T3/T7; `LenisProvider` (T4) referenced only in layout.

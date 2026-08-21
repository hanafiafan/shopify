# Hellens Editions

A rebrand of the Shopify Editions marketing pages to **Hellens** (hellens.dev),
served as **live standalone clones** through Next.js. Learning/portfolio project — not
affiliated with Shopify.

## What this is

The pages are Shopify's original Remix bundles (scraped with HTTrack), rebranded to Hellens
and served by Next.js as static HTML. The real WebGL / Theatre.js / scroll animations run
live in the browser. Next.js is the **host** here (via `next.config.ts` rewrites) — it does not
React-render these pages, because Shopify's Remix hydrates the whole document and two React
roots can't share one DOM.

Everything is served **fully offline from local files** — all JS/CSS/images/video/fonts live
under `public/` and a runtime network guard blocks any stray call to an external host. No
internet needed to view (8/9 editions make **zero** external requests; see limitations).

## Run

```bash
npm install
npm run dev        # http://localhost:3000  ( / is the Editions landing; cards link to each edition )
```

## Rebuilding the local mirror

The mirror under `public/` (`cdn.shopify.com/`, `*.myshopify.com/`, `*.wistia.com/`, `assets/`)
is git-ignored and reproducible:

```bash
# 1. asset pipeline (needs the HTTrack scrape in ../ and internet, one time)
node scripts/fetch-assets.mjs          # downloads assets the scrape missed -> public/assets
robocopy ..\cdn.shopify.com public\cdn.shopify.com /E    # writable copy of the JS/CSS/img
node scripts/offline.mjs               # place assets at host paths + localize baked cdn URLs + fonts
# 2. build the pages
for %e in (winter2026 spring2026 summer2025 winter2025 summer2024 winter2024 summer2023 winter2023 summer2022) do node scripts/build-live.mjs %e %e
# 3. heal: fetch lazy chunks/fonts HTTrack never crawled (needs dev server + Edge on :9222)
node scripts/heal-mirror.mjs http://localhost:3000/editions/winter2026 ...one URL per edition...
```

## Editions

| Route | Status |
|---|---|
| `/editions/winter2026` | ✅ live (Renaissance) |
| `/editions/spring2026` | ✅ live |
| `/editions/summer2025` | ✅ live |
| `/editions/summer2024` | ✅ live |
| `/editions/winter2024` | ✅ live |
| `/editions/summer2023` | ✅ live |
| `/editions/winter2023` | ✅ live (static, no WebGL) |
| `/editions/summer2022` | ✅ live |
| `/editions/winter2025` | ✅ live (shorter than the others; one scene is thin) |

All nine render fully offline: **0 external requests, 0 local 404s** (after the heal step), WebGL
scenes present. Remaining console noise is benign React hydration warnings (#418/#425) inherent
to hydrating a third-party bundle.

## How a page is built

`scripts/build-live.mjs <html-basename> <out-basename>` takes a scraped edition HTML and:

1. **Normalizes every `cdn.shopify.com` ref to a single origin** (the real CDN). Mixing the
   scrape's relative + absolute refs loaded two React copies → `useContext` null → "Application
   Error". One origin = one module graph.
2. Serves it at the **original pathname** (`/editions/<name>`) so Remix's client router matches
   its route manifest.
3. **Rebrands after hydration** — an injected script walks the DOM (Shopify→Hellens text,
   `Shopify.com`→`hellens.dev`), swaps the bag-glyph logo for the Hellens mark, and sets the
   title. Doing this post-hydration keeps SSR/CSR identical so hydration doesn't mismatch.

Rebuild all editions: run `build-live.mjs` per edition (see the `EDITIONS` list in
`next.config.ts`), then restart `next dev`.

## Verify

`scripts/check.mjs <url>` drives headless Edge (via `puppeteer-core`) and reports title,
scroll height, hydration state, WebGL canvas count, and console errors — used to confirm each
edition renders. Requires Edge running with `--remote-debugging-port=9222`.

## Offline verification

`scripts/check.mjs <url>` reports **external hosts contacted** and **404s**. After the heal step
all nine editions report **0 external** and **0 404s**.

Note: verify with WebGL enabled (`--use-angle=swiftshader --enable-unsafe-swiftshader`, or a real
browser). With `--disable-gpu` the GPU-detection / Background-scene chunks throw and the page
hits its error boundary — that is a headless artifact, not a real failure.

## Known, accepted limitations

- Benign React hydration warnings (#418/#425) surface on some editions — inherent to hydrating a
  third-party bundle; content still renders. Not worth chasing in code we don't own.
- `winter2025` renders but is shorter than the others (one scene is thin).
- `next dev` is unoptimized; for the smoothest experience run a production build
  (`next build && next start`).
- The landing page (`/`) is a normal Next.js React page and loads `app/vendor/fonts-latin.css`
  (NeueMontreal) via `app/globals.css`; the injected editions load their own CSS from the mirror.

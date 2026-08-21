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

## Run

```bash
npm install
npm run dev        # http://localhost:3000  ( / redirects to /editions/winter2026 )
```

Assets (heavy webp/video) stream from Shopify's live CDN, so an internet connection is needed.

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
| `/editions/winter2025` | ⛔ broken — a route/scene chunk 404s on Shopify's CDN (dead upstream) |

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

## Known, accepted limitations

- **winter2025** is broken upstream (a chunk is gone from Shopify's CDN). Not fixable here.
- Benign React hydration warnings (#418/#425) surface on some editions — inherent to cloning a
  third-party bundle; content still renders.
- `scripts/fetch-assets.mjs` / `localize-css.mjs` / `extract-page.mjs`, `app/vendor/*`, and the
  `public/assets` download (~4.4 GB, git-ignored) are from an earlier **offline** approach that
  the live-standalone pivot superseded. Kept as the offline fallback; safe to delete
  `public/assets/` to reclaim disk.

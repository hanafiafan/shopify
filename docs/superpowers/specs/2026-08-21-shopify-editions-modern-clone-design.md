# Design: Hellens Editions — Modern Rebrand (Next.js)

**Date:** 2026-08-21
**Status:** Draft — awaiting user review
**Purpose:** Rebuild the HTTrack-scraped Shopify Editions marketing pages as a clean,
modern website, **rebranded from Shopify to "Hellens" (hellens.dev)**. The layout and
structure of the original are preserved; the identity (logo, brand name, favicon) is
replaced with the Hellens identity. Learning/portfolio project.

---

## 1. Goal & Scope

Turn the raw HTTrack mirror in `d:\WEB\sopify\` into a maintainable Next.js + Tailwind
application that reproduces the Shopify Editions pages **full-faithful** (pixel + best-effort
animation), running fully offline from local assets.

**Decisions (locked with user):**

| Question | Decision |
|---|---|
| Purpose | Rebrand Shopify Editions → **Hellens** (hellens.dev); layout preserved, identity swapped |
| Coverage | Multiple editions, built incrementally (Winter '26 first, then others) |
| Stack | Next.js (App Router) + Tailwind CSS |
| Assets | Copy to `/public`; **re-fetch** missing formats from `cdn.shopify.com` |
| Fidelity | B — Full faithful layout/structure (pixel + best-effort animation), Hellens identity |
| Brand name | "Shopify" → "Hellens" everywhere in copy |
| Feature names | Kept as-is (Sidekick, Shop app, B2B, Checkout, etc. — generic, unchanged) |

**Out of scope:** backend, real Shopify functionality (search, auth, commerce), SEO parity,
A/B experiment logic embedded in the original Remix bundle.

---

## 2. Source Material (what the scrape actually contains)

- **Rendered SSR HTML** for each edition (e.g. `www.shopify.com/editions/winter2026.html`,
  1.4 MB, minified single-line Remix output). The full DOM + class names are present.
- **CSS** (13 files): `tailwind-*.css`, `styles-*.css`, `fonts-latin-*.css`, `logo-*.css`
  under `cdn.shopify.com/oxygen-v2/...` and `.../shopifycloud/world/brochure/...`.
- **Images present locally:** PNG (1455), JPG (938), GIF (3) only.
- **JS** (252 files) incl. the animation runtimes (Three.js, Theatre.js, anime.js, Lenis).

**Missing from the scrape** (HTTrack filter only took png/jpg/gif/css/js):

| Asset | Referenced in HTML | Present locally |
|---|---|---|
| WEBP | 392 | ❌ |
| SVG (external files) | 40 | ❌ |
| Video (mp4/webm) | 72 / 38 (~12 unique) | ❌ |
| Fonts (woff2) | via CSS | ❌ |

These must be re-fetched from `cdn.shopify.com` (still online) to achieve full fidelity.

---

## 2b. Rebrand: Hellens Identity

Brand assets provided at `C:\Users\ACER\Downloads\72ppi\`:

| Source file | Content | Used for |
|---|---|---|
| `New folder/SVG/Asset 7.svg` | Mark, black outline (transparent fill) | Scalable mark, light backgrounds |
| `New folder/SVG/Asset 8.svg` | Mark, white fill | Scalable mark, dark backgrounds |
| `Asset 3@72x.png` | Mark symbol only (solid) | Favicon, mobile nav, loading |
| `Asset 2@72x.png` | Horizontal lockup (mark + "HELLENS.DEV") | Desktop nav logo |
| `Asset 1@72x.png` | Vertical lockup | Footer / hero |
| `Asset 4@72x.png` | Wordmark "HELLENS.DEV" only | Alternate |

Copied into `app-editions/public/brand/` (kebab-case: `mark-outline.svg`, `mark-white.svg`,
`mark.png`, `logo-horizontal.png`, `logo-vertical.png`, `wordmark.png`). SVG mark preferred
wherever it scales; PNG lockups where the wordmark is needed.

**Copy rewrite rule:** every occurrence of "Shopify" in visible text / meta / alt / titles →
"Hellens". Product & feature names (Sidekick, Shop app, B2B, Checkout, Marketing, Finance,
Shipping, Developer, etc.) are left unchanged. `© Shopify Inc` → `© Hellens Inc`.
Domain references `shopify.com` in visible copy → `hellens.dev`; deep links to
`help.shopify.com` / `shopify.dev` / `apps.shopify.com` are external and left pointing at the
original (they are not part of the Hellens brand surface — noted, not rewritten).

**Favicon / metadata:** favicon from `mark.png` (+ derived sizes); `<title>` and OG tags use
"Hellens Editions". The tech-stack detector popup shown during scoping (Wappalyzer) is not
part of the site and is ignored.

## 3. Architecture

New app lives in a subfolder; the scrape stays as read-only source material.

```
d:\WEB\sopify\
├── (scrape — read-only source, untouched)
├── docs/superpowers/specs/           # this spec
└── app-editions/                     # NEW Next.js project
    ├── app/
    │   ├── layout.tsx                 # <html>, fonts, global Lenis smooth-scroll
    │   ├── page.tsx                   # redirect → /winter-2026
    │   ├── globals.css                # ported from scraped tailwind-*/styles-* CSS
    │   └── editions/
    │       ├── winter-2026/page.tsx   # flagship — built first
    │       ├── winter-2025/page.tsx   # subsequent (same pattern)
    │       └── .../page.tsx
    ├── components/
    │   ├── SiteNav.tsx                # top nav + Editions switcher (reused everywhere)
    │   ├── SiteFooter.tsx
    │   └── sections/                  # one component per page section
    │       ├── Hero.tsx
    │       ├── Sidekick.tsx
    │       └── ...
    ├── lib/animate/                   # Lenis init, anime.js reveal helpers, scroll choreography
    ├── public/assets/                 # all local png/jpg + re-fetched webp/svg/video/font
    ├── scripts/fetch-assets.mjs       # downloads missing assets from cdn.shopify.com
    ├── scripts/extract-page.mjs       # helper: pull SSR body per edition + rewrite asset URLs
    └── tailwind.config.ts
```

### Component boundaries

- **SiteNav / SiteFooter** — shared shell. Input: current edition slug (to highlight switcher).
  No internal page knowledge. Changeable without touching pages.
- **sections/*** — each renders one visual section from props (text + asset paths). Pure,
  independently viewable. A section can be edited without breaking siblings.
- **lib/animate** — animation primitives (fade/slide reveal on scroll, Lenis smooth scroll).
  Sections opt in via a hook/wrapper; the choreography lives here, not scattered in JSX.

---

## 4. Asset Pipeline

`scripts/fetch-assets.mjs` (Node, run once at setup):

1. Parse each edition HTML, collect **every** asset URL (png/jpg/webp/svg/mp4/webm) +
   font URLs from the scraped CSS.
2. For each URL: if the file already exists under the scrape → copy to `public/assets/`.
   Else → download from `cdn.shopify.com` to `public/assets/` (preserve a flat, hashed
   filename to avoid collisions).
3. Write a `asset-map.json` (original URL → local `/assets/...` path).
4. **Self-check (assert):** every referenced URL resolves to a local file, or is reported
   in a `MISSING` list. Non-zero exit if any required asset both missing locally AND
   un-fetchable (e.g. CDN 404). This is the one runnable check the pipeline leaves behind.

`extract-page.mjs` uses `asset-map.json` to rewrite the SSR HTML asset URLs to local paths
before it is componentized.

---

## 5. Build Workflow (incremental — user reviews each phase)

1. **Scaffold + asset pipeline.** `create-next-app` (TS, Tailwind, App Router). Port scraped
   CSS into `globals.css`/Tailwind layer. Run `fetch-assets.mjs`. Verify `/public/assets`
   complete.
2. **Global shell + Hellens identity.** `layout.tsx` (fonts, Lenis), `SiteNav`, `SiteFooter`
   using the Hellens logo assets from `public/brand/`. Favicon + metadata set to Hellens.
   Verify on a stub page.
3. **Winter '26 full.** Port the 12 sections into `components/sections/*`, wire into
   `winter-2026/page.tsx`. Apply the copy rewrite rule ("Shopify" → "Hellens"). Pixel pass
   against the scraped render. Animations: Lenis smooth scroll + anime.js reveals;
   Three.js/Theatre.js hero best-effort.
4. **Other editions.** Repeat the pattern per page (mostly content swap + section reuse),
   applying the same copy rewrite rule.

---

## 6. Animation Fidelity — documented ceiling

- Lenis smooth-scroll and anime.js entrance reveals: reproducible cleanly.
- Three.js / Theatre.js hero sequences: driven by the original Remix hydration data blobs.
  Rebuilt **best-effort** from the scraped runtimes; some sequences may not be pixel-exact.
  Each such spot is marked with a `ponytail:` comment naming the gap and the upgrade path.

---

## 7. Testing / Verification

- `scripts/fetch-assets.mjs` — assert-based self-check (all assets resolved or reported).
- `next build` must pass with **zero unresolved `/assets/...` references** per completed page
  (grep the built output / a link-check step).
- Manual visual diff of each completed edition against the scraped render.

No test frameworks/fixtures beyond the above (YAGNI — this is a static marketing clone).

---

## 8. Constraints & Notes

- **Environment is not a git repo** — design doc cannot be committed; kept as a file only.
- **Trademark:** Shopify branding is replaced with Hellens. Residual Shopify product names
  (Sidekick, Shop app, …) and external deep links remain and are Shopify trademarks — this
  stays a learning/portfolio project, not a real commercial site.
- Windows host; scripts use Node (cross-platform), no shell-specific tooling.

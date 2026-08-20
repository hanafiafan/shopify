// Usage: node scripts/extract-page.mjs <edition-html-basename> <out-dir-slug>
// Produces app/editions/<slug>/content.html: the edition's <body> inner HTML with
//   - every scraped asset ref rewritten to its local /assets/... path (via asset-map.json)
//   - <script> tags stripped (broken Remix hydration / huge JSON blobs)
//   - brand text "Shopify" -> "Hellens" (URLs use lowercase "shopify" so they're untouched)
// This is injected via dangerouslySetInnerHTML; Shopify's compiled CSS is loaded globally.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const [base, slug] = process.argv.slice(2);
if (!base || !slug) { console.error('usage: extract-page.mjs <html-basename> <slug>'); process.exit(1); }

const SCRAPE_ROOT = resolve('..');
const map = JSON.parse(await readFile('asset-map.json', 'utf8'));
let html = await readFile(join(SCRAPE_ROOT, 'www.shopify.com', 'editions', `${base}.html`), 'utf8');

// 1) rewrite asset refs -> local. Longest keys first so a short ref never clobbers a longer one.
let rewrites = 0;
for (const ref of Object.keys(map).sort((a, b) => b.length - a.length)) {
  if (!html.includes(ref)) continue;
  html = html.split(ref).join(map[ref]);
  rewrites++;
}

// 2) take <body> inner only (head links to remote CSS are dropped; layout provides globals.css)
const bodyStart = html.search(/<body[^>]*>/i);
const bodyOpenLen = html.match(/<body[^>]*>/i)?.[0].length ?? 0;
const bodyEnd = html.lastIndexOf('</body>');
if (bodyStart === -1 || bodyEnd === -1) { console.error('no <body> found'); process.exit(1); }
let body = html.slice(bodyStart + bodyOpenLen, bodyEnd);

// 3) strip scripts + the HTTrack injection comment
body = body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
           .replace(/<script\b[^>]*\/>/gi, '')
           .replace(/<!--\s*Mirrored from[\s\S]*?-->/gi, '');

// 4) rebrand brand text. URLs are lowercase "shopify" so capital "Shopify" is brand text.
const before = (body.match(/Shopify/g) || []).length;
body = body.replace(/Shopify\.com/g, 'hellens.dev')
           .replace(/Shopify(?!\.(?:com|dev))/g, 'Hellens'); // keep help.shopify.com etc (lowercase, untouched)

// 5) swap the Shopify bag-glyph logo (inline SVG, viewBox 0 0 18 19) for the Hellens mark.
//    Keeps the nav's sizing classes + currentColor so it inherits the light/dark nav theme.
const HELLENS_MARK_PATHS =
  '<path d="M676.65,0l62.13,87s18.82,17.34,0,45.83S576.86,365.33,576.86,365.33L511,272s-9.41-10.95,0-27.61S676.65,0,676.65,0Z"/>' +
  '<path d="M169.86,148.38l62.13,87s18.83,17.34,0,45.83S70.08,513.71,70.08,513.71L4.18,420.4s-9.41-10.95,0-27.61S169.86,148.38,169.86,148.38Z"/>' +
  '<path d="M279.06,0l79.87,112.29s9.41,12.65,28.24,12.65l158.15,1.58-69.66,99.63s-11.3,11.08-26.36,11.08H315s-22,0-33.25-15.82-69.66-101.22-69.66-101.22-7.53-11.07,1.88-26.88S279.06,0,279.06,0Z"/>' +
  '<path d="M475.48,506.08,395.61,393.79s-9.41-12.65-28.24-12.65l-158.14-1.58,69.66-99.63s11.29-11.07,26.35-11.07H439.56s21.95,0,33.24,15.81,69.66,101.22,69.66,101.22S550,397,540.58,412.77,475.48,506.08,475.48,506.08Z"/>';
let logosSwapped = 0;
body = body.replace(/<svg class="(size-24 global-lg:size-18)"[\s\S]*?<\/svg>/g, (_m, cls) => {
  logosSwapped++;
  return `<svg class="${cls}" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 747.14 513.71" aria-label="Hellens">${HELLENS_MARK_PATHS}</svg>`;
});

await mkdir(join('app', 'editions', slug), { recursive: true });
await writeFile(join('app', 'editions', slug, 'content.html'), body);

const remainingCapital = (body.match(/Shopify/g) || []).length;
const remoteLeft = (body.match(/https?:\/\/cdn\.shopify\.com[^"')\s]+\.(?:png|jpe?g|webp|svg|mp4|webm)/gi) || []).length;
console.log(`${slug}/content.html: ${rewrites} asset refs rewritten, ${(body.length/1024|0)}KB body`);
console.log(`brand: ${before} "Shopify" -> ${remainingCapital} left; logos swapped: ${logosSwapped}; remote asset refs left: ${remoteLeft}`);

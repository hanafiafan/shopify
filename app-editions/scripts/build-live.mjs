// Usage: node scripts/build-live.mjs <edition-html-basename> <out-basename>
// Produces public/live/<out>.html: the FULL original page (head+body+scripts kept) so Shopify's
// Remix bundle hydrates and the real scroll/WebGL animations run — served standalone by Next
// (relative ../../cdn.shopify.com/... refs resolve via the public/cdn.shopify.com junction;
// absolute cdn/myshopify refs load from the live CDN). Only the brand identity is changed.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const [base, out] = process.argv.slice(2);
if (!base || !out) { console.error('usage: build-live.mjs <html-basename> <out-basename>'); process.exit(1); }

const SCRAPE_ROOT = resolve('..');
let html = await readFile(join(SCRAPE_ROOT, 'www.shopify.com', 'editions', `${base}.html`), 'utf8');

// strip HTTrack's injected mirror comment
html = html.replace(/<!--\s*Mirrored from[\s\S]*?-->/gi, '');

// rebrand: URLs use lowercase "shopify" (untouched); capital "Shopify" is brand text.
html = html.replace(/Shopify\.com/g, 'hellens.dev')
           .replace(/Shopify(?!\.(?:com|dev))/g, 'Hellens');

// The nav logo is a JS-rendered SVG (Shopify bag, viewBox 0 0 18 19); rebranding the DOM alone
// gets overwritten on hydration, so swap it AFTER hydration with a one-shot + brief observer.
const HELLENS_MARK =
  "s.setAttribute('viewBox','0 0 747.14 513.71');" +
  "s.innerHTML='<path fill=\\'currentColor\\' d=\"M676.65,0l62.13,87s18.82,17.34,0,45.83S576.86,365.33,576.86,365.33L511,272s-9.41-10.95,0-27.61S676.65,0,676.65,0Z\"/><path fill=\\'currentColor\\' d=\"M169.86,148.38l62.13,87s18.83,17.34,0,45.83S70.08,513.71,70.08,513.71L4.18,420.4s-9.41-10.95,0-27.61S169.86,148.38,169.86,148.38Z\"/><path fill=\\'currentColor\\' d=\"M279.06,0l79.87,112.29s9.41,12.65,28.24,12.65l158.15,1.58-69.66,99.63s-11.3,11.08-26.36,11.08H315s-22,0-33.25-15.82-69.66-101.22-69.66-101.22-7.53-11.07,1.88-26.88S279.06,0,279.06,0Z\"/><path fill=\\'currentColor\\' d=\"M475.48,506.08,395.61,393.79s-9.41-12.65-28.24-12.65l-158.14-1.58,69.66-99.63s11.29-11.07,26.35-11.07H439.56s21.95,0,33.24,15.81,69.66,101.22,69.66,101.22S550,397,540.58,412.77,475.48,506.08,475.48,506.08Z\"/>';";
const swapScript = `<script>(function(){function swap(){document.querySelectorAll('svg[viewBox="0 0 18 19"]').forEach(function(s){${HELLENS_MARK}});}window.addEventListener('load',function(){swap();var n=0,id=setInterval(function(){swap();if(++n>10)clearInterval(id);},300);});})();</script>`;
html = html.replace('</body>', swapScript + '</body>');

await mkdir(join('public', 'live'), { recursive: true });
await writeFile(join('public', 'live', `${out}.html`), html);

const shopifyLeft = (html.match(/>[^<]*Shopify[^<]*</g) || []).length;
console.log(`live/${out}.html written (${(html.length/1024|0)}KB). Visible-text "Shopify" spans left: ${shopifyLeft}`);

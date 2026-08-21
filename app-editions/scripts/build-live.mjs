// Usage: node scripts/build-live.mjs <edition-html-basename> <out-basename>
// Produces public/live/<out>.html: the original page so Shopify's Remix bundle hydrates and the
// real scroll/WebGL animations run — served standalone by Next at the ORIGINAL route path.
//
// Two things are essential and were the cause of the earlier "Application Error":
//  1) SINGLE ORIGIN. The scrape mixes absolute (https://cdn.shopify.com) and relative
//     (../../cdn.shopify.com) module refs. Loaded together they produce TWO React copies
//     (useContext -> null). We normalize every cdn ref to the real CDN so there is one graph.
//  2) The page must be served at the SAME pathname Remix's route manifest expects
//     (/editions/winter2026), or the client router matches nothing and errors.
//
// Rebranding is done AFTER hydration (DOM text walk + logo swap) so the SSR HTML still matches
// what the bundle renders (no hydration mismatch). Ceiling: heavy assets stream from the live CDN.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const [base, out] = process.argv.slice(2);
if (!base || !out) { console.error('usage: build-live.mjs <html-basename> <out-basename>'); process.exit(1); }

const SCRAPE_ROOT = resolve('..');
let html = await readFile(join(SCRAPE_ROOT, 'www.shopify.com', 'editions', `${base}.html`), 'utf8');

// strip HTTrack's injected mirror comment
html = html.replace(/<!--\s*Mirrored from[\s\S]*?-->/gi, '');

// 1) single LOCAL origin (fully offline): every cdn/myshopify/wistia ref -> local root-relative,
//    so all modules + assets load from one localhost origin served out of public/ (no external CDN,
//    no dual-React). offline.mjs mirrors these hosts into public/ and localizes the JS/CSS.
html = html
  .replace(/(?:\.\.\/)+cdn\.shopify\.com\//g, '/cdn.shopify.com/')
  .replace(/https:\/\/cdn\.shopify\.com\//g, '/cdn.shopify.com/')
  .replace(/https:\/\/([a-z0-9-]+\.myshopify\.com)\//g, '/$1/')
  .replace(/https:\/\/(embed-ssl\.wistia\.com|fast\.wistia\.com|fast\.wistia\.net)\//g, '/$1/');

// derive the (rebranded) page title from the original <title> so each edition is correct
const rawTitle = (html.match(/<title>([^<]*)<\/title>/i)?.[1] || 'Hellens Editions')
  .replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, '&')
  .replace(/Shopify\.com/g, 'hellens.dev').replace(/Shopify(?!\.(?:com|dev))/g, 'Hellens');
const titleJs = JSON.stringify(rawTitle);

// 1b) network guard: the bundle injects GTM/Google/DoubleClick analytics + a Shopify consent
//     beacon dynamically (no script tag in the HTML to remove). This runs first in <head> and
//     blocks every request to a non-local host, so the page makes ZERO external calls.
const guard = `<script>(function(){var loc=location;function ext(u){try{if(!u)return false;if(/^(data:|blob:|#|javascript:)/i.test(u))return false;return new URL(u,loc.href).host!==loc.host;}catch(e){return false;}}
var of=window.fetch;if(of)window.fetch=function(i){var u=typeof i==='string'?i:(i&&i.url);if(ext(u))return Promise.resolve(new Response(null,{status:204}));return of.apply(this,arguments);};
var xo=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(m,u){this.__b=ext(u);return xo.apply(this,arguments);};
var xsnd=XMLHttpRequest.prototype.send;XMLHttpRequest.prototype.send=function(){if(this.__b)return;return xsnd.apply(this,arguments);};
if(navigator.sendBeacon)navigator.sendBeacon=function(u){return !ext(u);};
['appendChild','insertBefore'].forEach(function(fn){var o=Node.prototype[fn];Node.prototype[fn]=function(n){try{if(n&&n.tagName&&/^(script|img|iframe|link)$/i.test(n.tagName)){var s=n.src||(n.getAttribute&&n.getAttribute('src'))||n.href;if(ext(s))return n;}}catch(e){}return o.apply(this,arguments);};});
try{var id=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');Object.defineProperty(HTMLImageElement.prototype,'src',{set:function(v){if(!ext(v))id.set.call(this,v);},get:function(){return id.get.call(this);}});}catch(e){}
var sa=Element.prototype.setAttribute;Element.prototype.setAttribute=function(k,v){try{if(/^(src|href|srcset)$/i.test(k)&&ext(String(v).split(/[ ,]/)[0]))return;}catch(e){}return sa.apply(this,arguments);};
window.dataLayer=window.dataLayer||[];window.gtag=window.gtag||function(){};})();</script>`;
html = html.replace(/<head[^>]*>/i, (m) => m + guard);

// 2) rebrand AFTER hydration, client-side, so SSR/CSR match during hydration.
const HELLENS_MARK =
  "s.setAttribute('viewBox','0 0 747.14 513.71');" +
  "s.innerHTML='<path fill=\\'currentColor\\' d=\"M676.65,0l62.13,87s18.82,17.34,0,45.83S576.86,365.33,576.86,365.33L511,272s-9.41-10.95,0-27.61S676.65,0,676.65,0Z\"/><path fill=\\'currentColor\\' d=\"M169.86,148.38l62.13,87s18.83,17.34,0,45.83S70.08,513.71,70.08,513.71L4.18,420.4s-9.41-10.95,0-27.61S169.86,148.38,169.86,148.38Z\"/><path fill=\\'currentColor\\' d=\"M279.06,0l79.87,112.29s9.41,12.65,28.24,12.65l158.15,1.58-69.66,99.63s-11.3,11.08-26.36,11.08H315s-22,0-33.25-15.82-69.66-101.22-69.66-101.22-7.53-11.07,1.88-26.88S279.06,0,279.06,0Z\"/><path fill=\\'currentColor\\' d=\"M475.48,506.08,395.61,393.79s-9.41-12.65-28.24-12.65l-158.14-1.58,69.66-99.63s11.29-11.07,26.35-11.07H439.56s21.95,0,33.24,15.81,69.66,101.22,69.66,101.22S550,397,540.58,412.77,475.48,506.08,475.48,506.08Z\"/>';";
const rebrand = `<script>(function(){
function walk(){var w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,null);var n;while(n=w.nextNode()){var v=n.nodeValue;if(v&&v.indexOf('Shopify')>-1){n.nodeValue=v.replace(/Shopify\\.com/g,'hellens.dev').replace(/Shopify/g,'Hellens');}}}
function logo(){document.querySelectorAll('svg[viewBox="0 0 18 19"]').forEach(function(s){${HELLENS_MARK}});}
function go(){try{walk();logo();document.title=${titleJs};}catch(e){}}
window.addEventListener('load',function(){go();var n=0,id=setInterval(function(){go();if(++n>12)clearInterval(id);},250);});
})();</script>`;
html = html.replace('</body>', rebrand + '</body>');

await mkdir(join('public', 'live'), { recursive: true });
await writeFile(join('public', 'live', `${out}.html`), html);

const external = (html.match(/(?:src|href|content)="https:\/\/(?:cdn\.shopify\.com|[a-z0-9-]+\.myshopify\.com|embed-ssl\.wistia\.com)\//g) || []).length;
console.log(`live/${out}.html (${(html.length/1024|0)}KB): external asset-host refs left: ${external} (0 = fully local)`);

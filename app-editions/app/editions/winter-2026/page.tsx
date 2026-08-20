import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import RevealStatic from './RevealStatic';

// ponytail: inject the rewritten SSR body (assets localized, Shopify->Hellens, scripts stripped).
// Pixel-faithful to the original; Shopify's compiled CSS is loaded globally in globals.css.
// Upgrade path: split into per-section React components if the page ever needs real interactivity.
const html = readFileSync(
  join(process.cwd(), 'app/editions/winter-2026/content.html'),
  'utf8',
);

export default function WinterTwentySixPage() {
  return (
    <>
      <div data-injected-edition dangerouslySetInnerHTML={{ __html: html }} />
      <RevealStatic />
    </>
  );
}

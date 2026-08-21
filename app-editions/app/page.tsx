// Hellens Editions landing — a real Next.js page (not an injected Remix clone) that indexes
// all editions. Dark, minimal, uses the NeueMontreal face loaded by globals.css.
const MARK =
  'M676.65,0l62.13,87s18.82,17.34,0,45.83S576.86,365.33,576.86,365.33L511,272s-9.41-10.95,0-27.61S676.65,0,676.65,0Z ' +
  'M169.86,148.38l62.13,87s18.83,17.34,0,45.83S70.08,513.71,70.08,513.71L4.18,420.4s-9.41-10.95,0-27.61S169.86,148.38,169.86,148.38Z ' +
  'M279.06,0l79.87,112.29s9.41,12.65,28.24,12.65l158.15,1.58-69.66,99.63s-11.3,11.08-26.36,11.08H315s-22,0-33.25-15.82-69.66-101.22-69.66-101.22-7.53-11.07,1.88-26.88S279.06,0,279.06,0Z ' +
  'M475.48,506.08,395.61,393.79s-9.41-12.65-28.24-12.65l-158.14-1.58,69.66-99.63s11.29-11.07,26.35-11.07H439.56s21.95,0,33.24,15.81,69.66,101.22,69.66,101.22S550,397,540.58,412.77,475.48,506.08,475.48,506.08Z';

type Ed = { slug: string; label: string; codename?: string; note?: string };
const EDITIONS: Ed[] = [
  { slug: 'winter2026', label: "Winter '26", codename: 'Renaissance' },
  { slug: 'spring2026', label: "Spring '26", codename: 'Everywhere' },
  { slug: 'summer2025', label: "Summer '25", codename: 'Horizons' },
  { slug: 'winter2025', label: "Winter '25", codename: 'Boring', note: 'partial' },
  { slug: 'summer2024', label: "Summer '24" },
  { slug: 'winter2024', label: "Winter '24" },
  { slug: 'summer2023', label: "Summer '23" },
  { slug: 'winter2023', label: "Winter '23" },
  { slug: 'summer2022', label: "Summer '22" },
];

const css = `
.hl-root *{box-sizing:border-box}
.hl-root{min-height:100vh;background:#0a0a0a;color:#fff;font-family:NeueMontreal,system-ui,sans-serif;padding:clamp(24px,5vw,64px);display:flex;flex-direction:column;gap:clamp(40px,7vw,90px)}
.hl-top{display:flex;align-items:center;gap:14px}
.hl-top svg{width:30px;height:auto;fill:#fff}
.hl-top b{font-weight:700;font-size:19px;letter-spacing:.02em}
.hl-hero h1{font-weight:700;font-style:italic;font-size:clamp(48px,12vw,150px);line-height:.92;margin:0;letter-spacing:-.02em}
.hl-hero p{margin:18px 0 0;font-size:clamp(16px,2.2vw,22px);color:#a1a1a1;max-width:44ch}
.hl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px}
.hl-card{position:relative;display:flex;flex-direction:column;justify-content:space-between;gap:48px;padding:26px 24px;min-height:200px;border:1px solid #262626;border-radius:14px;text-decoration:none;color:#fff;background:#0f0f0f;transition:transform .25s ease,background .25s ease,border-color .25s ease}
.hl-card:hover{transform:translateY(-4px);background:#fff;color:#0a0a0a;border-color:#fff}
.hl-card .hl-cn{font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#8a8a8a}
.hl-card:hover .hl-cn{color:#0a0a0a}
.hl-card .hl-lbl{font-weight:700;font-style:italic;font-size:34px;line-height:1}
.hl-card .hl-go{display:flex;align-items:center;justify-content:space-between;font-size:14px;color:#8a8a8a}
.hl-card:hover .hl-go{color:#0a0a0a}
.hl-badge{position:absolute;top:16px;right:16px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#0a0a0a;background:#f5c518;border-radius:999px;padding:3px 9px}
.hl-foot{display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;border-top:1px solid #1f1f1f;padding-top:24px;color:#6b6b6b;font-size:13px}
`;

export default function Home() {
  return (
    <div className="hl-root">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <header className="hl-top">
        <svg viewBox="0 0 747.14 513.71" aria-hidden="true">
          <path d={MARK} />
        </svg>
        <b>HELLENS.DEV</b>
      </header>

      <section className="hl-hero">
        <h1>Editions</h1>
        <p>Every Hellens release, one place — 150+ product updates across nine editions.</p>
      </section>

      <section className="hl-grid">
        {EDITIONS.map((e) => (
          <a key={e.slug} className="hl-card" href={`/editions/${e.slug}`}>
            {e.note && <span className="hl-badge">{e.note}</span>}
            <span className="hl-cn">{e.codename ?? 'Edition'}</span>
            <span className="hl-lbl">{e.label}</span>
            <span className="hl-go">
              <span>View edition</span>
              <span aria-hidden="true">→</span>
            </span>
          </a>
        ))}
      </section>

      <footer className="hl-foot">
        <span>© Hellens Inc</span>
        <span>hellens.dev</span>
      </footer>
    </div>
  );
}

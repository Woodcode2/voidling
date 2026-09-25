// BELLCLOUD HEIGHTS — THE OWNER'S SHEET: the airfield and the kingdom, side by
// side, frame for frame (docs/BELLCLOUD.md §11).
//
//   node qa/bellsheet.mjs [--dir=qa/out/bellcloud] [--before=before] [--after=after]
//
// qa/skylarkfield.mjs writes, per run, `<tag>_overview.png` (orthographic,
// straight down, the whole island), four fixed play frames — `<tag>_spawn`,
// `_northarm` (6000, 3000), `_westshoulder` (3500, 6500) and `_southwestarm`
// (3200, 7700) — and `<tag>.json` with each frame's measurements. This reads
// the two runs, lays the ten PNGs out as a page (two columns, BEFORE | AFTER,
// five rows), captions every play frame with the luma the probe measured on
// it, and screenshots the page to `<dir>/owner-sheet.png`.
//
// It measures nothing of its own: every number on the sheet is one the probe
// wrote into its JSON, read here, and a missing file or frame throws rather
// than leaving a blank tile. The sheet is evidence for the owner's eye, and
// qa/out/ is never committed — hand the path over.
//
//   node qa/bellsheet.mjs --finale=<port> [--dir=...]
//
// THE FINALE FRAME instead (§11.4): a match on the given port, the void warped
// onto the Bell Plaza at r 5.2, the Great Bell eaten through the game's own
// capture() (window.__eatLandmark), and the frame shot 3 and 5 match seconds
// later — the look-up tilt, the balloons starting to lift. HUD hidden, as
// qa/skylarkfield.mjs hides it. Writes `finale.png` and `finale_5s.png`.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const flag = (k, d) => { const a = argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const DIR = path.resolve(flag('dir', 'qa/out/bellcloud'));
const BEFORE = flag('before', 'before'), AFTER = flag('after', 'after');
const FINALE = flag('finale', null);

if (FINALE) {
  const { chromium } = await import('playwright');
  mkdirSync(DIR, { recursive: true });
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
  try {
    const p = await br.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
    await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
    await p.addInitScript(() => {
      let a = (7 >>> 0) + 0x6D2B79F5;
      Math.random = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      try { localStorage.clear(); localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1'); localStorage.setItem('voidDailyLast', new Date().toDateString()); localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark'); } catch { }
    });
    await p.goto(`http://127.0.0.1:${FINALE}/?w=skylark`, { waitUntil: 'domcontentloaded', timeout: 300000 });
    await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
    await p.evaluate(() => document.getElementById('btnPlay')?.click());
    await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 400000 });
    await p.evaluate(() => {
      const cv = document.querySelector('canvas');
      for (const el of Array.from(document.body.children)) if (el !== cv && !el.contains(cv)) el.setAttribute('data-qahide', '');
      const st = document.createElement('style'); st.textContent = '[data-qahide]{display:none !important}';
      document.head.appendChild(st);
      window.__pinQuality(0);
      // on the plaza, a little toward the lens so the bell is in front of him
      window.__warpVoid((6107 - 6000) * 0.05 + 10, (4349 - 6000) * 0.05 + 10);
      window.__setVoidR(5.2); window.__calm?.(); window.__settleCam?.(5.2);
    });
    const t0 = await p.evaluate(() => window.__matchState().t);
    await p.waitForFunction((t) => window.__matchState().t > t + 0.5, t0, { timeout: 400000 });
    const lm = await p.evaluate(() => window.__eatLandmark?.() ?? null);
    if (!lm || lm.name !== 'great bell') throw new Error(`bellsheet: __eatLandmark() ate ${lm ? lm.name : 'nothing'}, not the Great Bell`);
    const te = await p.evaluate(() => window.__matchState().t);
    for (const [dt, name] of [[3, 'finale.png'], [5, 'finale_5s.png']]) {
      await p.waitForFunction((t) => window.__matchState().t >= t, te + dt, { timeout: 900000, polling: 250 });
      await p.screenshot({ path: path.join(DIR, name) });
      const asc = await p.evaluate(() => window.__asc?.state());
      console.log(`bellsheet: ${path.join(DIR, name)} — ${dt} match s after the bell; cascade ${asc?.cascade}`);
    }
  } finally { await br.close(); }
  process.exit(0);
}
const ROWS = [
  ['overview', 'the whole island, straight down'],
  ['spawn', 'the first frame — the Balloon Dock'],
  ['northarm', 'the north arm (6000, 3000)'],
  ['westshoulder', 'the west shoulder (3500, 6500)'],
  ['southwestarm', 'the south-west arm (3200, 7700)'],
];

const run = (tag) => {
  const f = path.join(DIR, `${tag}.json`);
  if (!existsSync(f)) throw new Error(`bellsheet: no ${f} — run qa/skylarkfield.mjs <port> --tag=${tag} --out=${DIR} first`);
  const j = JSON.parse(readFileSync(f, 'utf8'));
  for (const [v] of ROWS) if (!existsSync(path.join(DIR, `${tag}_${v}.png`))) throw new Error(`bellsheet: no ${tag}_${v}.png in ${DIR}`);
  return j;
};
const b = run(BEFORE), a = run(AFTER);
const img = (tag, v) => `data:image/png;base64,${readFileSync(path.join(DIR, `${tag}_${v}.png`)).toString('base64')}`;
const cap = (j, v) => {
  if (v === 'overview') return `${j.props.length} static edibles on the island`;
  const f = j.frames.find((x) => x.view === v);
  if (!f) throw new Error(`bellsheet: ${j.tag} has no ${v} frame`);
  return `frame luma ${f.luma.toFixed(3)}` + (f.cloudShare !== undefined ? ` · cloud ${(f.cloudShare * 100).toFixed(0)}% of frame` : '');
};

const rows = ROWS.map(([v, what]) => `
  <div class="row">
    <div class="label">${what}</div>
    <figure><img src="${img(BEFORE, v)}"><figcaption>BEFORE · ${cap(b, v)}</figcaption></figure>
    <figure><img src="${img(AFTER, v)}"><figcaption>AFTER · ${cap(a, v)}</figcaption></figure>
  </div>`).join('');
const html = `<!doctype html><meta charset="utf-8"><title>Bellcloud Heights — before and after</title>
<style>
  body { margin: 0; padding: 28px; background: #1d2433; color: #eef2fa; font: 15px/1.35 system-ui, sans-serif; width: 1400px; }
  h1 { margin: 0 0 4px; font-size: 26px; }
  p { margin: 0 0 18px; color: #b9c4d8; }
  .row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 22px; }
  .label { grid-column: 1 / 3; font-weight: 700; letter-spacing: .02em; }
  figure { margin: 0; background: #0f1420; border-radius: 10px; overflow: hidden; }
  img { display: block; width: 100%; height: 520px; object-fit: contain; background: #0b0f18; }
  figcaption { padding: 8px 12px; font-size: 14px; color: #dfe6f3; }
</style>
<h1>World 6 — SKYLARK FIELD → BELLCLOUD HEIGHTS</h1>
<p>BEFORE: the current branch build · AFTER: the cloud kingdom · same seed (${a.seed}), same fixed camera, same points on the island. Every number is qa/skylarkfield.mjs's own measurement of that frame.</p>
${rows}`;
const htmlPath = path.join(DIR, 'owner-sheet.html');
writeFileSync(htmlPath, html);

const { chromium } = await import('playwright');
const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
try {
  const p = await br.newPage({ viewport: { width: 1456, height: 900 }, deviceScaleFactor: 1 });
  await p.goto(`file://${htmlPath}`);
  await p.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
  const out = path.join(DIR, 'owner-sheet.png');
  await p.screenshot({ path: out, fullPage: true });
  console.log(`bellsheet: ${out}`);
} finally { await br.close(); }

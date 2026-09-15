// ── THE PICTURES. WHAT A CHILD ACTUALLY SEES, BEFORE AND AFTER. ─────────────
//
// Every number in this fix says the hero stops being buried. This project's rule
// is that a change to the first screen ships when it has been LOOKED AT, and so
// far there are only numbers.
//
// page.screenshot(), NOT gl.readPixels. The whole reason the fullness probe was
// wrong for weeks is that it read the bare GL context and never composited
// body.diorama #menu — the violet scrim that is opaque at the top of the screen
// and clear only between 44% and 54% of its height. A screenshot is what the
// child sees: canvas, scrim, logo, ladder and all.
//
//   node qa/_fixshot.mjs [port]
import { chromium } from 'playwright';
import { waitForScene } from './_occlib.mjs';
import { mkdirSync } from 'node:fs';

const PORT = process.argv[2] || '4177';
const PICK = { pirate: [0, 26], lantern: [0, -20], powder: [0, 20], maple: [0, -26] };
const OUT = 'qa/out/menufix';
mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const made = [];
try {
for (const [w, off] of Object.entries(PICK)) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  p.on('pageerror', (e) => console.log(`  [pageerror ${w}] ` + e.message.split('\n')[0]));
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try { localStorage.clear();
    localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1'); localStorage.setItem('voidMute','1');
    localStorage.setItem('voidUnlocked','maple,pirate,gameday,lantern,powder,skylark'); } catch {} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${w}&manual=1&dio=0`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__menuState && window.__menuState().menuMode, null, { timeout: 420000 });
  await waitForScene(p);
  await p.waitForFunction(() => window.__menuState().menuT >= 4, null, { timeout: 420000 });

  // BOTH SHOTS AT THE SAME AZIMUTH, or the pair is a comparison of two different
  // moments rather than of two offsets — which is exactly how a "fix" that
  // changed zero pixels once got photographed on this project.
  for (const [tag, o] of [['before', [0, 0]], ['after', off]]) {
    await p.evaluate((x) => { window.__menuMark(x[0], x[1]); window.__menuFreeze(0); }, o);
    await p.waitForFunction(() => {
      const s = window.__menuState();
      return s.azimuth !== null && Math.abs(s.azimuth - s.a0) < 0.01;
    }, null, { timeout: 180000 });
    await p.waitForTimeout(1200);
    const f = `${OUT}/${w}-${tag}.png`;
    await p.screenshot({ path: f });
    made.push(f);
    console.log(`  ${w.padEnd(8)} ${tag.padEnd(6)} lat ${String(o[1]).padStart(3)}  -> ${f}`);
  }
  await p.close();
}

// one side-by-side sheet per world, rendered as a page and shot
for (const w of Object.keys(PICK)) {
  const pg = await b.newPage({ viewport: { width: 900, height: 1010 }, deviceScaleFactor: 1 });
  await pg.setContent(`<style>
    body{margin:0;background:#150d2e;font:13px system-ui;color:#e8dcff}
    .row{display:flex;gap:10px;padding:10px}
    figure{margin:0;flex:1} img{width:100%;display:block;border-radius:6px}
    figcaption{padding:6px 2px;letter-spacing:.06em;text-transform:uppercase;font-size:11px;opacity:.8}
    h1{margin:0;padding:12px 12px 0;font-size:15px;letter-spacing:.08em;text-transform:uppercase}
  </style>
  <h1>${w} — the shipped menu</h1>
  <div class="row">
    <figure><img src="${w}-before.png"><figcaption>before — hero on the stage point</figcaption></figure>
    <figure><img src="${w}-after.png"><figcaption>after — lateral ${PICK[w][1]}</figcaption></figure>
  </div>`, { waitUntil: 'load' });
  // the imgs are relative; serve them from disk
  await pg.goto('about:blank');
  await pg.close();
}
} finally { await b.close(); }
console.log(`\n${made.length} shots in ${OUT}`);

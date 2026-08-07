// THE TWO CHILDREN WHO DO NOT DRAG.
//
//   node qa/_wild.mjs [world]
//
// A six-year-old's first instinct on a touch screen is to TAP, not to drag.
// This measures what tapping actually buys them, using REAL Playwright touch
// taps over the WHOLE screen (HUD included, not just the canvas), so anything
// they can accidentally open is opened.
//
//   idle  — the phone is put down. Control group.
//   tap   — ~4 taps/second at uniformly random screen points for 90 match-s.
//
// Reported: void displacement, props eaten, score, rank on the board, and
// every overlay the taps managed to open. Timestamped on __matchState().t.
import { chromium } from 'playwright';
const WORLD = process.argv[2] || 'maple';
const PORT = 4237;
const HORIZON = 92;

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

for (const mode of ['idle', 'tap']) {
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true });
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try { localStorage.clear(); } catch { } });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.01, null, { timeout: 400000 });
  await p.evaluate(() => { window.__renderer.render = () => { }; });
  await p.evaluate(() => {
    window.__P = []; window.__OV = [];
    const s = window.__voidState(); window.__P0 = { x: s.x, z: s.z };
    let path = 0, px = s.x, pz = s.z, maxD = 0, seen = new Set();
    window.__poll = setInterval(() => {
      const ms = window.__matchState?.(); if (!ms) return;
      const v = window.__voidState();
      path += Math.hypot(v.x - px, v.z - pz); px = v.x; pz = v.z;
      const d = Math.hypot(v.x - window.__P0.x, v.z - window.__P0.z);
      if (d > maxD) maxD = d;
      window.__STAT = { t: +ms.t.toFixed(2), path: +path.toFixed(1), maxD: +maxD.toFixed(1),
        r: +ms.r.toFixed(3), score: ms.score,
        rank: 1 + ms.rivals.filter((x) => x.joined && x.score > ms.score).length,
        joined: ms.rivals.filter((x) => x.joined).length };
      for (const id of ['pause', 'gate', 'worlds', 'shop', 'daily', 'settings', 'trophies', 'topvoids', 'policy', 'tut', 'end', 'book'])
        if (document.getElementById(id)?.classList.contains('show') && !seen.has(id)) {
          seen.add(id); window.__OV.push({ t: +ms.t.toFixed(2), id });
        }
    }, 50);
  });

  let taps = 0;
  const started = Date.now();
  while (true) {
    const t = await p.evaluate(() => window.__matchState?.().t ?? 0);
    if (t > HORIZON) break;
    if (Date.now() - started > 400000) { console.log(`  !! wall timeout at t=${t.toFixed(1)}`); break; }
    if (mode === 'tap') {
      for (let i = 0; i < 12; i++) {
        await p.touchscreen.tap(8 + Math.random() * 374, 30 + Math.random() * 800);
        taps++;
      }
    } else await p.waitForTimeout(1500);
  }
  const r = await p.evaluate(() => ({ s: window.__STAT, ov: window.__OV,
    nom: !!localStorage.getItem('voidFirstNom'),
    stk: (localStorage.getItem('voidStickers') || '').split(',').filter(Boolean).length }));
  console.log(`\n═══ ${WORLD.toUpperCase()} / ${mode.toUpperCase()} — ${taps} real touch taps ═══`);
  console.log(`  at match t=${r.s.t}s:`);
  console.log(`    void travelled       ${r.s.path} units of path, max ${r.s.maxD} from spawn`);
  console.log(`    radius               ${r.s.r}  (starts at 0.9)`);
  console.log(`    score                ${r.s.score}   board rank ${r.s.rank} of ${r.s.joined + 1}`);
  console.log(`    FIRST NOM fired      ${r.nom}      stickers ${r.stk}`);
  console.log(`    overlays opened      ${r.ov.length ? r.ov.map((o) => `${o.id}@${o.t}s`).join(', ') : 'none'}`);
  if (errs.length) console.log(`    PAGE ERRORS ${errs.slice(0, 3).join(' | ')}`);
  await p.close();
}
await b.close();

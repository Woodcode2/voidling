// HOW LONG DOES THE CHILD SEE THE ONLY INSTRUCTION THAT TEACHES THE CONTROL?
//
//   npm run build && npx vite preview --port 4177 --host 127.0.0.1
//   node qa/onboard.mjs [world]
//
// "DRAG anywhere to move!" is authored for 6 seconds and is the one sentence
// in the game that says how to move. It was being overwritten by the next
// guide beat, which advanced on `stats.eaten > 2 && tClock > 4` — and the
// void's gravity well feeds itself, so a child who never touches the screen
// still eats four props in the first few seconds and destroys their own
// lesson.
//
// TWO PLAYERS, because they fail differently:
//   idle    — never touches the screen. The one the bug was built for. The
//             lesson must persist and must come BACK.
//   driver  — drags immediately. Must NOT be nagged: they have already
//             learned it, and repeating it at someone who is playing is
//             worse than saying nothing.
// A genuine cold install both times: voidPlayed/voidTut/voidFirstNom cleared,
// because firstRun is what arms the whole opening and a warm profile skips it.
import { chromium } from 'playwright';
const WORLD = process.argv[2] || 'maple';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

async function run(mode) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try { localStorage.clear(); } catch { } });
  await p.goto(`http://127.0.0.1:4177/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  const play = p.locator('#btnPlay');
  if (await play.count() && await play.isVisible()) {
    await play.click(); await p.waitForTimeout(1400);
    await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
  }
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });

  // sample the guide pill against the MATCH clock, never the wall clock —
  // this renderer is a fraction of real time and a wall-clock number here
  // would be fiction
  await p.evaluate((m) => {
    window.__guide = [];
    let last = '';
    setInterval(() => {
      const ms = window.__matchState?.(); if (!ms) return;
      const g = document.getElementById('guide');
      const txt = (g && g.classList.contains('show')) ? (g.textContent || '').trim() : '';
      if (txt !== last) { window.__guide.push({ t: +ms.t.toFixed(2), txt }); last = txt; }
    }, 60);
    if (m === 'driver') {
      const cv = document.querySelector('canvas');
      const cx = innerWidth / 2, cy = innerHeight / 2;
      cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
      const tick = () => {
        const t = window.__matchState?.().t ?? 0;
        dispatchEvent(new PointerEvent('pointermove', { pointerId: 1,
          clientX: cx + Math.cos(t) * 110, clientY: cy + Math.sin(t) * 110, bubbles: true }));
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }, mode);

  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 30, null, { timeout: 900000 });
  const g = await p.evaluate(() => window.__guide);
  await p.close();
  return g;
}

for (const mode of ['idle', 'driver']) {
  const g = await run(mode);
  const shows = g.filter((e) => e.txt);
  const drag = shows.filter((e) => /DRAG/.test(e.txt));
  // how long the FIRST drag pill stayed up: from its show to the next change
  let life = null;
  const i = g.findIndex((e) => /DRAG/.test(e.txt));
  if (i >= 0 && g[i + 1]) life = +(g[i + 1].t - g[i].t).toFixed(2);
  console.log(`\n── ${mode.toUpperCase()} ──`);
  console.log(`  drag pill shown ${drag.length}x, first one lived ${life === null ? 'to the end of the sample' : life + 's'}`);
  g.filter((e) => e.txt).forEach((e) => console.log(`   ${String(e.t).padStart(6)}s  ${e.txt.slice(0, 58)}`));
}
await b.close();

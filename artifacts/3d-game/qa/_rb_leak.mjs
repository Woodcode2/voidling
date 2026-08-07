// ROBUSTNESS: resource leak across N rematches.
// Counts three.js geometries/textures/programs, scene node count, DOM nodes and
// JS heap after each full match cycle. Render is stubbed so the sim runs at its
// proper rate; quality is pinned so the ladder cannot change what is allocated.
import { chromium } from 'playwright';

const PORT = process.env.PORT || 4271;
const WORLD = process.argv[2] || 'maple';
const N = Number(process.argv[3] || 10);

const b = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--js-flags=--expose-gc', '--enable-precise-memory-info'],
});
const pg = await b.newPage({ viewport: { width: 390, height: 844 } });
const errs = [];
pg.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
pg.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text().slice(0, 200)); });
await pg.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await pg.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });

await pg.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await pg.waitForFunction(() => window.__matchState && window.__renderer, null, { timeout: 120000 });
await pg.evaluate(() => { window.__pinQuality(0); window.__renderer.render = () => {}; });

const snap = () => pg.evaluate(() => {
  const r = window.__renderer;
  let nodes = 0; window.__scene.traverse(() => nodes++);
  return {
    geo: r.info.memory.geometries, tex: r.info.memory.textures,
    prog: r.info.programs ? r.info.programs.length : -1,
    nodes, dom: document.getElementsByTagName('*').length,
    heap: performance.memory ? performance.memory.usedJSHeapSize : -1,
    edibles: (() => { const e = window.__edibles; const a = typeof e === 'function' ? e() : e; return a && a.length !== undefined ? a.length : -1; })(),
    listeners: 0,
  };
});

// drive one full match: click PLAY path -> world card -> run clock down -> PLAY AGAIN
const startFirst = async () => {
  await pg.evaluate(() => {
    const p = document.getElementById('btnPlay'); if (p) p.click();
  });
  await pg.waitForTimeout(500);
  // world picker: click the card for the chosen world if visible
  await pg.evaluate((w) => {
    const c = document.querySelector(`#worldRow .wCard[data-world="${w}"]`);
    if (c) c.click();
  }, WORLD);
  await pg.waitForTimeout(1000);
};

const waitStarted = async () => {
  await pg.waitForFunction(() => { try { return window.__matchState().t > 0.2; } catch { return false; } }, null, { timeout: 180000 });
};

const runToEnd = async () => {
  await pg.evaluate(() => window.__rushClock(1.2));
  await pg.waitForFunction(() => getComputedStyle(document.getElementById('end')).display !== 'none'
    || document.getElementById('end').classList.contains('show'), null, { timeout: 60000 }).catch(() => {});
  await pg.waitForTimeout(1200);
};

const rows = [];
await startFirst();
await waitStarted();

for (let i = 0; i < N; i++) {
  await runToEnd();
  await pg.evaluate(() => { if (window.gc) window.gc(); });
  await pg.waitForTimeout(300);
  const s = await snap();
  rows.push({ i: i + 1, ...s });
  process.stdout.write(`match ${i + 1}: geo=${s.geo} tex=${s.tex} prog=${s.prog} nodes=${s.nodes} dom=${s.dom} edibles=${s.edibles} heap=${(s.heap / 1e6).toFixed(1)}MB\n`);
  if (i < N - 1) {
    const clicked = await pg.evaluate(() => {
      const a = document.getElementById('btnAgain');
      if (!a) return 'no-btnAgain';
      const r = a.getBoundingClientRect();
      a.click();
      return `clicked visible=${r.width > 0 && r.height > 0} y=${Math.round(r.top)}`;
    });
    process.stdout.write(`  PLAY AGAIN -> ${clicked}\n`);
    await pg.waitForTimeout(800);
    await waitStarted().catch(() => process.stdout.write('  !! match did not restart\n'));
  }
}

const d = (k) => rows[rows.length - 1][k] - rows[0][k];
console.log(`\nDELTA over ${N} matches (${WORLD}): geo ${rows[0].geo}->${rows[rows.length-1].geo} (${d('geo')>=0?'+':''}${d('geo')}), tex ${rows[0].tex}->${rows[rows.length-1].tex} (${d('tex')>=0?'+':''}${d('tex')}), nodes ${rows[0].nodes}->${rows[rows.length-1].nodes} (${d('nodes')>=0?'+':''}${d('nodes')}), dom ${rows[0].dom}->${rows[rows.length-1].dom} (${d('dom')>=0?'+':''}${d('dom')}), heap ${(rows[0].heap/1e6).toFixed(1)}->${(rows[rows.length-1].heap/1e6).toFixed(1)}MB`);
console.log('errors:', errs.length);
for (const e of [...new Set(errs)].slice(0, 20)) console.log('  ', e);
await b.close();

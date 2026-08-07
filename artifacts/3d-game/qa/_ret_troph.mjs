// SCRATCH PROBE — HOW MUCH OF THE TROPHY CASE DOES THE FIRST MATCH EMPTY?
//
// The trophy case is one of the four things on the menu's nav row and it is
// pure lifetime progression: nothing announces a trophy when it is earned
// (grep 'trophy' in prototype3d.ts — the string appears only inside
// renderTrophies), so its whole retention value is the child opening it and
// finding something new. This measures how much of it survives match one.
//
// Virgin profile, one real 180s match on the `wander` driver, then read the
// trophy screen. Runs a second and third match in the same page so the curve
// past match one is measured rather than inferred.
//
//   node qa/_ret_troph.mjs [port] [world] [matches]
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4231';
const WORLD = process.argv[3] || 'maple';
const N = +(process.argv[4] || 3);

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.clear();
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidBookSeen', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
} catch { } });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });

const readTrophies = () => p.evaluate(() => {
  document.getElementById('btnTrophies').click();
  const r = {
    count: document.getElementById('trophyCount')?.textContent,
    got: [...document.querySelectorAll('#trophyGrid .tr.got .nm')].map((e) => e.textContent),
    open: [...document.querySelectorAll('#trophyGrid .tr:not(.got)')].map((e) => {
      const nm = e.querySelector('.nm')?.textContent; const c = e.querySelector('.trCnt')?.textContent;
      return `${nm} ${c}`;
    }),
    stats: JSON.parse(localStorage.getItem('voidStats') || '{}'),
  };
  document.getElementById('trophies').classList.remove('show');
  return r;
});

console.log('BEFORE ANY MATCH:', JSON.stringify(await readTrophies(), null, 1));

await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1400);
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
await p.evaluate(() => { window.__renderer.render = () => { }; });

// autopilot, installed once — it survives PLAY AGAIN because it just keeps
// aiming the pointer at whatever is nearest
await p.evaluate(() => {
  const cv = document.querySelector('canvas');
  const cx = innerWidth / 2, cy = innerHeight / 2;
  cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
  let seed = 20260807, head = 0, holdUntil = -1;
  const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) % 100000) / 100000; };
  const tick = () => {
    const vs = window.__voidState(); let best = null, bd = 1e9;
    for (const e of window.__edibles) {
      if (e.eaten || !e.mesh?.visible || e.radius > vs.r * 0.92) continue;
      const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
      const d = dx * dx + dz * dz; if (d < bd) { bd = d; best = { dx, dz }; }
    }
    const t = (window.__matchState?.().t ?? 0);
    if (t > holdUntil) { head = rnd() * Math.PI * 2; holdUntil = t + 1.6 + rnd() * 2.2; }
    const aim = (best && bd < 22 * 22) ? best : { dx: Math.cos(head), dz: Math.sin(head) };
    const m = Math.hypot(aim.dx, aim.dz) || 1;
    dispatchEvent(new PointerEvent('pointermove', { pointerId: 1,
      clientX: cx + aim.dx / m * 110, clientY: cy + aim.dz / m * 110, bubbles: true }));
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

for (let i = 0; i < N; i++) {
  await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'), null, { timeout: 1800000 });
  await p.waitForTimeout(1500);
  const t = await readTrophies();
  console.log(`\nAFTER MATCH ${i + 1}  ${t.count}`);
  console.log(`  earned: ${JSON.stringify(t.got)}`);
  console.log(`  open:   ${JSON.stringify(t.open)}`);
  console.log(`  stats:  ${JSON.stringify(t.stats)}`);
  if (i < N - 1) {
    await p.evaluate(() => { document.getElementById('end').classList.remove('show'); document.getElementById('btnAgain').click(); });
    await p.waitForTimeout(3000);
  }
}
await b.close();

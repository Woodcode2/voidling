// CAN A THUMB NEAR THE BEZEL DRIVE AT ALL?
//
// The stick plants its base wherever the thumb lands and needs JOY_R (64px)
// of deflection for full speed. A thumb that lands 20px from the right edge
// and pushes RIGHT can only ever deflect 20px — and the re-anchor that would
// rescue it needs 109px of deflection to fire, which is 89px of glass that
// does not exist. The owner hit this on a phone: "eventually your finger goes
// off screen with the way it's designed."
//
// This drives from four distances to the right bezel and compares the speed
// reached pushing TOWARD it against the speed pushing AWAY from it. Those two
// should be the same. Distance is sampled against the MATCH clock, because
// under a software renderer wall time says nothing about how far the void got.
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4177';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch { } });
await p.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1200);
await p.click('#worldRow .wCard[data-world="maple"]');
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 4, null, { timeout: 600000 });
await p.evaluate(() => { window.__renderer.render = () => {}; });

/** world units travelled over `dt` seconds of MATCH time */
const travel = (dt) => p.evaluate(async (secs) => {
  const t0 = window.__matchState().t, a = window.__voidState();
  while (window.__matchState().t - t0 < secs) await new Promise((r) => requestAnimationFrame(r));
  const c = window.__voidState();
  return Math.hypot(c.x - a.x, c.z - a.z);
}, dt);

// Land the thumb `edge` px from the right bezel, then push `dir` (+1 right,
// -1 left) as far as the glass allows, and hold.
async function run(edge, dir) {
  const W = 430;
  const start = W - edge;
  await p.mouse.move(start, 600);
  await p.mouse.down();
  // push as far as there is room, in steps, the way a thumb actually moves
  const target = dir > 0 ? W - 2 : Math.max(2, start - 100);
  const steps = 10;
  for (let i = 1; i <= steps; i++) {
    await p.mouse.move(start + (target - start) * (i / steps), 600, { steps: 1 });
  }
  // hold still: the rescue must work without the thumb finding more glass
  const d = await travel(1.5);
  await p.mouse.up();
  await travel(0.8);          // let it coast to a stop before the next case
  return d;
}

console.log('thumb lands N px from the RIGHT bezel, then pushes toward it vs away\n');
console.log('  edge   push RIGHT   push LEFT   ratio');
let worst = 1;
for (const edge of [12, 20, 30, 45]) {
  const right = await run(edge, +1);
  const left = await run(edge, -1);
  const ratio = left > 0.01 ? right / left : 0;
  worst = Math.min(worst, ratio);
  console.log(`  ${String(edge).padStart(4)}px  ${right.toFixed(2).padStart(9)}u  `
    + `${left.toFixed(2).padStart(9)}u   ${ratio.toFixed(2)}${ratio < 0.8 ? '   <-- CRIPPLED' : ''}`);
}
console.log(`\nworst ratio ${worst.toFixed(2)} — ${worst >= 0.8 ? 'PASS' : 'FAIL'} (want >= 0.80)`);
await b.close();
process.exit(worst >= 0.8 ? 0 : 1);

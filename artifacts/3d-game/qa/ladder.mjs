// CAN A STRANDED DEVICE CLIMB BACK, AND DOES THE MENU STILL DEMOTE NOBODY?
//
// The quality ladder was a one-way door. Two mechanisms, both shipped:
//
//   1. `qShadowLatch` blocked the 3->2 climb in the adapter, and rung 3 is the
//      only shadowless rung — so the "pixel-ratio rungs above" the block's own
//      comment promised did not exist. One demotion to the bottom was forever:
//      1.15x pixel ratio, no shadows, for the rest of the session, on hardware
//      that had recovered.
//   2. The adapter sampled straight through cold boot and the menu. The world
//      build is 30-45 s of blocking JavaScript, and the frames around it read
//      as a device in trouble — so a good phone could be demoted before the
//      player touched anything, and (1) made it permanent.
//
// The fix moves the latch into applyQuality (a latched device climbs every
// rung, shadowless — the rebuild can never re-fire because wantShadows is
// false on both sides of every crossing) and gates the adapter on `started`.
//
// MEASURING IT: the adapter reads real frame rate, and under swiftshader
// everything is slow — the ladder would walk itself to the bottom and the
// probe would be reading the sandbox, not the logic. So the rAF loop is
// captured and performance.now() virtualised (the facewrap/groundsurf freeze
// technique), and frames are hand-cranked at EXACT virtual rates: 16.667 ms
// per frame is a 60 fps device no matter what the sandbox is doing, 40 ms is
// a 25 fps one. The adapter's qAccT/qAccN see only what the probe feeds them.
//
// Three scenarios, in two page loads:
//   MENU GATE   at the menu, never started: 20 virtual seconds at 25 fps must
//               demote nothing. (Pre-fix: demotes to rung 2-3.)
//   RECOVERY    mid-match, forced to rung 3 with the latch set, then 60 fps:
//               must climb all the way to rung 0 with shadows still off and
//               pixel ratio restored. (Pre-fix: stranded at 3 forever.)
//   DEMOTE      from the top, 25 fps: must still walk down — the gate and the
//               climb fix must not have killed the adapter's whole point.
//
//   node qa/ladder.mjs [port]
import { chromium } from 'playwright';

const PORT = process.argv[2] || '4173';
const fail = (msg) => { console.log(`\nFAIL — ${msg}`); process.exit(1); };

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

// small viewport on purpose: the ladder's logic does not care about pixels and
// the probe cranks thousands of frames — sandbox render cost is the budget.
// dpr 2 so setPixelRatio(min(dpr, q.pr)) is distinguishable per rung.
const page = async () => {
  const p = await b.newPage({ viewport: { width: 300, height: 640 }, deviceScaleFactor: 2 });
  p.on('pageerror', (e) => console.log(`  [pageerror] ${e.message.split('\n')[0]}`));
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => {
    try {
      localStorage.clear();
      localStorage.setItem('voidPlayed', '1');
      localStorage.setItem('voidTut', '1');
      localStorage.setItem('voidDailyLast', new Date().toDateString());
    } catch { }
  });
  await p.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  return p;
};

const virtualise = (p) => p.evaluate(() => {
  const raw = window.requestAnimationFrame.bind(window);
  window.__pend = null;
  const rawNow = performance.now.bind(performance);
  window.__virt = rawNow();
  performance.now = () => window.__virt;
  window.requestAnimationFrame = (cb) => { window.__pend = cb; return 0; };
  // …AND STUB THE RENDER. This is a LOGIC probe: the adapter consumes dt and a
  // frame count, and nothing it decides depends on pixels being drawn. Under
  // swiftshader a real frame is 100-200 ms, which puts 3,500 cranked frames
  // past a ten-minute budget — measured, the first full-render version timed
  // out exactly there. With render stubbed a cranked frame is pure JavaScript.
  // The one place rendering DOES matter — the shader rebuild when the latch
  // first fires — happens on real frames before this stub goes in (see the
  // pin(3) + 4s settle below). qa/smoke.mjs still exercises real rendering.
  window.__renderer.render = () => { };
  raw(() => { });
});
// crank n frames, each advancing the virtual clock by ms. Batched so no single
// evaluate blocks for minutes under swiftshader.
const crank = async (p, n, ms, batch = 600) => {
  let done = 0;
  while (done < n) {
    const k = Math.min(batch, n - done);
    const ran = await p.evaluate(([k, ms]) => {
      for (let i = 0; i < k; i++) {
        const cb = window.__pend; if (!cb) return i;
        window.__pend = null; window.__virt += ms; cb(window.__virt);
      }
      return k;
    }, [k, ms]);
    if (ran < k) fail(`rAF chain broke after ${done + ran} frames — animate() threw`);
    done += ran;
  }
};
const q = (p) => p.evaluate(() => window.__quality());

// ── SCENARIO 1: THE MENU DEMOTES NOBODY ────────────────────────────────────
{
  const p = await page();
  await p.waitForTimeout(1200);
  await virtualise(p);
  await p.waitForFunction(() => !!window.__pend, null, { timeout: 30000 }).catch(() => { });
  const before = await q(p);
  await crank(p, 500, 40);            // 20 virtual seconds of 25 fps, at the menu
  const after = await q(p);
  console.log(`  MENU GATE   rung ${before.level} -> ${after.level} after 20s of 25fps at the menu`);
  if (after.level !== before.level || after.level !== 0)
    fail(`the menu demoted an idle device to rung ${after.level} — the started gate is not holding`);
  await p.close();
}

// ── SCENARIOS 2+3: RECOVERY, THEN DEMOTE, MID-MATCH ────────────────────────
{
  const p = await page();
  await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show');
  }));
  await p.evaluate(() => document.getElementById('btnPlay')?.click());
  await p.waitForTimeout(1400);
  await p.evaluate(() => document.querySelector('#worldRow .wCard[data-world="maple"]')?.click());
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 2.5, null, { timeout: 400000 });

  // strand the device the way the bug did: rung 3, shadows off, latch set —
  // on REAL frames, so the one-time shader rebuild happens outside the cranked
  // window and cannot pollute the virtual frame timing
  await p.evaluate(() => window.__pinQuality(3));
  await p.waitForTimeout(4000);
  await p.evaluate(() => window.__pinQuality(null));
  await virtualise(p);
  await p.waitForFunction(() => !!window.__pend, null, { timeout: 30000 }).catch(() => { });

  const stranded = await q(p);
  if (stranded.level !== 3) fail(`setup broke — expected rung 3, got ${stranded.level}`);
  if (stranded.shadows) fail('setup broke — shadows still on at rung 3');

  // RECOVERY: 50 virtual seconds of a rock-steady 60 fps. Climbs are gated at
  // qCd=10 apiece, so three climbs need ~35s plus the opening window.
  await crank(p, 3000, 1000 / 60);
  const rec = await q(p);
  console.log(`  RECOVERY    rung 3 -> ${rec.level} after 50s of 60fps  (shadows ${rec.shadows ? 'ON — WRONG' : 'off, latched'}, pr ${rec.pr})`);
  if (rec.level !== 0) fail(`stranded device only climbed to rung ${rec.level} — the door is still one-way`);
  if (rec.shadows) fail('the climb re-enabled shadows — the latch failed and the device just paid the shader rebuild');
  if (rec.pr < 1.5) fail(`pixel ratio did not recover (${rec.pr}) — the level moved but the resolution did not`);

  // DEMOTE: the adapter must still do its actual job. 25 fps from the top.
  await crank(p, 700, 40);            // 28 virtual seconds of 25 fps
  const dem = await q(p);
  console.log(`  DEMOTE      rung 0 -> ${dem.level} after 28s of 25fps  (shadows ${dem.shadows ? 'ON — WRONG' : 'stay off'})`);
  if (dem.level < 1) fail('a 25 fps device was never demoted — the gate killed the adapter');
  if (dem.shadows) fail('demotion turned shadows back on somehow');
  await p.close();
}

await b.close();
console.log('\nPASS — the menu demotes nobody, a stranded device recovers to rung 0');
console.log('       with shadows latched off and full pixel ratio, and a genuinely');
console.log('       slow device still walks down.');

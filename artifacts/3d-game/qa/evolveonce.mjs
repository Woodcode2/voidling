// IS A CHILD CONGRATULATED FOR RECOVERING FROM BEING EATEN? — the evolve probe.
//
//   node qa/evolveonce.mjs [port] [world]
//
// From docs/AUDIT-2026-08-23.md, which marked it SHIP THIS and it had not
// shipped. A hunter's connecting bite drops the player one rung down the form
// ladder, and `onPlayerBitten` walks `curStage` back by hand so the HUD label,
// the growth bar and the music all tell the truth about the setback. All of
// that is correct.
//
// What was not correct is the growth loop, which fires the whole EVOLVED
// ceremony on `ns > curStage` (prototype3d.ts). The score floor is a pure
// function of playerScore, so it hands the radius straight back — and about
// sixteen milliseconds after the BONK float, a child who has just been eaten
// gets the EVOLVED card, audio.evolve(), a camera punch, a 45ms buzz, a
// track('evolve') in the analytics funnel, and from GOBBLIN up a NEWSROOM
// HEADLINE congratulating the void on growing.
//
// Punishment dressed as a reward, on the one event the whole difficulty curve
// is built around. It also inflates every evolve number the game reports about
// itself, which is how it stayed invisible.
//
// ── WHAT IT MEASURES ─────────────────────────────────────────────────────
// The ceremony count across a real bite, taken through the real handler. The
// form itself must still come back — a child who climbs out of a setback IS
// that form again, and the HUD, the music and the bar must say so. Only the
// congratulations are once per match.
//
//   BEFORE the fix   ceremonies goes UP after the bite
//   AFTER            ceremonies is unchanged, cur returns, best never moved
//
// TRAP: voidUnlocked is a COMMA-JOINED STRING (unlocks.ts:39), not JSON.
// TRAP: __setVoidR sets curStage directly and so never fires the ceremony —
// the probe has to let the void grow the way a player grows it, or bestStage
// is still 0 when the bite lands and the re-fire is legitimate rather than
// the bug.
import { chromium } from 'playwright';

const PORT = process.argv[2] || '4177';
const WORLD = process.argv[3] || 'maple';

const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
  localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder');
} catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.waitForSelector('#btnPlay', { state: 'visible', timeout: 400000 });
await p.evaluate(() => document.getElementById('btnPlay').click());
await p.waitForSelector(`#worldRow .wCard[data-world="${WORLD}"]`, { state: 'visible', timeout: 400000 });
await p.evaluate((w) => document.querySelector(`#worldRow .wCard[data-world="${w}"]`).click(), WORLD);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });

// play, so the void grows the way a player grows it and a REAL ceremony fires
await p.evaluate(() => {
  const cv = document.querySelector('canvas');
  const cx = innerWidth / 2, cy = innerHeight / 2;
  cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
  const tick = () => {
    const vs = window.__voidState();
    let best = null, bd = 1e9;
    for (const e of window.__edibles) {
      if (e.eaten || !e.mesh?.visible || e.radius > vs.r * 0.92) continue;
      const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
      const d = dx * dx + dz * dz;
      if (d < bd) { bd = d; best = { dx, dz }; }
    }
    if (best) {
      const m = Math.hypot(best.dx, best.dz) || 1;
      dispatchEvent(new PointerEvent('pointermove', { pointerId: 1,
        clientX: cx + best.dx / m * 110, clientY: cy + best.dz / m * 110, bubbles: true }));
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

// wait for at least two real evolutions, so the bite lands on a form the child
// has genuinely earned and the re-fire would be unambiguous
await p.waitForFunction(() => (window.__stages?.().ceremonies ?? 0) >= 2, null,
  { timeout: 600000, polling: 200 });
const before = await p.evaluate(() => window.__stages());
console.log(`  grew naturally to form ${before.cur} — ${before.ceremonies} ceremonies, best ${before.best}`);

// ── SAMPLE THE DIP, DO NOT TRY TO READ IT ────────────────────────────────
// The first version of this bit, waited 600ms and asserted the form was down.
// It never was: the score floor is a pure function of playerScore, so it hands
// the radius straight back inside a frame or two — which is the whole mechanism
// of the bug and is exactly why the ceremony re-fires. Reading the state
// afterwards measures the recovery, not the setback. So a rAF sampler runs
// across the whole window and reports the LOWEST form it ever saw.
await p.evaluate(() => {
  window.__probeMin = 99;
  const tick = () => {
    const st = window.__stages?.();
    if (st) window.__probeMin = Math.min(window.__probeMin, st.cur);
    window.__probeRAF = requestAnimationFrame(tick);
  };
  tick();
});
await p.evaluate(() => window.__bite(true));
// …and then wait for the climb back, which is the moment under test. The score
// floor plus ordinary eating bring the form home; how long that takes depends
// on the world and the machine, so wait for the event rather than for a clock.
await p.waitForTimeout(800);
await p.waitForFunction((t) => (window.__stages?.().cur ?? 0) >= t, before.cur,
  { timeout: 300000, polling: 120 }).catch(() => {});
await p.waitForTimeout(2500);   // let the ceremony play if it is going to
const after = await p.evaluate(() => {
  cancelAnimationFrame(window.__probeRAF);
  return { ...window.__stages(), min: window.__probeMin, r: window.__voidState().r };
});
console.log(`  bitten: form dipped ${before.cur} -> ${after.min}, back to ${after.cur}, `
  + `radius ${after.r.toFixed(2)}`);
if (after.min >= before.cur) {
  console.log('');
  console.log(`FAIL — the bite never demoted (lowest form seen was ${after.min}), so this probe `
    + `never reached the state it exists to test. Do not read a PASS from this run`);
  await b.close();
  process.exit(1);
}
await b.close();

console.log(`  recovered: form ${after.cur}, ${after.ceremonies} ceremonies, best ${after.best}`);
console.log('');
if (after.ceremonies > before.ceremonies) {
  console.log(`  · the EVOLVED ceremony played ${after.ceremonies - before.ceremonies} more time(s) `
    + `after a bite that cost the player a whole form. The card, the sound, the buzz, the camera `
    + `punch, a track('evolve') and — from GOBBLIN up — a newsroom headline, all congratulating a `
    + `child for climbing back out of a setback about a second after it happened`);
  console.log(`\nFAIL — recovering from being eaten is being celebrated as an evolution`);
  process.exit(1);
}
if (after.cur < before.cur) {
  console.log(`  · the form did NOT come back (${before.cur} -> ${after.cur}). The ceremony is `
    + `supposed to be once per match; the FORM is not, and the HUD, the music and the growth bar `
    + `all read from it`);
  console.log(`\nFAIL — the fix suppressed the form itself, not just the congratulations`);
  process.exit(1);
}
console.log(`PASS — the form came back (${after.cur}) and the ceremony did not: `
  + `${after.ceremonies} ceremonies before and after the bite, best form held at ${after.best}`);

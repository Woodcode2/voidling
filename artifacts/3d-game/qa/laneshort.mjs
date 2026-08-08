// THE RIVALS ARE MISSING THE LANE THE DESIGN SETS FOR THEM. BY HOW MUCH, AND WHY?
//
// rivals.ts anchors the top of the field at 0.94 x the player's own score
// (laneWant), and with satiety at FULL_AT 1.2 the leader can reach 1.13x — the
// stated design is a race a distracted run genuinely loses.
//
// Measured, it is not close. qa/difficulty.mjs finished:
//   maple/child   player 168,401   best rival 71,727   = 0.43x
//   pirate/child  player 188,329   best rival 43,898   = 0.23x
// and a driver with NO TARGETING AT ALL won both its matches by +109%.
//
// The lane arithmetic is not the suspect — this file's comments record three
// separate attempts to fix exactly this by raising the ceiling, and the reason
// they failed: "band multiplies points a rival EARNS, so if it earns nothing,
// any multiplier of nothing is still nothing. The missing thing was never the
// target, it was the food."
//
// So this samples, per rival, per second: score against the lane it is supposed
// to be running, its radius against the player's, and its distance from the
// player — because the larder (the off-screen grazing that feeds a rival when
// nobody is watching) is gated on `away = dist > 95`. If rivals spend the match
// inside 95 units, the one mechanism built to feed them never runs.
//
// It answers three questions with numbers rather than a hunch:
//   1. how far short of the lane does the field finish?
//   2. what fraction of the match is each rival eligible to graze at all?
//   3. is the size cap (0.78x the player) or the food the binding constraint?
//
//   node qa/laneshort.mjs [world] [driver] [port]
import { chromium } from 'playwright';

const WORLD = process.argv[2] || 'maple';
const DRIVER = process.argv[3] || 'child';
const PORT = process.argv[4] || '4173';

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => {
  try {
    localStorage.clear();
    localStorage.setItem('voidPlayed', '1');
    localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
  } catch { }
});
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show');
}));
await p.evaluate(() => document.getElementById('btnPlay')?.click());
await p.waitForTimeout(1400);
await p.evaluate((w) => {
  const c = document.querySelector(`#worldRow .wCard[data-world="${w}"]`)
    || document.querySelector('#worldRow .wCard[data-world]');
  c?.click();
}, WORLD);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
await p.evaluate(() => { window.__renderer.render = () => { }; });

await p.evaluate((drv) => {
  window.__samples = [];
  const cv = document.querySelector('canvas');
  const cx = innerWidth / 2, cy = innerHeight / 2;
  cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
  let heldT = -1, held = null, stall = 0, sampleT = -1;
  const tick = () => {
    const ms = window.__matchState?.();
    if (!ms) { requestAnimationFrame(tick); return; }
    const vs = window.__voidState();

    // ── the sample, once a second ─────────────────────────────────────────
    if (ms.t - sampleT >= 1) {
      sampleT = ms.t;
      // the lane the design wants the LEADER to be carrying right now
      const wantTop = ms.score * 0.94;
      window.__samples.push({
        t: Math.round(ms.t * 10) / 10,
        pScore: Math.round(ms.score),
        pR: Math.round(vs.r * 100) / 100,
        wantTop: Math.round(wantTop),
        rivals: (ms.rivals || []).filter((r) => r.joined).map((r) => ({
          n: r.name,
          s: Math.round(r.score),
          r: Math.round(r.r * 100) / 100,
          d: Math.round(Math.hypot(r.x - vs.x, r.z - vs.z)),
        })),
      });
    }

    const gap = drv === 'expert' ? 0 : 2.4;
    if (ms.t - heldT > gap) {
      heldT = ms.t;
      const cand = [];
      let best = null, bd = 1e9;
      for (const e of window.__edibles) {
        if (e.eaten || !e.mesh?.visible) continue;
        const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
        const d = dx * dx + dz * dz;
        if (e.radius <= vs.r * 0.92) { if (d < bd) { bd = d; best = { dx, dz }; } }
        if (drv === 'child' && d < 90000) cand.push({ dx, dz });
      }
      held = best;
      if (drv === 'child') {
        stall = Math.random() < 0.34 ? 1 : 0;
        if (cand.length && Math.random() < 0.30) held = cand[(Math.random() * cand.length) | 0];
      }
    }
    if (held && !stall) {
      let a = Math.atan2(held.dz, held.dx);
      if (drv === 'child') a += (Math.random() - 0.5) * 2.1;
      dispatchEvent(new PointerEvent('pointermove', {
        pointerId: 1, clientX: cx + Math.cos(a) * 110, clientY: cy + Math.sin(a) * 110, bubbles: true,
      }));
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}, DRIVER);

await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'),
  null, { timeout: 900000 });
const S = await p.evaluate(() => window.__samples);
await b.close();

if (!S.length) { console.log('no samples'); process.exit(1); }

console.log(`${WORLD} / ${DRIVER} — ${S.length} samples\n`);
console.log('   t   player    lane(top)   leader   leader/lane   leader/player   rivals within 95u');
for (const s of S.filter((_, i) => i % 20 === 0 || i === S.length - 1)) {
  const led = s.rivals.reduce((a, r) => (r.s > a ? r.s : a), 0);
  const near = s.rivals.filter((r) => r.d <= 95).length;
  const oL = s.wantTop ? (led / s.wantTop) : 0;
  const oP = s.pScore ? (led / s.pScore) : 0;
  console.log(`${String(s.t).padStart(5)} ${String(s.pScore).padStart(8)}`
    + ` ${String(s.wantTop).padStart(10)} ${String(led).padStart(8)}`
    + ` ${(oL * 100).toFixed(0).padStart(11)}% ${(oP * 100).toFixed(0).padStart(14)}%`
    + ` ${String(near).padStart(12)}/${s.rivals.length}`);
}

const last = S[S.length - 1];
const leaderEnd = last.rivals.reduce((a, r) => (r.s > a ? r.s : a), 0);
console.log(`\n══ WHERE THE FIELD FINISHED`);
console.log(`  player            ${last.pScore}`);
console.log(`  lane wanted (top) ${last.wantTop}   (0.94 x the player, by design)`);
console.log(`  leader reached    ${leaderEnd}   = ${(leaderEnd / Math.max(1, last.wantTop) * 100).toFixed(0)}% of its lane`
  + `, ${(leaderEnd / Math.max(1, last.pScore) * 100).toFixed(0)}% of the player`);

// ── question 2: could the larder ever have run? ────────────────────────────
let slots = 0, eligible = 0;
for (const s of S) for (const r of s.rivals) { slots++; if (r.d > 95) eligible++; }
console.log(`\n══ THE LARDER GATE (dist > 95 from the player)`);
console.log(`  rival-seconds far enough away to graze: ${eligible}/${slots}`
  + ` = ${(eligible / Math.max(1, slots) * 100).toFixed(0)}%`);
if (eligible / Math.max(1, slots) < 0.5) {
  console.log('  The mechanism built to feed the family is switched off for most of the match.');
}

// ── question 3: size cap or food? ──────────────────────────────────────────
const rEnd = last.rivals.map((r) => r.r);
console.log(`\n══ SIZE`);
console.log(`  player r ${last.pR}   rivals ${rEnd.join(', ')}`);
console.log(`  cap is 0.78 x player = ${(last.pR * 0.78).toFixed(2)};`
  + ` biggest rival ${Math.max(...rEnd).toFixed(2)}`
  + ` = ${(Math.max(...rEnd) / (last.pR * 0.78) * 100).toFixed(0)}% of the cap`);
console.log(Math.max(...rEnd) < last.pR * 0.78 * 0.9
  ? '  Rivals are NOT pinned at the size cap — they are short of food, not of ceiling.'
  : '  Rivals ARE at the size cap, so the cap is what limits what they can eat.');

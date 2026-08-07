// DOES THE EVOLUTION CARD FIRE AT THE RADIUS IT CLAIMS?
//
//   node qa/_evoearly.mjs [world]
//
// The suspicion, from qa/_first90.mjs: the evolve card said MUNCHER at match
// t=8.22 with the void at r=1.16, and the growth bar's own form label did not
// say MUNCHER until t=22.82 (r=1.602 — FORM_MIN[1] is 1.6). Two readouts of
// the same number, 14.6s apart.
//
// Mechanism to test: onEat() sets voidling.radius to the RAW grown value
// (prototype3d.ts:2307). The growth-law rate limiter that pulls it back down
// (:4023) runs at line 4023 of animate(), i.e. EARLIER in the same frame; the
// evolution check (:4619) runs LATER. So a single bite's un-clamped overshoot
// is visible to the evolution check for exactly one frame, and curStage latches
// on it. Then the clamp removes the radius, and the real crossing — the one the
// bar shows — produces no card at all.
//
// Measured, not argued: sample voidling.radius EVERY FRAME (piggy-backing the
// stubbed renderer.render, so nothing is missed between 55ms polls), and hang a
// MutationObserver on #evolve so the card's own moment is captured with the
// radius of that exact frame.
import { chromium } from 'playwright';
const WORLD = process.argv[2] || 'maple';
const PORT = 4237;
const FORM_MIN = [0, 1.6, 2.5, 3.6, 5.5, 8.0];
const FORMS = ['VOIDLING', 'MUNCHER', 'GOBBLER', 'DEVOURER', 'COLOSSUS', 'WORLD ENDER'];

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try { localStorage.clear(); } catch { } });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.01, null, { timeout: 400000 });

await p.evaluate(() => {
  window.__F = [];      // per-frame radius
  window.__C = [];      // card fires
  window.__NOM = null;  // when FIRST NOM was banked
  window.__STK = [];    // sticker finds
  const ls = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function (k, v) {
    const t = window.__matchState?.().t ?? 0;
    if (k === 'voidFirstNom') window.__NOM = +t.toFixed(2);
    if (k === 'voidStickers') window.__STK.push({ t: +t.toFixed(2), n: String(v).split(',').filter(Boolean).length });
    return ls(k, v);
  };
  // every frame, no gaps
  window.__renderer.render = () => {
    const ms = window.__matchState?.(); if (!ms) return;
    window.__F.push([+ms.t.toFixed(3), +ms.r.toFixed(4)]);
  };
  const grab = (why) => {
    const ms = window.__matchState(); const ev = document.getElementById('evolve');
    window.__C.push({ why, t: +ms.t.toFixed(3), r: +ms.r.toFixed(4),
      card: (ev.textContent || '').trim(),
      bar: (document.querySelector('#growth .gNow') || {}).textContent || '' });
  };
  new MutationObserver(() => { if (document.getElementById('evolve').classList.contains('show')) grab('card'); })
    .observe(document.getElementById('evolve'), { attributes: true, attributeFilter: ['class'] });
  new MutationObserver(() => grab('bar'))
    .observe(document.querySelector('#growth .gNow'), { childList: true, characterData: true, subtree: true });

  // DRIVER: a child who works the control well. Steer at the nearest legal meal.
  const cv = document.querySelector('canvas');
  let down = false, dx = 0, dy = -1, dirT = 0;
  const pe = (type, x, y) => (type === 'pointerdown' ? cv : window).dispatchEvent(
    new PointerEvent(type, { pointerId: 7, pointerType: 'touch', isPrimary: true, bubbles: true, clientX: x, clientY: y }));
  window.__in = setInterval(() => {
    const ms = window.__matchState?.(); if (!ms || ms.t < 1) return;
    if (ms.t > dirT) {
      dirT = ms.t + 1.2;
      const vs = window.__voidState(); let bd = 1e9, bx = 0, bz = 0;
      for (const e of window.__edibles) {
        if (!e.mesh.visible || e.eaten || e.radius > ms.r * 0.92) continue;
        const d = Math.hypot(e.mesh.position.x - vs.x, e.mesh.position.z - vs.z);
        if (d < bd) { bd = d; bx = e.mesh.position.x - vs.x; bz = e.mesh.position.z - vs.z; }
      }
      const l = Math.hypot(bx, bz) || 1; dx = bx / l; dy = bz / l;
    }
    if (!down) { down = true; pe('pointerdown', 195, 500); }
    pe('pointermove', 195 + dx * 90, 500 + dy * 90);
  }, 55);
});

const started = Date.now();
while (true) {
  const t = await p.evaluate(() => window.__matchState?.().t ?? 0);
  if (t > 178) break;
  if (Date.now() - started > 600000) { console.log(`!! wall timeout at t=${t.toFixed(1)}`); break; }
  await p.waitForTimeout(3000);
}
const r = await p.evaluate(() => ({ F: window.__F, C: window.__C, NOM: window.__NOM, STK: window.__STK,
  fin: window.__matchState().r, score: window.__matchState().score }));

console.log(`\n═══ ${WORLD.toUpperCase()} — evolution truth, one full 180s match, driver ═══`);
console.log(`frames sampled: ${r.F.length}   final r ${r.fin.toFixed(2)}   score ${r.score}`);
console.log(`FIRST NOM banked at match t=${r.NOM}`);
console.log(`stickers: ${r.STK.length ? r.STK.map((s) => `t=${s.t}(#${s.n})`).join(' ') : 'NONE IN A WHOLE MATCH'}`);

// when did the radius FIRST touch each form threshold, and when did it first
// SETTLE there (settle = the value at the start of the next frame)
console.log('\n  form        first frame r>=min      first frame where it STAYED >=min for 1s');
for (let s = 1; s < FORM_MIN.length; s++) {
  const min = FORM_MIN[s];
  let touch = null, hold = null;
  for (let i = 0; i < r.F.length; i++) {
    if (r.F[i][1] >= min) {
      if (touch === null) touch = r.F[i][0];
      if (hold === null) {
        const t0 = r.F[i][0];
        let ok = true;
        for (let j = i; j < r.F.length && r.F[j][0] < t0 + 1; j++) if (r.F[j][1] < min) { ok = false; break; }
        if (ok) hold = t0;
      }
    }
  }
  console.log(`  ${FORMS[s].padEnd(11)} ${String(touch ?? '—').padStart(10)}            ${String(hold ?? '—').padStart(10)}`
    + `   (gap ${touch !== null && hold !== null ? (hold - touch).toFixed(2) + 's' : '—'})`);
}
console.log('\n  card / bar events:');
for (const c of r.C) console.log(`    t=${String(c.t).padStart(7)} r=${String(c.r).padStart(7)} ${c.why === 'card' ? 'EVOLVE CARD' : 'growth bar '} card="${c.card}" bar="${c.bar}"`);

// how big is the one-frame overshoot, in general?
let over = 0, n = 0, worst = 0;
for (let i = 1; i < r.F.length; i++) {
  const d = r.F[i][1] - r.F[i - 1][1];
  if (d > 0.02) { over += d; n++; if (d > worst) worst = d; }
}
console.log(`\n  single-frame radius JUMPS >0.02: ${n}   mean +${n ? (over / n).toFixed(3) : 0}   worst +${worst.toFixed(3)}`);
await b.close();

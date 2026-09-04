// N MATCHES PER CONFIGURATION, BECAUSE ONE MATCH CANNOT TELL YOU ANYTHING.
//
// Three single runs of qa/laneshort.mjs on three builds gave the leader at 59%,
// 44% and 48% of its lane. Those look like a regression and a partial recovery.
// They may equally be one number measured three times: rival join times, spawn
// positions and the child driver's stalls are all random, and the field even
// varies in SIZE between runs (three rivals joined in one, four in another).
//
// Tuning a stochastic system off single runs is exactly how rivals.ts collected
// three confident, documented, wrong fixes. So this runs the same driver N
// times and reports the mean and the spread, and refuses to call a difference
// real when the spread swallows it.
//
// Reports per configuration:
//   leader/lane    how close the field gets to the target the design sets
//   leader/player  the number a child actually sees on the results board
//   place          the player's finishing position — the owner's floor is
//                  "never below 3rd", so max place matters as much as the mean
//   family share   fraction of all bites taken by the family, which is the
//                  INPUT the lane multiplier acts on
//
//   node qa/ab.mjs [n] [world] [driver] [port]
import { chromium } from 'playwright';

const N = Number(process.argv[2] || 5);
const WORLD = process.argv[3] || 'maple';
const DRIVER = process.argv[4] || 'child';
const PORT = process.argv[5] || '4173';

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

const runs = [];
for (let i = 0; i < N; i++) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => {
    try {
      localStorage.clear();
      localStorage.setItem('voidPlayed', '1');
      localStorage.setItem('voidTut', '1');
      localStorage.setItem('voidDailyLast', new Date().toDateString());
      localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
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
    const cv = document.querySelector('canvas');
    const cx = innerWidth / 2, cy = innerHeight / 2;
    cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
    let heldT = -1, held = null, stall = 0, flailA = 0;
    const tick = () => {
      const ms = window.__matchState?.();
      if (!ms) { requestAnimationFrame(tick); return; }
      const vs = window.__voidState();
      if (drv === 'flail') {
        if (ms.t - heldT > 2.0) { heldT = ms.t; flailA = Math.random() * Math.PI * 2; }
        dispatchEvent(new PointerEvent('pointermove', {
          pointerId: 1, clientX: cx + Math.cos(flailA) * 110, clientY: cy + Math.sin(flailA) * 110, bubbles: true,
        }));
        requestAnimationFrame(tick);
        return;
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
  await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    const ms = window.__matchState?.() || {};
    const rows = [...document.querySelectorAll('#endList .er')];
    const place = rows.findIndex((e) => e.classList.contains('me')) + 1;
    const leader = (ms.rivals || []).reduce((a, x) => (x.score > a ? x.score : a), 0);
    return {
      place, of: rows.length,
      pScore: Math.round(ms.score ?? 0),
      leader: Math.round(leader),
      ateYou: ms.ate?.you ?? 0,
      ateFam: ms.ate?.family ?? 0,
      joined: (ms.rivals || []).filter((x) => x.joined).length,
    };
  });
  r.lane = Math.round(r.pScore * 0.94);
  runs.push(r);
  console.log(`  run ${i + 1}/${N}  place ${r.place}/${r.of}  player ${String(r.pScore).padStart(7)}`
    + `  leader ${String(r.leader).padStart(7)}`
    + `  = ${(r.leader / Math.max(1, r.lane) * 100).toFixed(0)}% of lane`
    + `  bites ${r.ateYou}/${r.ateFam}  (${r.joined} rivals)`);
  await p.close();
}
await b.close();

const stat = (xs) => {
  const m = xs.reduce((a, x) => a + x, 0) / xs.length;
  const sd = Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / Math.max(1, xs.length - 1));
  return { m, sd, lo: Math.min(...xs), hi: Math.max(...xs) };
};
const ofLane = stat(runs.map((r) => r.leader / Math.max(1, r.lane) * 100));
const ofPlayer = stat(runs.map((r) => r.leader / Math.max(1, r.pScore) * 100));
const places = stat(runs.map((r) => r.place));
const famShare = stat(runs.map((r) => r.ateFam / Math.max(1, r.ateYou + r.ateFam) * 100));

console.log(`\n══ ${WORLD} / ${DRIVER} — ${N} matches`);
const line = (nm, s, u = '%') =>
  console.log(`  ${nm.padEnd(16)} mean ${s.m.toFixed(1)}${u}   sd ${s.sd.toFixed(1)}`
    + `   range ${s.lo.toFixed(1)}-${s.hi.toFixed(1)}`);
line('leader / lane', ofLane);
line('leader / player', ofPlayer);
line('family bite share', famShare);
line('player place', places, '');
console.log(`  worst place seen  ${places.hi}   (owner's floor: never below 3rd)`);

console.log('\nREAD IT LIKE THIS: a change is only real if the means differ by more');
console.log('than about the sd. Anything smaller is the same number measured twice.');

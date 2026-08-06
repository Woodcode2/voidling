// SCRATCH — THE FIRST EVOLUTION, frame by frame.
//
// _first60.mjs showed a brand-new player being told "MUNCHER EVOLVED" at t=6.5
// while the growth bar under their void still read VOIDLING / NEXT MUNCHER for
// another nine seconds. This probe separates the two candidate causes — a
// family bite knocking a whole form off, or the growth law's own clamp clawing
// the radius back — by logging rivalEv.bites and the bar label together at 20Hz
// of match time, with a child driving.
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => {
  try { localStorage.clear(); } catch {}
  Object.defineProperty(window, '__renderer', { configurable: true,
    set(v) { try { v.render = () => {}; } catch {} Object.defineProperty(window, '__renderer', { value: v, writable: true, configurable: true }); },
    get() { return undefined; } });
});
await p.goto('http://127.0.0.1:4177/', { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__matchState, null, { timeout: 500000 });
await p.waitForFunction(() => window.__matchState().t > 0, null, { timeout: 600000 });

// drive at the nearest edible from the very first frame, the way a child does
await p.evaluate(() => {
  const cv = document.querySelector('canvas');
  const cx = innerWidth / 2, cy = innerHeight / 2;
  cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
  const tick = () => {
    const vs = window.__voidState(); let best = null, bd = 1e9;
    for (const e of window.__edibles) {
      if (e.eaten || !e.mesh?.visible || e.radius > vs.r * 0.9) continue;
      const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
      const d = Math.hypot(dx, dz); if (d < bd) { bd = d; best = [dx / d, dz / d]; }
    }
    if (best) window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1,
      clientX: cx + best[0] * 90, clientY: cy + best[1] * 90, bubbles: true }));
    requestAnimationFrame(tick);
  };
  tick();
});

const rows = [];
while (true) {
  const s = await p.evaluate(() => {
    const ms = window.__matchState(), vs = window.__voidState();
    const g = document.getElementById('growth');
    const ev = document.getElementById('evolve');
    const gd = document.getElementById('guide');
    let near = 1e9, nearR = 0;
    for (const rv of ms.rivals) { if (!rv.joined) continue;
      const d = Math.hypot(rv.x - vs.x, rv.z - vs.z); if (d < near) { near = d; nearR = rv.r; } }
    return { t: ms.t, r: vs.r, sc: ms.score,
      bites: ms.ev.bites, hb: ms.ev.hunterBites, charges: ms.ev.charges,
      bar: (g?.innerText || '').replace(/\s+/g, ' ').trim(),
      evo: ev?.classList.contains('show') ? (ev.innerText || '').replace(/\s+/g, ' ').trim() : '',
      evoOp: ev ? +getComputedStyle(ev).opacity : 0,
      guide: gd && +getComputedStyle(gd).opacity > 0.05 ? gd.innerText.replace(/\s+/g, ' ').trim() : '',
      nearD: Math.round(near), nearR: +nearR.toFixed(2),
      nom: !!localStorage.getItem('voidFirstNom'),
    };
  });
  rows.push(s);
  if (s.t > 40) break;
  await p.waitForTimeout(45);
}
console.log('  matchT  radius  score  bites  nearest-rival(d/r)  bar                            evolve-banner   guide');
let prev = null;
for (const s of rows) {
  const k = [s.bar, s.evo, s.guide, s.bites, Math.round(s.r * 20)].join('|');
  if (k === prev) continue; prev = k;
  console.log(`${s.t.toFixed(2).padStart(7)} ${s.r.toFixed(3).padStart(7)} ${String(s.sc).padStart(6)} ${String(s.bites).padStart(6)}  ${String(s.nearD).padStart(4)}/${String(s.nearR).padEnd(5)}  ${s.bar.padEnd(30)} ${(s.evo + ' ' + s.evoOp.toFixed(2)).padEnd(24)} ${s.guide}`);
}
const firstBite = rows.find(r => r.bites > 0);
const firstEvo = rows.find(r => r.evo);
console.log('\nfirst family bite at match t =', firstBite ? firstBite.t.toFixed(2) : 'never');
console.log('first EVOLVED banner at match t =', firstEvo ? firstEvo.t.toFixed(2) : 'never');
console.log('FIRST NOM banked:', rows[rows.length - 1].nom);
await b.close();

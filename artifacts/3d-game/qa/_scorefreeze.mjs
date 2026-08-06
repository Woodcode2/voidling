// SCRATCH — IS THE SCORE ACTUALLY FROZEN MID-MATCH?
//
// qa/pace.mjs on Maple reported score 45045 at t=120, 45045 at t=140 and
// 45045 at t=160 — three window samples, byte-identical, across 73 props
// eaten. Either the number a child watches genuinely stops for forty seconds
// of a 180-second match, or the window sampler is lying. This samples score,
// radius and eaten-count every match-second for the whole match and prints
// the longest run with no score movement.
import { chromium } from 'playwright';
const WORLD = process.argv[2] || 'maple';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1, hasTouch: true });
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => {
  try { localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {}
  Object.defineProperty(window, '__renderer', { configurable: true,
    set(v) { try { v.render = () => {}; } catch {}
      Object.defineProperty(window, '__renderer', { value: v, writable: true, configurable: true }); },
    get() { return undefined; } });
});
await p.goto(`http://127.0.0.1:4177/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__matchState, null, { timeout: 500000 });

// Sample INSIDE the page on the game's own rAF, so nothing is missed while the
// harness is round-tripping. Same seek-and-eat drive pace.mjs uses: aim at the
// nearest edible the void can actually swallow.
await p.evaluate(() => {
  window.__sf = [];
  let lastT = -1;
  const step = () => {
    const ms = window.__matchState ? window.__matchState() : null;
    const vs = window.__voidState ? window.__voidState() : null;
    if (ms && vs) {
      const s = Math.floor(ms.t);
      if (s !== lastT) { lastT = s;
        const ed = window.__edibles ? window.__edibles() : [];
        let near = 1e9, edibleNear = 1e9, nBig = 0, nSmall = 0;
        for (const e of ed) {
          if (!e.mesh || !e.mesh.parent) continue;
          const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
          const d = Math.hypot(dx, dz);
          if (d < near) near = d;
          if (e.radius <= vs.r * 1.11) { nSmall++; if (d < edibleNear) edibleNear = d; }
          else nBig++;
        }
        window.__sf.push({ t: s, score: Math.round(ms.score), r: +vs.r.toFixed(2),
          near: Math.round(near), edibleNear: Math.round(edibleNear), nSmall, nBig });
      }
    }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  // drive: steer toward the nearest EATABLE thing
  const c = document.querySelector('canvas');
  const ev = (type, x, y) => c.dispatchEvent(new PointerEvent(type, { pointerId: 1, clientX: x, clientY: y, bubbles: true, isPrimary: true }));
  ev('pointerdown', 215, 500);
  setInterval(() => {
    const vs = window.__voidState ? window.__voidState() : null;
    const ed = window.__edibles ? window.__edibles() : [];
    if (!vs) return;
    let best = null, bd = 1e9;
    for (const e of ed) {
      if (!e.mesh || !e.mesh.parent || e.radius > vs.r * 1.11) continue;
      const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
      const d = dx * dx + dz * dz;
      if (d < bd) { bd = d; best = e; }
    }
    if (!best) return;
    const dx = best.mesh.position.x - vs.x, dz = best.mesh.position.z - vs.z;
    const m = Math.hypot(dx, dz) || 1;
    ev('pointermove', 215 + (dx / m) * 140, 500 + (dz / m) * 140);
  }, 45);
});

await p.waitForFunction(() => { const m = window.__matchState && window.__matchState(); return m && m.t > 178; },
  null, { timeout: 3000000, polling: 2000 });
const sf = await p.evaluate(() => window.__sf);
await b.close();

console.log(`\n══ ${WORLD.toUpperCase()} — score, second by second ══`);
console.log('    t   score   Δ    r    nearest  nearestEDIBLE  #edible  #tooBig');
let flat = 0, worst = { len: 0, from: 0 };
for (let i = 1; i < sf.length; i++) {
  const d = sf[i].score - sf[i - 1].score;
  if (d === 0) { flat++; if (flat > worst.len) worst = { len: flat, from: sf[i - flat].t }; } else flat = 0;
  if (sf[i].t % 5 === 0 || d === 0)
    console.log(`  ${String(sf[i].t).padStart(3)} ${String(sf[i].score).padStart(7)} ${String(d).padStart(5)} ${String(sf[i].r).padStart(6)} ${String(sf[i].near).padStart(8)} ${String(sf[i].edibleNear === 1000000000 ? 'NONE' : sf[i].edibleNear).padStart(14)} ${String(sf[i].nSmall).padStart(8)} ${String(sf[i].nBig).padStart(8)}`);
}
console.log(`\n  LONGEST RUN WITH THE SCORE NOT MOVING: ${worst.len}s, starting at t=${worst.from}`);
const nothing = sf.filter((s) => s.nSmall === 0).length;
console.log(`  seconds with NOTHING in the world small enough to eat: ${nothing}`);

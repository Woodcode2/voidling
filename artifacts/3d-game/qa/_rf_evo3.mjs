// REFUTATION PROBE 4 — HOW OFTEN IS COLOSSUS ACTUALLY REACHED?
// A COMPETENT player, not a lazy circle: every frame, steer the joystick at the
// nearest edible the void can actually swallow. Renderer nulled so a whole
// 180s match runs in a couple of minutes. Prints the form ladder with times.
import { chromium } from 'playwright';
const WORLD = process.argv[2] || 'maple';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1, hasTouch: true });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => {
  try { localStorage.clear(); localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch { /* private */ }
  Object.defineProperty(window, '__renderer', { configurable: true,
    set(v) { try { v.render = () => {}; } catch { /* noop */ }
      Object.defineProperty(window, '__renderer', { value: v, writable: true, configurable: true }); },
    get() { return undefined; } });
});
await p.goto(`http://127.0.0.1:4177/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__matchState, null, { timeout: 500000 });
await p.evaluate(() => document.querySelectorAll('.show')
  .forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
const tap = async (sel) => { await p.waitForSelector(sel, { timeout: 300000 });
  await p.evaluate((s) => document.querySelector(s).click(), sel); };
await tap('#btnPlay'); await p.waitForTimeout(1500);
await tap(`#worldRow .wCard[data-world="${WORLD}"]`);

// GREEDY DRIVER: aim the stick at the nearest edible strictly inside the eat
// ratio, in SCREEN space (the joystick is screen-relative), re-aimed per frame.
await p.evaluate(() => {
  const c = document.querySelector('canvas');
  const ev = (t, x, y) => c.dispatchEvent(new PointerEvent(t, { pointerId: 1, clientX: x, clientY: y, bubbles: true, isPrimary: true }));
  const CX = 215, CY = 500;
  ev('pointerdown', CX, CY);
  const THREE = window.__THREE;
  const v = new THREE.Vector3();
  window.__ladder = [];
  let lastForm = '';
  const drive = () => {
    const vs = window.__voidState?.(); const cam = window.__cam;
    if (vs && cam && window.__edibles) {
      const form = (document.getElementById('growth')?.innerText || '').replace(/\s+/g, ' ').trim();
      const ms = window.__matchState?.();
      if (form && form !== lastForm) { window.__ladder.push({ t: +(ms?.t ?? 0).toFixed(1), r: +vs.r.toFixed(2), form }); lastForm = form; }
      let best = null, bd = 1e9;
      for (const e of window.__edibles) {
        if (e.eaten || !e.mesh.visible) continue;
        if (e.radius > vs.r * 1.11) continue;
        const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
        const d = dx * dx + dz * dz;
        // prefer BIG food nearby: score by size per distance
        const sc = d / Math.max(0.2, e.radius * e.radius);
        if (sc < bd) { bd = sc; best = e; }
      }
      if (best) {
        v.set(best.mesh.position.x, 0, best.mesh.position.z).project(cam);
        const sx = (v.x * 0.5 + 0.5) * window.innerWidth, sy = (-v.y * 0.5 + 0.5) * window.innerHeight;
        let dx = sx - CX, dy = sy - CY; const m = Math.hypot(dx, dy) || 1;
        ev('pointermove', CX + (dx / m) * 60, CY + (dy / m) * 60);
      }
    }
    requestAnimationFrame(drive);
  };
  requestAnimationFrame(drive);
});
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 176, null, { timeout: 900000 });
const out = await p.evaluate(() => ({ ladder: window.__ladder, ms: window.__matchState() }));
await b.close();
console.log(`\n### ${WORLD} — a GREEDY (competent) 180s run`);
for (const x of out.ladder) console.log(`  t=${String(x.t).padStart(6)}  r=${String(x.r).padStart(6)}  ${x.form}`);
console.log(`  final r=${out.ms.r.toFixed(2)}  score=${out.ms.score}`);

// REFUTATION PROBE 2 — A WHOLE REAL MATCH, renderer nulled so the sim runs at
// near real time (the _evolvesync trick). Every frame it records the hero's
// evolve-burst observables so a real DEVOURER -> COLOSSUS crossing can be
// caught in the wild rather than simulated with __setVoidR.
//
//   node qa/_rf_evo2.mjs [world]
//
// Observables (all read off window.__scene, no module state touched):
//   ring0 / star0  — the evolution ribbon + star flare (gated on ringBurst)
//   uWobble        — the jelly slosh
//   bodyScale      — carries evolveT's double bounce
// Plus the banner text, so each burst can be attributed to a named form.
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
const tap = async (sel) => {
  await p.waitForSelector(sel, { timeout: 300000 });
  await p.evaluate((s) => document.querySelector(s).click(), sel);
};
await tap('#btnPlay'); await p.waitForTimeout(1500);
await tap(`#worldRow .wCard[data-world="${WORLD}"]`);
await p.evaluate(() => {
  const c = document.querySelector('canvas');
  const ev = (t, x, y) => c.dispatchEvent(new PointerEvent(t, { pointerId: 1, clientX: x, clientY: y, bubbles: true, isPrimary: true }));
  ev('pointerdown', 215, 500);
  let a = 0;
  setInterval(() => { a += 0.06; ev('pointermove', 215 + Math.cos(a) * 120, 500 + Math.sin(a * 0.7) * 150); }, 40);
});
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 500000 });

// install the per-frame recorder INSIDE the page so nothing is missed between polls
await p.evaluate(() => {
  const THREE = window.__THREE;
  let body = null;
  window.__scene.traverse((o) => {
    if (o.isMesh && o.material?.uniforms?.uAbyss && (o.geometry.parameters?.widthSegments ?? 0) >= 90) body = o;
  });
  let g = body;
  const hasRings = (o) => (o.children || []).some((c) => c.type === 'Group' && c.children.some((m) => m.isMesh && m.geometry?.type === 'TorusGeometry'));
  while (g && !hasRings(g)) g = g.parent;
  const ringGrp = g.children.find((c) => c.type === 'Group' && c.children.some((m) => m.isMesh && m.geometry?.type === 'TorusGeometry'));
  const tor = ringGrp.children.filter((m) => m.isMesh && m.geometry?.type === 'TorusGeometry');
  const orbit = ringGrp.children.find((c) => (c.children || []).some((s) => s.isSprite));
  const stars = orbit ? orbit.children.filter((s) => s.isSprite) : [];
  window.__log = [];
  const tick = () => {
    const ms = window.__matchState?.();
    if (ms && ms.t > 0) {
      const sc = new THREE.Vector3(); body.getWorldScale(sc);
      const e = document.getElementById('evolve');
      window.__log.push({
        t: +ms.t.toFixed(2), r: +ms.r.toFixed(3),
        st: body.material.uniforms.uStage.value,
        wb: +body.material.uniforms.uWobble.value.toFixed(3),
        r0: +tor[0].material.opacity.toFixed(3),
        s0: stars.length ? +stars[0].material.opacity.toFixed(3) : -1,
        bs: +sc.x.toFixed(4),
        bn: e && e.classList.contains('show') ? (e.innerText || '').replace(/\s+/g, ' ').trim() : '',
      });
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 176 || (window.__log?.length ?? 0) > 60000,
  null, { timeout: 900000 });
const log = await p.evaluate(() => window.__log);
await b.close();

console.log(`\n### ${WORLD} — one real match, ${log.length} frames sampled`);
// find each banner onset and report the burst observables in the 2s that follow
const events = [];
for (let i = 1; i < log.length; i++) {
  if (log[i].bn && log[i].bn !== log[i - 1].bn) events.push(i);
}
console.log(`\n  form banners fired: ${events.length}`);
for (const i of events) {
  const w = log.slice(i, i + 120).filter((x) => x.t <= log[i].t + 2.2);
  const mx = (k) => Math.max(...w.map((x) => x[k]));
  const base = log[Math.max(0, i - 12)].bs;
  const dev = Math.max(...w.map((x) => Math.abs(x.bs / base - 1)));
  console.log(`  t=${String(log[i].t).padStart(6)} r=${String(log[i].r).padStart(6)} uStage=${log[i].st} ` +
    `"${log[i].bn.slice(0, 40)}"  -> ring0max=${mx('r0').toFixed(3)} star0max=${mx('s0').toFixed(3)} ` +
    `wobMax=${mx('wb').toFixed(3)} bodyScaleDev=${(dev * 100).toFixed(1)}%`);
}
// and the whole-match ring0 timeline, so a burst that fires without a banner is caught too
const bursts = [];
for (let i = 1; i < log.length; i++) if (log[i].r0 > 0.02 && log[i - 1].r0 <= 0.02) bursts.push(log[i]);
console.log(`\n  evolution-ribbon bursts in the whole match: ${bursts.length}`);
for (const x of bursts) console.log(`    t=${x.t} r=${x.r} uStage=${x.st}`);
const finalR = log[log.length - 1];
console.log(`\n  final: t=${finalR.t} r=${finalR.r} uStage=${finalR.st}`);

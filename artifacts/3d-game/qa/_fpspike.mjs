// WHAT IS IN THE SPIKE. A CPU profile carries its own timeline (startTime +
// timeDeltas), so a long frame can be found INSIDE the profile without aligning
// two clocks — walk the samples, find every contiguous run of non-idle samples
// longer than a threshold, and histogram what was on the stack during those
// runs only. Steady-state cost and hitch cost are different questions and a
// flat top-of-profile answers neither.
//   node qa/_fpspike.mjs [world] [port] [t0] [t1] [thresholdMs]
import { chromium } from 'playwright';
const WID = process.argv[2] || 'lantern';
const PORT = process.argv[3] || '4232';
const T0 = +(process.argv[4] || 55), T1 = +(process.argv[5] || 100);
const THR = +(process.argv[6] || 55);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
p.setDefaultTimeout(900000);
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WID}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 600000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1400);
await p.click(`#worldRow .wCard[data-world="${WID}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.3, null, { timeout: 900000 });
await p.evaluate(() => {
  window.__pinQuality(0); window.__renderer.render = () => {};
  const cv = document.querySelector('canvas');
  const cx = innerWidth / 2, cy = innerHeight / 2;
  cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
  const tick = () => { const vs = window.__voidState(); let bx = 0, bz = 0, bd = 1e9, ok = false;
    const E = window.__edibles;
    for (let i = 0; i < E.length; i++) { const e = E[i];
      if (e.eaten || !e.mesh || !e.mesh.visible || e.radius > vs.r * 0.92) continue;
      const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
      const d = dx * dx + dz * dz; if (d < bd) { bd = d; bx = dx; bz = dz; ok = true; } }
    if (ok) { const m = Math.hypot(bx, bz) || 1;
      dispatchEvent(new PointerEvent('pointermove', { pointerId: 1,
        clientX: cx + bx / m * 110, clientY: cy + bz / m * 110, bubbles: true })); }
    requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
});
await p.waitForFunction(t => window.__matchState().t > t, T0, { timeout: 900000 });
const cdp = await p.context().newCDPSession(p);
await cdp.send('Profiler.enable');
await cdp.send('Profiler.setSamplingInterval', { interval: 120 });
await cdp.send('Profiler.start');
await p.waitForFunction(t => window.__matchState().t > t, T1, { timeout: 900000 });
const { profile } = await cdp.send('Profiler.stop');

const byId = new Map(profile.nodes.map(n => [n.id, n]));
const parent = new Map();
for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
const nameOf = (id) => { const n = byId.get(id); if (!n) return '?';
  const cf = n.callFrame; return `${cf.functionName || '(anon)'}:${cf.lineNumber + 1}`; };
const isIdle = (id) => { const n = byId.get(id);
  const f = n?.callFrame?.functionName; return f === '(idle)' || f === '(program)'; };
const stackOf = (id) => { const s = []; let c = id, guard = 0;
  while (c != null && guard++ < 60) { s.push(nameOf(c)); c = parent.get(c); } return s; };

const S = profile.samples, D = profile.timeDeltas;
const runs = [];
let cur = null;
for (let i = 0; i < S.length; i++) {
  const dt = (D[i] || 0) / 1000;   // ms
  if (isIdle(S[i])) { if (cur && cur.ms >= THR) runs.push(cur); cur = null; continue; }
  if (!cur) cur = { ms: 0, ids: [] };
  cur.ms += dt; cur.ids.push(S[i]);
}
if (cur && cur.ms >= THR) runs.push(cur);
runs.sort((a, x) => x.ms - a.ms);
console.log(`\n═══ ${WID.toUpperCase()}  match t ${T0}→${T1}s   ${runs.length} uninterrupted busy runs over ${THR}ms`);
console.log(`  lengths: ${runs.slice(0, 25).map(r => r.ms.toFixed(0)).join(', ')} ms`);

// aggregate the top of stack + the whole stack across ALL the long runs
const self = new Map(), incl = new Map();
let tot = 0;
for (const r of runs) for (const id of r.ids) {
  tot++;
  self.set(nameOf(id), (self.get(nameOf(id)) || 0) + 1);
  const seen = new Set();
  for (const f of stackOf(id)) if (!seen.has(f)) { seen.add(f); incl.set(f, (incl.get(f) || 0) + 1); }
}
console.log(`\n  SELF time inside the long frames (${tot} samples @120us):`);
for (const [k, v] of [...self].sort((a, x) => x[1] - a[1]).slice(0, 16))
  console.log(`    ${(100 * v / tot).toFixed(1).padStart(5)}%  ${k}`);
console.log(`\n  ON THE STACK during the long frames (total, i.e. who called it):`);
for (const [k, v] of [...incl].sort((a, x) => x[1] - a[1]).slice(0, 24))
  console.log(`    ${(100 * v / tot).toFixed(1).padStart(5)}%  ${k}`);

// and the single longest run, in stack order
if (runs[0]) {
  console.log(`\n  THE LONGEST RUN (${runs[0].ms.toFixed(0)}ms) — deepest stack seen:`);
  let best = null;
  for (const id of runs[0].ids) { const s = stackOf(id); if (!best || s.length > best.length) best = s; }
  console.log('    ' + best.reverse().join('\n      ↳ '));
  const h = new Map();
  for (const id of runs[0].ids) h.set(nameOf(id), (h.get(nameOf(id)) || 0) + 1);
  console.log(`  its self-time histogram:`);
  for (const [k, v] of [...h].sort((a, x) => x[1] - a[1]).slice(0, 10))
    console.log(`    ${(100 * v / runs[0].ids.length).toFixed(1).padStart(5)}%  ${k}`);
}
await p.close(); await b.close();

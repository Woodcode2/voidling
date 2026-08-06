// REFUTE pass, part 2 — the 57.3% claim.
// qa/_alloc.mjs calls HeapProfiler.startSampling with NO flags. In CDP the two
// flags includeObjectsCollectedByMajorGC / includeObjectsCollectedByMinorGC
// both default to FALSE, so the profile it prints is a census of what SURVIVED,
// not of what was allocated. Anything the game retains looks enormous in it and
// anything it churns and drops — the actual 40-67 MB/match-second — is invisible.
// This runs two sampling windows back to back inside ONE match and prints both.
import { chromium } from 'playwright';
const PORT = process.env.PORT || 4179;
const WID = process.argv[2] || 'maple';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WID}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1400);
await p.click(`#worldRow .wCard[data-world="${WID}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 6, null, { timeout: 600000 });
await p.evaluate(() => { window.__renderer.render = () => {};
  const cv = document.querySelector('canvas'); const cx = innerWidth / 2, cy = innerHeight / 2;
  cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
  const tick = () => { const vs = window.__voidState(); let best = null, bd = 1e9;
    for (const e of window.__edibles) { if (e.eaten || !e.mesh?.visible || e.mesh.userData.eaten || e.radius > vs.r * 0.92) continue;
      const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z; const d = dx * dx + dz * dz;
      if (d < bd) { bd = d; best = { dx, dz }; } }
    if (best) { const m = Math.hypot(best.dx, best.dz) || 1;
      dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: cx + best.dx / m * 110, clientY: cy + best.dz / m * 110, bubbles: true })); }
    requestAnimationFrame(tick); };
  requestAnimationFrame(tick); });

const cdp = await p.context().newCDPSession(p);
await cdp.send('HeapProfiler.enable');

const gateClones = () => p.evaluate(() => { const s = new Set();
  window.__scene.traverse(o => { if (o.userData && o.userData.gateMat) s.add(o.userData.gateMat.uuid); });
  return s.size; });

const fold = (profile) => {
  const self = new Map(); const stacks = new Map(); let total = 0;
  const walk = (n, path) => {
    const cf = n.callFrame;
    const name = `${cf.functionName || '(anon)'} ${(cf.url || '').split('/').pop()}:${cf.lineNumber + 1}`;
    const size = n.selfSize ?? 0;
    if (size) { self.set(name, (self.get(name) || 0) + size); total += size;
      stacks.set(path.slice(-4).concat(name).join(' < '), (stacks.get(path.slice(-4).concat(name).join(' < ')) || 0) + size); }
    for (const c of n.children || []) walk(c, path.concat(name));
  };
  walk(profile.head, []);
  return { self, stacks, total };
};
const report = (label, r, secs, clones) => {
  console.log(`\n===== ${label} — ${(r.total / 1048576).toFixed(2)} MB sampled over ${secs.toFixed(1)} match-seconds `
    + `= ${(r.total / 1048576 / secs).toFixed(2)} MB/match-second; ${clones} gate clones made in the window =====`);
  for (const [k, v] of [...r.self.entries()].sort((a, x) => x[1] - a[1]).slice(0, 12))
    console.log(`  ${String((100 * v / r.total).toFixed(1)).padStart(5)}%  ${(v / 1024).toFixed(0).padStart(9)} KB  ${k}`);
  console.log(`  -- top stacks --`);
  for (const [k, v] of [...r.stacks.entries()].sort((a, x) => x[1] - a[1]).slice(0, 6))
    console.log(`  ${String((100 * v / r.total).toFixed(1)).padStart(5)}%  ${k}`);
};

// WINDOW A — exactly what qa/_alloc.mjs does: no flags.
let t0 = await p.evaluate(() => window.__matchState().t); let c0 = await gateClones();
await cdp.send('HeapProfiler.startSampling', { samplingInterval: 4096 });
await p.waitForFunction((T) => window.__matchState().t > T, t0 + 25, { timeout: 1200000 });
let A = await cdp.send('HeapProfiler.stopSampling');
let t1 = await p.evaluate(() => window.__matchState().t); let c1 = await gateClones();
report('A — DEFAULT FLAGS (what _alloc.mjs measured): SURVIVING bytes only', fold(A.profile), t1 - t0, c1 - c0);

// WINDOW B — same window length, but counting the garbage too.
await cdp.send('HeapProfiler.startSampling', { samplingInterval: 4096,
  includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
await p.waitForFunction((T) => window.__matchState().t > T, t1 + 25, { timeout: 1200000 });
let B = await cdp.send('HeapProfiler.stopSampling');
let t2 = await p.evaluate(() => window.__matchState().t); let c2 = await gateClones();
report('B — INCLUDING COLLECTED OBJECTS: ALL bytes allocated', fold(B.profile), t2 - t1, c2 - c1);
await b.close();

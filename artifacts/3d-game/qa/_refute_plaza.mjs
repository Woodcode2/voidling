// REFUTE-PLAZA: is Lantern's bathhouse terrace an empty flat fill by design,
// or was it empty in gw/lantern-mid.png because the player ATE it?
//
// Shoots the SAME district at the SAME void radius at t~5 (props intact) and
// reports the edible census of the bathhouse district over the match.
import { chromium } from 'playwright';
import fs from 'node:fs';
const PORT = process.argv[2] || '4177';
fs.mkdirSync('qa-out/refute', { recursive: true });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
p.setDefaultTimeout(400000);
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=lantern`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1400);
await p.click(`#worldRow .wCard[data-world="lantern"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });

// ── 1. FIND THE BATHHOUSE in 3D coords, and census it at t~5.
const census = await p.evaluate(() => {
  const byB = {};
  let emissive = 0, emissiveBath = 0;
  const bathXZ = [];
  for (const e of window.__edibles) {
    const m = e.mesh; if (!m) continue;
    const bi = window.__biomeAt(m.position.x, m.position.z) || '?';
    byB[bi] = (byB[bi] || 0) + 1;
    if (bi === 'bathhouse') bathXZ.push([m.position.x, m.position.z]);
    let em = false;
    m.traverse?.(o => { const mt = o.material; if (!mt) return;
      for (const q of (Array.isArray(mt) ? mt : [mt])) {
        if (q.emissive && (q.emissive.r + q.emissive.g + q.emissive.b) > 0.06) em = true;
        if (q.emissiveIntensity > 0 && q.emissive && q.emissive.getHex?.() > 0) em = true;
      } });
    if (em) { emissive++; if (bi === 'bathhouse') emissiveBath++; }
  }
  let cx = 0, cz = 0; for (const [x, z] of bathXZ) { cx += x; cz += z; }
  cx /= bathXZ.length || 1; cz /= bathXZ.length || 1;
  return { byB, total: window.__edibles.length, emissive, emissiveBath,
    bathN: bathXZ.length, bathCentre: [+cx.toFixed(1), +cz.toFixed(1)] };
});
console.log('\n── EDIBLE CENSUS at t~5 ──');
console.log('  total edibles', census.total, ' emissive', census.emissive, ' emissive in bathhouse', census.emissiveBath);
console.log('  bathhouse edibles', census.bathN, ' centre', census.bathCentre);
console.log('  by district:', JSON.stringify(census.byB));

// ── 2. SHOOT the terrace at DEVOURER size with the props still standing.
await p.evaluate(([x, z]) => { window.__setVoidR(6); window.__warpVoid(x, z); }, census.bathCentre);
await p.waitForTimeout(2200);
await p.screenshot({ path: 'qa-out/refute/bath-intact.png' });
const after = await p.evaluate(() => {
  const vs = window.__voidState();
  let alive = 0, inView = 0, emis = 0;
  const cam = window.__cam;
  for (const e of window.__edibles) {
    if (e.eaten || !e.mesh?.visible) continue;
    alive++;
    const b = window.__biomeAt(e.mesh.position.x, e.mesh.position.z);
    if (b === 'bathhouse') inView++;
  }
  return { r: +vs.r.toFixed(2), x: +vs.x.toFixed(1), z: +vs.z.toFixed(1), alive, bathAlive: inView,
    t: +window.__matchState().t.toFixed(1) };
});
console.log('  after warp:', JSON.stringify(after));
console.log('  wrote qa-out/refute/bath-intact.png');

// ── 3. what does the LIGHTING actually put on that ground? sample the scene
const lights = await p.evaluate(() => {
  const out = [];
  window.__scene.traverse(o => { if (o.isLight) out.push({ t: o.type, i: +o.intensity.toFixed(2),
    c: '#' + o.color.getHexString() }); });
  return out;
});
console.log('  lights:', JSON.stringify(lights));
await b.close();

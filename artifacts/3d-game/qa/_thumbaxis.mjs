// _thumbaxis.mjs — WHERE DOES THE STICK ACTUALLY POINT?
// Presses the joystick in 8 known screen bearings, one at a time, and measures
// the world direction the void ends up travelling. Then asks the question that
// matters for the kit: given a target at world bearing W, the direction
// pace.mjs commands is (W.dx, W.dz) straight into clientX/clientY — how far off
// is that from the screen bearing that actually drives the void toward W?
// No algebra, no camera maths on trust: the void's own displacement is the ruler.
//
// usage: node qa/_thumbaxis.mjs <world> <port>
import { chromium } from 'playwright';
const WORLD = process.argv[2] || 'maple';
const PORT  = process.argv[3] || '4231';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
p.setDefaultTimeout(600000);
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 600000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1200);
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 1.0, null, { timeout: 600000 });
await p.evaluate(() => { window.__pinQuality(0); window.__renderer.render = () => {}; });

const res = await p.evaluate(async () => {
  const cv = document.querySelector('canvas');
  const cx = innerWidth / 2, cy = innerHeight / 2;
  const T = () => window.__matchState().t;
  const waitT = (s) => new Promise(r => { const t0 = T();
    const f = () => (T() - t0 >= s ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
  const out = [];
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4, sx = Math.cos(a), sy = Math.sin(a);
    // park in open ground so the coast wall cannot bend the answer
    window.__warpVoid(0, 0);
    dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
    await waitT(0.6);                                   // let velocity bleed off
    cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
    // hold a CONSTANT bearing (no chatter) well inside the re-anchor threshold
    let stop = false;
    const hold = () => { if (stop) return;
      dispatchEvent(new PointerEvent('pointermove', { pointerId: 1,
        clientX: cx + sx * 100, clientY: cy + sy * 100, bubbles: true }));
      requestAnimationFrame(hold); };
    hold();
    await waitT(0.8);                                   // reach steady state
    const p0 = window.__voidState(); await waitT(1.2);
    const p1 = window.__voidState();
    stop = true;
    const dx = p1.x - p0.x, dz = p1.z - p0.z;
    out.push({ screenDeg: Math.round(a * 180 / Math.PI),
      worldDx: +dx.toFixed(2), worldDz: +dz.toFixed(2),
      worldDeg: +(Math.atan2(dz, dx) * 180 / Math.PI).toFixed(1),
      moved: +Math.hypot(dx, dz).toFixed(2) });
  }
  dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
  return out;
});

console.log(`WORLD=${WORLD}  screen bearing -> world bearing the void actually takes`);
const norm = d => ((d + 540) % 360) - 180;
const offs = [];
for (const r of res) {
  const off = norm(r.worldDeg - r.screenDeg);
  offs.push(off);
  console.log(`  push ${String(r.screenDeg).padStart(3)}deg  ->  world ${String(r.worldDeg).padStart(6)}deg`
    + `  (offset ${off > 0 ? '+' : ''}${off.toFixed(1)}deg)  moved ${r.moved}u`);
}
const mean = offs.reduce((a, v) => a + v, 0) / offs.length;
console.log(`\n  mean screen->world rotation: ${mean.toFixed(1)} deg  `
  + `(spread ${Math.min(...offs).toFixed(1)}..${Math.max(...offs).toFixed(1)})`);
console.log(`  => a probe that writes a WORLD delta straight into clientX/clientY`);
console.log(`     (qa/pace.mjs:72-73) commands a bearing ${Math.abs(mean).toFixed(1)} deg`);
console.log(`     away from the target it thinks it is chasing.`);
await b.close();

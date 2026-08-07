// _thumbpalm.mjs — THE OTHER FINGER.
// prototype3d.ts:1141 hard-returns pointerdown while joy.active, and :1148/:1150
// only honour moves and ups carrying joy.id. That is the right call for a palm
// landing DURING a drive. It is the wrong call for the order children actually
// touch a phone: heel of the hand or second thumb settles on the glass FIRST,
// then the steering thumb arrives. Whichever contact lands first owns the
// joystick for as long as it stays down — even if it never moves a pixel.
// Measured here as the void's speed, not as an opinion about pointer ids.
//
// usage: node qa/_thumbpalm.mjs <world> <port>
import { chromium } from 'playwright';
const WORLD = process.argv[2] || 'maple';
const PORT  = process.argv[3] || '4231';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
p.setDefaultTimeout(900000);
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 900000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1200);
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 2.0, null, { timeout: 900000 });
await p.evaluate(() => { window.__pinQuality(0); window.__renderer.render = () => {}; });

const r = await p.evaluate(async () => {
  const cv = document.querySelector('canvas');
  const joyEl = document.getElementById('joy');
  const W = innerWidth, H = innerHeight;
  const T = () => window.__matchState().t;
  const raf = () => new Promise(res => requestAnimationFrame(res));
  const dn = (id, x, y) => cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: id, clientX: x, clientY: y, bubbles: true, isPrimary: id === 1 }));
  const mv = (id, x, y) => dispatchEvent(new PointerEvent('pointermove', { pointerId: id, clientX: x, clientY: y, bubbles: true }));
  const up = (id, x, y) => dispatchEvent(new PointerEvent('pointerup', { pointerId: id, clientX: x, clientY: y, bubbles: true }));
  const V = () => window.__voidState();
  const clear = async () => { for (const id of [1, 2, 3]) up(id, 0, 0); await raf(); await raf(); };

  // steady-state speed of a clean drag, for reference
  const drive = async (steerId, other) => {
    window.__setVoidR(6); await clear();
    { const t0 = T(); while (T() - t0 < 0.5) await raf(); }
    if (other) dn(other.id, other.x, other.y);          // the accidental contact lands FIRST
    await raf();
    dn(steerId, W * 0.70, H * 0.80);
    { const t0 = T(); while (T() - t0 < 1.6) {
        mv(steerId, W * 0.70 + 100, H * 0.80);
        if (other) mv(other.id, other.x, other.y);       // a resting palm does not move
        await raf(); } }
    const s0 = V(), q0 = T();
    { const t0 = T(); while (T() - t0 < 0.8) {
        mv(steerId, W * 0.70 + 100, H * 0.80);
        if (other) mv(other.id, other.x, other.y);
        await raf(); } }
    const s1 = V();
    const spd = Math.hypot(s1.x - s0.x, s1.z - s0.z) / (T() - q0);
    const ring = joyEl.style.display === 'block'
      ? { x: Math.round(parseFloat(joyEl.style.left)), y: Math.round(parseFloat(joyEl.style.top)) } : null;
    await clear();
    return { spd: +spd.toFixed(1), ring };
  };

  const clean = await drive(1, null);
  // palm / second thumb resting low-left, the way a phone is actually held
  const palmLeft = await drive(2, { id: 1, x: W * 0.12, y: H * 0.88 });
  // second thumb resting close to the steering thumb
  const palmNear = await drive(2, { id: 1, x: W * 0.62, y: H * 0.86 });
  // the order that IS handled: steer first, palm lands during the drive
  window.__setVoidR(6); await clear();
  dn(1, W * 0.70, H * 0.80);
  { const t0 = T(); while (T() - t0 < 1.6) { mv(1, W * 0.70 + 100, H * 0.80); await raf(); } }
  dn(2, W * 0.12, H * 0.88);
  { const t0 = T(); while (T() - t0 < 0.4) { mv(1, W * 0.70 + 100, H * 0.80); await raf(); } }
  const d0 = V(), t0b = T();
  { const t0 = T(); while (T() - t0 < 0.8) { mv(1, W * 0.70 + 100, H * 0.80); await raf(); } }
  const d1 = V();
  const palmDuring = +(Math.hypot(d1.x - d0.x, d1.z - d0.z) / (T() - t0b)).toFixed(1);

  // and the handover: lift the OWNING finger while the other stays down
  up(1, W * 0.70 + 100, H * 0.80);
  { const t0 = T(); while (T() - t0 < 0.3) { mv(2, W * 0.12, H * 0.88); await raf(); } }
  const handoverRing = joyEl.style.display === 'block';
  // the still-planted finger now drags — does it steer?
  const e0 = V(), q0 = T();
  { const t0 = T(); while (T() - t0 < 1.2) { mv(2, W * 0.12 + 100, H * 0.88); await raf(); } }
  const e1 = V();
  const handoverSpd = +(Math.hypot(e1.x - e0.x, e1.z - e0.z) / (T() - q0)).toFixed(1);
  await clear();

  return { clean, palmLeft, palmNear, palmDuring, handoverRing, handoverSpd };
});

console.log(`WORLD=${WORLD}  who owns the joystick`);
console.log(`  clean single-finger drag                       : ${r.clean.spd} u/s   ring at ${JSON.stringify(r.clean.ring)}`);
console.log(`  resting contact low-LEFT lands first, then steer: ${r.palmLeft.spd} u/s   ring at ${JSON.stringify(r.palmLeft.ring)}`);
console.log(`  resting contact NEAR the thumb lands first     : ${r.palmNear.spd} u/s   ring at ${JSON.stringify(r.palmNear.ring)}`);
console.log(`  palm lands DURING an established drive         : ${r.palmDuring} u/s  (should equal clean)`);
console.log(`  lift the owning finger, second finger still down:`);
console.log(`     ring drawn: ${r.handoverRing}    speed while that finger drags 100px: ${r.handoverSpd} u/s`);
await b.close();

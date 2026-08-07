// _thumbstuck.mjs — WHAT HAPPENS IF ONE pointerup GOES MISSING.
// joy.active is cleared in exactly one place, joyEnd (prototype3d.ts:1149-1153),
// and only for a pointerup/pointercancel carrying the SAME pointerId that
// opened it. There is no timeout, no blur guard, no visibilitychange guard
// (the visibilitychange handler at :3255 pauses the match but never touches the
// joystick), and pointerdown hard-returns while joy.active (:1141).
// So: drop one up event and the control scheme is gone for the rest of the match.
// This probe drops one and measures the consequence.
//
// usage: node qa/_thumbstuck.mjs <world> <port>
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
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 2.0, null, { timeout: 600000 });
await p.evaluate(() => { window.__pinQuality(0); window.__renderer.render = () => {}; });

const r = await p.evaluate(async () => {
  const cv = document.querySelector('canvas');
  const joyEl = document.getElementById('joy');
  const W = innerWidth, H = innerHeight;
  const HOME = { x: W * 0.70, y: H * 0.80 };
  const T = () => window.__matchState().t;
  const raf = () => new Promise(res => requestAnimationFrame(res));
  const waitT = async (s) => { const t0 = T(); while (T() - t0 < s) await raf(); };
  const dn = (id, x, y) => cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: id, clientX: x, clientY: y, bubbles: true }));
  const mv = (id, x, y) => dispatchEvent(new PointerEvent('pointermove', { pointerId: id, clientX: x, clientY: y, bubbles: true }));
  const up = (id, x, y) => dispatchEvent(new PointerEvent('pointerup', { pointerId: id, clientX: x, clientY: y, bubbles: true }));
  const R = () => window.__voidState();

  window.__setVoidR(6);
  // 1. a normal drag, held at full deflection
  dn(7, HOME.x, HOME.y);
  { const t0 = T(); while (T() - t0 < 1.4) { mv(7, HOME.x + 100, HOME.y); await raf(); } }
  const a0 = R(); await waitT(0.6); const a1 = R();
  const spdHeld = Math.hypot(a1.x - a0.x, a1.z - a0.z) / 0.6;

  // 2. THE LOST UP. The app backgrounds / the finger slides off the glass edge /
  //    WebKit swallows it. Everything a real device would still deliver, fires —
  //    except the pointerup itself.
  window.dispatchEvent(new Event('blur'));
  document.dispatchEvent(new Event('visibilitychange'));
  await waitT(0.3);
  const joyStillShown = joyEl.style.display === 'block';

  // 3. nothing is touching the glass. Does the void stop?
  const b0 = R(); await waitT(5); const b1 = R();
  const ghostDist = Math.hypot(b1.x - b0.x, b1.z - b0.z);
  const ghostSpd = ghostDist / 5;

  // 4. the child puts a fresh finger down, repeatedly, all over the screen
  let joysticksCreated = 0; const tries = [];
  for (let i = 0; i < 12; i++) {
    const x = 40 + (i % 4) * 110, y = H * 0.55 + Math.floor(i / 4) * 130;
    joyEl.style.display = 'none';
    dn(100 + i, x, y);
    await raf();
    const made = joyEl.style.display === 'block';
    if (made) joysticksCreated++;
    tries.push({ x, y, made });
    mv(100 + i, x - 90, y - 90); await raf();
    up(100 + i, x - 90, y - 90); await raf();
  }
  // 5. after all that, is the void still driving the OLD heading?
  const c0 = R(); await waitT(3); const c1 = R();
  const stillDist = Math.hypot(c1.x - c0.x, c1.z - c0.z);

  // 6. can ANYTHING recover it? the correct id, then a stray cancel
  up(7, HOME.x + 100, HOME.y);
  await raf();
  joyEl.style.display = 'none';
  dn(200, HOME.x, HOME.y); await raf();
  const recovered = joyEl.style.display === 'block';
  up(200, HOME.x, HOME.y);

  return { spdHeld: +spdHeld.toFixed(1), joyStillShown,
    ghostDist: +ghostDist.toFixed(1), ghostSpd: +ghostSpd.toFixed(1),
    joysticksCreated, tries, stillDist: +stillDist.toFixed(1), recovered };
});

console.log(`WORLD=${WORLD}  one pointerup dropped mid-drag`);
console.log(`  speed while held at full deflection      : ${r.spdHeld} u/s`);
console.log(`  after blur + visibilitychange, ring still drawn: ${r.joyStillShown}`);
console.log(`  NOTHING touching the glass for 5 match-seconds:`);
console.log(`     void travelled ${r.ghostDist} units  (${r.ghostSpd} u/s)`);
console.log(`  12 fresh touches all over the lower screen:`);
console.log(`     joysticks created: ${r.joysticksCreated}/12`);
console.log(`  3 more match-seconds after those touches : void travelled ${r.stillDist} units`);
console.log(`  recovers only when an up with the ORIGINAL pointerId arrives: ${r.recovered}`);
await b.close();

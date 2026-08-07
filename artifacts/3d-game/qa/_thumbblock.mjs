// _thumbblock.mjs — CAN THE THUMB EVEN LAND?
// pointerdown is bound to renderer.domElement (prototype3d.ts:1140), so a touch
// that hits any element ABOVE the canvas with pointer-events enabled never
// creates a joystick at all. Sweeps a grid over the lower half of the glass,
// asks elementFromPoint what is actually there, dispatches a real pointerdown,
// and checks whether #joy appeared. A cell that fails is a place a child can
// press and get nothing.
//
// usage: node qa/_thumbblock.mjs <world> <port>
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
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3.0, null, { timeout: 600000 });
await p.evaluate(() => { window.__pinQuality(0); window.__renderer.render = () => {}; });

const out = await p.evaluate(() => {
  const W = innerWidth, H = innerHeight;
  const joyEl = document.getElementById('joy');
  const cells = [], hitters = new Map();
  const raf = () => new Promise(r => requestAnimationFrame(r));
  const cols = 9, rows = 8;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = Math.round((c + 0.5) * W / cols);
    const y = Math.round(H * 0.5 + (r + 0.5) * (H * 0.5) / rows);
    const el = document.elementFromPoint(x, y);
    const tag = el ? (el.id ? '#' + el.id : el.className ? '.' + String(el.className).split(' ')[0] : el.tagName) : 'null';
    // a REAL touch: dispatch on whatever is actually under the finger
    dispatchEvent(new PointerEvent('pointerup', { pointerId: 9, clientX: x, clientY: y, bubbles: true }));
    joyEl.style.display = 'none';
    (el || document.body).dispatchEvent(new PointerEvent('pointerdown',
      { pointerId: 9, clientX: x, clientY: y, bubbles: true, composed: true }));
    const steered = joyEl.style.display === 'block';
    dispatchEvent(new PointerEvent('pointerup', { pointerId: 9, clientX: x, clientY: y, bubbles: true }));
    cells.push({ x, y, tag, steered });
    if (!steered) hitters.set(tag, (hitters.get(tag) || 0) + 1);
  }
  // every element currently sitting above the canvas that would swallow a touch
  const blockers = [];
  for (const e of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(e);
    if (cs.pointerEvents === 'none' || cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = e.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    if (r.bottom < H * 0.5) continue;                       // lower half only
    if (e.tagName === 'CANVAS' || e.tagName === 'HTML' || e.tagName === 'BODY') continue;
    if (r.width >= W && r.height >= H) continue;            // full-screen shells
    blockers.push({ id: e.id || ('.' + String(e.className).split(' ')[0]), tag: e.tagName,
      x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height),
      z: cs.zIndex });
  }
  return { W, H, cells, blockers, dead: cells.filter(c => !c.steered),
    hitters: [...hitters.entries()] };
});

console.log(`WORLD=${WORLD}  ${out.W}x${out.H}  lower-half touch grid ${out.cells.length} cells`);
console.log(`  cells that did NOT create a joystick: ${out.dead.length}/${out.cells.length}`);
if (out.dead.length) {
  console.log('  what swallowed them: ' + JSON.stringify(out.hitters));
  console.log('  cells: ' + out.dead.map(c => `(${c.x},${c.y})->${c.tag}`).join(' '));
}
console.log(`  interactive elements sitting over the lower half during a match:`);
if (!out.blockers.length) console.log('    (none)');
for (const bl of out.blockers) console.log(`    ${bl.id} ${bl.tag} ${bl.w}x${bl.h} at (${bl.x},${bl.y}) z=${bl.z}`);
await b.close();

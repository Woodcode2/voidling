// DOES THE COSTUME FLOAT OFF THE VOID?
//
// Every accessory hangs off a group called `dress`, and that group gets a
// caricature LOD so a crown 0.38 units tall is not 3 device pixels at match
// start: void3d.ts, `dress.scale.setScalar(1 + small * 0.42)`.
//
// But scaling a GROUP scales the positions of its children as well as their
// size. An accessory seated at y = 0.95 on a unit body goes to y = 1.35 at
// full LOD — it does not just get bigger, it lifts off the head. This reads
// the live scene graph rather than guessing: for each accessory, the lowest
// point of its geometry in body-radius units, at full LOD and at none.
//
// A seat of 1.00 means the part is touching a unit-radius body. Below 1.00 it
// is buried; above ~1.05 there is daylight under a hat.
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4177';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch { } });
await p.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1000);
await p.click('#worldRow .wCard[data-world="maple"]');
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 4, null, { timeout: 600000 });
await p.evaluate(() => { window.__renderer.render = () => {}; });

const read = (r) => p.evaluate(async (radius) => {
  const THREE = window.__THREE;
  window.__setVoidR(radius);
  for (let i = 0; i < 40; i++) await new Promise((res) => requestAnimationFrame(res));
  let dress = null, bob = null;
  window.__scene.traverse((o) => { if (o.name === 'dress') { dress = o; bob = o.parent; } });
  if (!dress || !bob) return { err: 'no dress group' };
  // MEASURE IN BOB-LOCAL SPACE, where the body is a unit sphere. Box3's
  // expandByObject/setFromObject return WORLD coordinates — the first version
  // of this probe used them and then multiplied by dress.scale on top, so the
  // numbers were neither world nor local and the unicorn came out seated at
  // 2.04 "body radii", which is not a plausible anything. Composing each
  // geometry's own bounding box with (inverse bob world) * (mesh world) gives
  // a figure that means what the header says it means.
  const inv = new THREE.Matrix4().copy(bob.matrixWorld).invert();
  const out = {};
  for (const child of dress.children) {
    if (!child.visible) continue;
    const box = new THREE.Box3();
    child.updateWorldMatrix(true, true);
    child.traverse((o) => {
      if (!o.geometry) return;
      o.geometry.computeBoundingBox();
      const bb = o.geometry.boundingBox.clone();
      bb.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
      box.union(bb);
    });
    if (!isFinite(box.min.y)) continue;
    out[child.name || '(unnamed)'] = {
      lowest: +box.min.y.toFixed(3), top: +box.max.y.toFixed(3),
    };
  }
  return { dressScale: +dress.scale.y.toFixed(3), parts: out };
}, r);

console.log('Each legendary accessory, lowest point in body radii.');
console.log('1.00 = touching a unit body.  >1.05 = daylight under the hat.\n');
const ACCS = ['unicorn', 'dino', 'wizard', 'king', 'dragon', 'mecha', 'ninja'];
for (const a of ACCS) {
  await p.evaluate((acc) => window.__setSkin({
    abyss: 0x1c0930, inner: 0x7030c0, mid: 0xa562f2, rim: 0xc9a6ff, glow: 0xb875ff, acc,
  }), a);
  const small = await read(1.0);    // match start: LOD at full strength
  const big = await read(9.0);      // late game: LOD off
  const names = Object.keys(small.parts || {});
  const nm = names.find((n) => n === a) || names[0] || '(none)';
  const s = small.parts?.[nm], g = big.parts?.[nm];
  if (!s || !g) { console.log(`${a.padEnd(9)} (no visible part found)`); continue; }
  const lift = s.lowest - g.lowest;
  console.log(`${a.padEnd(9)} LOD ${small.dressScale.toFixed(2)}x -> lowest ${s.lowest.toFixed(3)}`
    + `   |  LOD ${big.dressScale.toFixed(2)}x -> lowest ${g.lowest.toFixed(3)}`
    + `   |  lift ${lift >= 0 ? '+' : ''}${lift.toFixed(3)} body radii`
    + (lift > 0.08 ? '   <-- FLOATS' : ''));
}
await b.close();

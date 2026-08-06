// THE GULP. When the player eats a family member the sibling spirals INTO the
// player's pit (rivals.ts:781-795: its x/z converge on the player, y drops to
// r*k*0.9, scale shrinks over 0.55s). For that whole animation the sibling is
// inside the hero's opaque body — so if its face is depthTest:false, the face
// rides on top of the hero, dead centre of frame, at the loudest moment in the
// game.
//
//   node qa/_rf_gulpface.mjs [world]
//
// Forces the eat (grow the hero, warp onto the nearest joined sibling) and
// shoots the gulp twice: as shipped, and with depthTest restored.
import { chromium } from 'playwright';
import fs from 'node:fs';

const WORLD = process.argv[2] || 'maple';
fs.mkdirSync('qa-out/faceoccl', { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
} catch { /* private */ } });
await p.goto(`http://127.0.0.1:4177/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show')
  .forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
const tap = async (sel) => { await p.waitForSelector(sel, { timeout: 300000 });
  await p.evaluate((s) => document.querySelector(s).click(), sel); };
await tap('#btnPlay'); await p.waitForTimeout(2500);
await tap(`#worldRow .wCard[data-world="${WORLD}"]`);
console.log('STAGE match live');
// the software renderer runs at ~1/20 real time; wind the match clock instead
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.5, null, { timeout: 1200000 });
console.log('STAGE started');
await p.evaluate(() => window.__rushClock(140));   // t = 180-140 = 40s in
await p.waitForFunction(() => window.__matchState().rivals.some((r) => r.joined), null, { timeout: 900000 });
console.log('STAGE t>20 (rushed), family joined');
await p.addStyleTag({ content: '#news,#hud,#stageBar,.vb,.vf,#btnHome,#coins,#tick{opacity:0!important}' });

// the hero must out-size the sibling, then land on it
await p.evaluate(() => {
  const rs = window.__matchState().rivals.filter((r) => r.joined);
  const big = Math.max(...rs.map((r) => r.r));
  window.__setVoidR(Math.max(4, big * 2.2));
});
await p.waitForTimeout(1500);
const before = await p.evaluate(() => {
  const v = window.__voidState(), rs = window.__matchState().rivals.filter((r) => r.joined);
  rs.sort((a, c) => Math.hypot(a.x - v.x, a.z - v.z) - Math.hypot(c.x - v.x, c.z - v.z));
  window.__warpVoid(rs[0].x, rs[0].z);
  return { name: rs[0].name, r: rs[0].r, heroR: v.r };
});
console.log('warped onto', before.name, 'rival r', before.r.toFixed(2), 'hero r', before.heroR.toFixed(2));

// install the tools
await p.evaluate(() => {
  window.__faceMeshes = () => { const o = []; window.__scene.traverse((m) => {
    if (m.isMesh && m.material && m.material.depthTest === false) o.push(m); }); return o; };
  // a sibling is mid-gulp when its group sits within a couple of units of the
  // hero and its scale has collapsed well below its logical radius
  window.__gulping = () => {
    const THREE = window.__THREE, v = window.__voidState();
    let best = null;
    window.__scene.children.forEach((g) => {
      if (!g.isGroup || !g.visible) return;
      let isR = false; g.traverse((o) => { if (o.isMesh && o.material?.isShaderMaterial && o.geometry?.type === 'SphereGeometry') isR = true; });
      if (!isR) return;
      const d = Math.hypot(g.position.x - v.x, g.position.z - v.z);
      if (d < 3.0 && g.position.y < v.r) best = { d: +d.toFixed(2), y: +g.position.y.toFixed(2), s: +g.scale.x.toFixed(2), heroR: +v.r.toFixed(2) };
    });
    return best;
  };
});

let g = null;
for (let i = 0; i < 900 && !g; i++) { g = await p.evaluate(() => window.__gulping()); if (!g) await p.waitForTimeout(120); }
if (!g) { console.log('NO GULP OBSERVED'); await b.close(); process.exit(0); }
console.log('GULP in progress:', JSON.stringify(g));
await p.screenshot({ path: `qa-out/faceoccl/${WORLD}-gulp-A-shipped.png` });
await p.evaluate(() => { window.__faceMeshes().forEach((m) => { m.material.depthTest = true; m.material.needsUpdate = true; }); });
await p.screenshot({ path: `qa-out/faceoccl/${WORLD}-gulp-B-depthtested.png` });
console.log('shot both');
await b.close();

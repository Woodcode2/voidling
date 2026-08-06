// THE CANAL LANTERN STRINGS. Counts them, then points a free camera at one and
// shoots it side-on.
//
//   node qa/_lanstring3.mjs
//
// Written to refute "the lanterns are floating cups with no string and no
// glow". island.ts:4011-4028 hangs makeLanternString(17,5) every 300 world
// units along LN.CANAL; this counts what actually landed in the graph and
// photographs one. See also qa/_lanternprop.mjs for the glow-material census.
import { chromium } from 'playwright';
import fs from 'node:fs';
fs.mkdirSync('qa-out/lan', { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
p.setDefaultTimeout(400000);
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
await p.goto('http://127.0.0.1:4177/?w=lantern', { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily','gift'].includes(e.id)) e.classList.remove('show'); }));
await p.evaluate(() => document.querySelector('#btnPlay').click()); await p.waitForTimeout(2000);
await p.evaluate(() => document.querySelector('#worldRow .wCard[data-world="lantern"]').click());
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 900000 });

const s = await p.evaluate(() => {
  const THREE = window.__THREE;
  for (const o of window.__scene.children) {
    if (!o.isGroup || o.children.length !== 2) continue;
    const glow = o.children.find(c => c.isMesh && c.material?.type === 'MeshBasicMaterial' && c.material.vertexColors);
    const sol = o.children.find(c => c.isMesh && c !== glow);
    if (!glow || !sol) continue;
    sol.geometry.computeBoundingBox(); const sb = sol.geometry.boundingBox;
    const sx = sb.max.x - sb.min.x;
    if (sx > 16.5 && sx < 17.5 && sb.min.y > 1.8 && sb.min.y < 2.2 && sb.max.y < 5) {
      const wp = new THREE.Vector3(); o.getWorldPosition(wp);
      window.__TARGET = { x: wp.x, y: 3.5, z: wp.z, ry: o.rotation.y };
      return { x: +wp.x.toFixed(1), z: +wp.z.toFixed(1), ry: +o.rotation.y.toFixed(2) };
    }
  }
  return null;
});
const n = await p.evaluate(() => {
  let k = 0;
  for (const o of window.__scene.children) {
    if (!o.isGroup || o.children.length !== 2) continue;
    const glow = o.children.find(c => c.isMesh && c.material?.type === 'MeshBasicMaterial' && c.material.vertexColors);
    const sol = o.children.find(c => c.isMesh && c !== glow);
    if (!glow || !sol) continue;
    sol.geometry.computeBoundingBox(); const sb = sol.geometry.boundingBox;
    const sx = sb.max.x - sb.min.x;
    if (sx > 16.5 && sx < 17.5 && sb.min.y > 1.8 && sb.min.y < 2.2 && sb.max.y < 5) k++;
  }
  return k;
});
console.log('canal lantern strings in the graph:', n);
console.log('target', JSON.stringify(s));
await p.evaluate(() => {
  const THREE = window.__THREE, T = window.__TARGET;
  const cam = new THREE.PerspectiveCamera(38, innerWidth/innerHeight, 0.5, 4000);
  // stand off along the string's own axis-normal so the whole span is side-on
  const nx = Math.cos(T.ry), nz = -Math.sin(T.ry);
  cam.position.set(T.x + nx*26, 8.5, T.z + nz*26);
  cam.lookAt(T.x, 3.4, T.z);
  const RR = window.__renderer.render.bind(window.__renderer);
  window.__renderer.render = (sc) => RR(sc, cam);
});
await p.addStyleTag({ content: '#news,#hud,#stageBar,.vb,.vf,#btnHome,#coins{opacity:0!important}' });
await p.waitForTimeout(3000);
await p.screenshot({ path: 'qa-out/lan/string-sideon.png' });
console.log('wrote qa-out/lan/string-sideon.png');
await b.close();

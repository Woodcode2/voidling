// PHOTOGRAPH THE ARTEFACT, USING REAL SCENERY — NO SYNTHETIC WALL.
//
//   node qa/_rf_faceshot.mjs [world]
//
// Polls a live match until a rival face mesh is (a) on screen, (b) bigger than
// a few pixels and (c) has real opaque geometry between it and the lens. Then
// shoots the same frame twice: as shipped (depthTest:false) and with depthTest
// restored on every face mesh. Any difference between the two images is a face
// pixel that was painted through something solid.
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
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 12, null, { timeout: 2400000 });

await p.addInitScript(() => {});
await p.evaluate(() => {
  const THREE = window.__THREE;
  window.__faceMeshes = () => {
    const out = [];
    window.__scene.traverse((o) => { if (o.isMesh && o.material && o.material.depthTest === false) out.push(o); });
    return out;
  };
  window.__occl = () => {
    const cam = window.__cam, scene = window.__scene, rc = new THREE.Raycaster();
    const groups = new Map();
    scene.traverse((o) => {
      if (!o.isMesh || !o.material || o.material.depthTest !== false) return;
      let g = o; while (g.parent && g.parent !== scene) g = g.parent;
      if (!g.visible) return;
      if (!groups.has(g)) groups.set(g, []); groups.get(g).push(o);
    });
    const out = []; const camPos = cam.position.clone();
    for (const [grp, meshes] of groups) {
      let isRival = false;
      grp.traverse((o) => { if (o.isMesh && o.material?.isShaderMaterial && o.geometry?.type === 'SphereGeometry') isRival = true; });
      if (!isRival) continue;
      for (const m of meshes) {
        const wp = new THREE.Vector3(); m.getWorldPosition(wp);
        const dir = wp.clone().sub(camPos); const dist = dir.length(); dir.normalize();
        rc.set(camPos, dir); rc.near = 0.01; rc.far = dist - 0.02;
        let hits = []; try { hits = rc.intersectObjects(scene.children, true); } catch { continue; }
        let occ = null;
        for (const h of hits) {
          const ob = h.object; if (!ob.isMesh) continue;
          let a = ob, own = false; while (a) { if (a === grp) { own = true; break; } a = a.parent; }
          if (own) continue;
          const mats = Array.isArray(ob.material) ? ob.material : [ob.material];
          if (!mats.some((x) => x && x.depthWrite !== false && x.depthTest !== false && !x.transparent)) continue;
          if (h.distance >= dist - 0.05) continue;
          occ = h; break;
        }
        if (!occ) continue;
        const r = m.geometry?.parameters?.radius ?? 0.1;
        const sc = new THREE.Vector3(); m.getWorldScale(sc);
        const wr = r * Math.max(sc.x, sc.y);
        const a = wp.clone().project(cam);
        const edge = wp.clone().add(new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0).multiplyScalar(wr)).project(cam);
        const px = Math.abs(edge.x - a.x) * 0.5 * 430;
        if (!(Math.abs(a.x) < 0.95 && Math.abs(a.y) < 0.95 && a.z < 1)) continue;
        out.push({ geo: m.geometry.type, occ: occ.object.name || occ.object.geometry?.type || '?',
          pxr: +px.toFixed(1), sx: Math.round((a.x * 0.5 + 0.5) * 430), sy: Math.round((-a.y * 0.5 + 0.5) * 932) });
      }
    }
    return out.sort((x, y) => y.pxr - x.pxr);
  };
});

let found = null;
for (let i = 0; i < 400 && !found; i++) {
  const o = await p.evaluate(() => window.__occl());
  if (o.length && o[0].pxr >= 2.5) found = o;
  else await p.waitForTimeout(400);
}
if (!found) { console.log('NO NATURAL OCCLUSION FOUND'); await b.close(); process.exit(0); }
console.log('occluded face meshes this frame:', JSON.stringify(found.slice(0, 12)));
const t = await p.evaluate(() => window.__matchState().t);
console.log('t =', t.toFixed(1));

// freeze the world so A and B are the same frame
await p.evaluate(() => { window.__frozen = true; const rAF = window.requestAnimationFrame; window.__rAF = rAF; });
await p.addStyleTag({ content: '#news,#hud,#stageBar,.vb,.vf,#btnHome,#coins{opacity:0!important}' });
await p.screenshot({ path: `qa-out/faceoccl/${WORLD}-A-shipped.png` });
await p.evaluate(() => { window.__faceMeshes().forEach((m) => { m.material.depthTest = true; m.material.needsUpdate = true; }); });
await p.waitForTimeout(1200);
await p.screenshot({ path: `qa-out/faceoccl/${WORLD}-B-depthtested.png` });
await p.evaluate(() => { window.__faceMeshes().forEach((m) => { m.material.depthTest = false; m.material.needsUpdate = true; }); });

// decode + diff in a blank page (no native png lib in this tree)
const dp = await b.newPage();
await dp.goto('about:blank');
const res = await dp.evaluate(async ([a, c]) => {
  const load = (s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + s; });
  const [A, B] = await Promise.all([load(a), load(c)]);
  const g = (im) => { const cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height;
    const x = cv.getContext('2d'); x.drawImage(im, 0, 0); return x.getImageData(0, 0, cv.width, cv.height); };
  const da = g(A), db = g(B);
  const cv = document.createElement('canvas'); cv.width = A.width; cv.height = A.height;
  const ctx = cv.getContext('2d'); const out = ctx.createImageData(A.width, A.height);
  let n = 0; const box = [1e9, 1e9, -1, -1];
  for (let y = 0; y < A.height; y++) for (let x = 0; x < A.width; x++) {
    const i = (y * A.width + x) * 4;
    const d = Math.abs(da.data[i] - db.data[i]) + Math.abs(da.data[i + 1] - db.data[i + 1]) + Math.abs(da.data[i + 2] - db.data[i + 2]);
    const hit = d > 40;
    if (hit) { n++; box[0] = Math.min(box[0], x); box[1] = Math.min(box[1], y); box[2] = Math.max(box[2], x); box[3] = Math.max(box[3], y); }
    out.data[i] = hit ? 255 : da.data[i] >> 2; out.data[i + 1] = hit ? 0 : da.data[i + 1] >> 2;
    out.data[i + 2] = hit ? 255 : da.data[i + 2] >> 2; out.data[i + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);
  return { n, box, png: cv.toDataURL('image/png').split(',')[1] };
}, [fs.readFileSync(`qa-out/faceoccl/${WORLD}-A-shipped.png`).toString('base64'),
    fs.readFileSync(`qa-out/faceoccl/${WORLD}-B-depthtested.png`).toString('base64')]);
fs.writeFileSync(`qa-out/faceoccl/${WORLD}-diff.png`, Buffer.from(res.png, 'base64'));
console.log(`differing device pixels: ${res.n}  bbox ${JSON.stringify(res.box)} (device px, dpr 2)`);
await b.close();

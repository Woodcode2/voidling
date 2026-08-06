// DOES A RIVAL'S depthTest:false FACE ACTUALLY PAINT THROUGH REAL SCENERY?
//
//   node qa/_rf_faceoccl.mjs [world] [samples]
//
// Not a synthetic slab. Plays a real match and, at each sample, raycasts from
// the LIVE camera to every visible rival eye/smile mesh, filtering the rival's
// own group out of the hit list. An opaque hit closer than the face point means
// that face is being drawn on top of solid scenery this frame.
//
// Also records the on-screen pixel diameter of the offending eye, so "does it
// happen" and "could a child see it" are separate numbers.
import { chromium } from 'playwright';
import fs from 'node:fs';

const WORLD = process.argv[2] || 'maple';
const SAMPLES = Number(process.argv[3] || 40);
fs.mkdirSync('qa-out/faceoccl', { recursive: true });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
p.on('console', (m) => { if (m.type() === 'error') console.log('PAGE ERR', m.text().slice(0, 200)); });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
} catch { /* private */ } });
await p.goto(`http://127.0.0.1:4177/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
console.log('STAGE boot ok');
await p.evaluate(() => document.querySelectorAll('.show')
  .forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
const tap = async (sel) => { await p.waitForSelector(sel, { timeout: 300000 });
  await p.evaluate((s) => document.querySelector(s).click(), sel); };
await tap('#btnPlay'); console.log('STAGE play tapped'); await p.waitForTimeout(2500);
await tap(`#worldRow .wCard[data-world="${WORLD}"]`); console.log('STAGE world tapped');
await p.waitForFunction(() => !!window.__matchState, null, { timeout: 600000 }); console.log('STAGE match live');
try { await p.evaluate(() => window.__pinQuality && window.__pinQuality(0)); } catch {}
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 12, null, { timeout: 2400000 });

// install the measurement inside the page
await p.evaluate(() => {
  const THREE = window.__THREE;
  window.__ff = () => {
    // every depthTest:false face mesh currently in the scene, bucketed by the
    // rival group that owns it
    const groups = new Map();
    window.__scene.traverse((o) => {
      if (!o.isMesh || !o.material || o.material.depthTest !== false) return;
      // walk up to the top-level group added to the scene
      let g = o, chain = [];
      while (g.parent && g.parent !== window.__scene) { chain.push(g); g = g.parent; }
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(o);
    });
    return { n: groups.size, meshes: [...groups.values()].reduce((a, v) => a + v.length, 0) };
  };
  window.__occl = () => {
    const cam = window.__cam, scene = window.__scene;
    const rc = new THREE.Raycaster();
    // collect face meshes by owning top-level group
    const groups = new Map();
    scene.traverse((o) => {
      if (!o.isMesh || !o.material || o.material.depthTest !== false) return;
      let g = o;
      while (g.parent && g.parent !== scene) g = g.parent;
      if (!g.visible) return;
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(o);
    });
    const out = [];
    const camPos = cam.position.clone();
    for (const [grp, meshes] of groups) {
      // is this group a rival? it must own a body sphere with a shader material
      let isRival = false;
      grp.traverse((o) => { if (o.isMesh && o.material?.isShaderMaterial && o.geometry?.type === 'SphereGeometry') isRival = true; });
      if (!isRival) continue;
      const gp = new THREE.Vector3(); grp.getWorldPosition(gp);
      const dCam = camPos.distanceTo(gp);
      for (const m of meshes) {
        const wp = new THREE.Vector3(); m.getWorldPosition(wp);
        const dir = wp.clone().sub(camPos); const dist = dir.length(); dir.normalize();
        rc.set(camPos, dir); rc.near = 0.01; rc.far = dist - 0.02;
        let hits = [];
        try { hits = rc.intersectObjects(scene.children, true); } catch (e) { continue; }
        let occ = null;
        for (const h of hits) {
          const ob = h.object;
          if (!ob.isMesh) continue;
          // skip anything belonging to this rival
          let a = ob, own = false;
          while (a) { if (a === grp) { own = true; break; } a = a.parent; }
          if (own) continue;
          const mat = ob.material;
          const mats = Array.isArray(mat) ? mat : [mat];
          // a real occluder: writes depth and is not see-through
          if (!mats.some((x) => x && x.depthWrite !== false && x.depthTest !== false && !x.transparent)) continue;
          if (h.distance >= dist - 0.05) continue;
          occ = h; break;
        }
        if (!occ) continue;
        // screen size of this face mesh, in CSS px
        const r = m.geometry?.parameters?.radius ?? 0.1;
        const sc = new THREE.Vector3(); m.getWorldScale(sc);
        const wr = r * Math.max(sc.x, sc.y);
        const a = wp.clone().project(cam);
        const edge = wp.clone().add(new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0).multiplyScalar(wr)).project(cam);
        const px = Math.abs(edge.x - a.x) * 0.5 * window.innerWidth;   // radius in CSS px
        const onScreen = Math.abs(a.x) < 1 && Math.abs(a.y) < 1 && a.z < 1;
        out.push({ rival: grp.name || 'rival', geo: m.geometry.type, gr: (m.geometry.parameters?.radius ?? 0).toFixed(3),
          dist: +dist.toFixed(1), dCam: +dCam.toFixed(1), occDist: +occ.distance.toFixed(1),
          occName: occ.object.name || occ.object.geometry?.type || '?',
          occMat: occ.object.material?.type, pxr: +px.toFixed(1), onScreen,
          sx: Math.round((a.x * 0.5 + 0.5) * 430), sy: Math.round((-a.y * 0.5 + 0.5) * 932) });
      }
    }
    return out;
  };
});
console.log('face-mesh census:', JSON.stringify(await p.evaluate(() => window.__ff())));

const rows = [];
let last = 0;
for (let i = 0; i < SAMPLES; i++) {
  await p.waitForFunction((prev) => (window.__matchState?.().t ?? 0) > prev + 3, last, { timeout: 600000 });
  const st = await p.evaluate(() => window.__matchState().t);
  last = st;
  const o = await p.evaluate(() => window.__occl());
  const on = o.filter((x) => x.onScreen);
  rows.push({ t: +st.toFixed(1), hits: o.length, onScreen: on.length,
    worst: on.sort((a, c) => c.pxr - a.pxr)[0] || null });
  if (on.length) console.log(`t=${st.toFixed(0)}  ${on.length} face meshes drawing through scenery; biggest ${on[0].pxr}px radius over ${on[0].occName} at (${on[0].sx},${on[0].sy})`);
}
fs.writeFileSync(`qa-out/faceoccl/${WORLD}.json`, JSON.stringify(rows, null, 1));
const anyFrames = rows.filter((r) => r.onScreen > 0);
console.log(`\n${WORLD}: ${anyFrames.length}/${rows.length} sampled frames had at least one on-screen rival face mesh painting through opaque scenery`);
const big = anyFrames.map((r) => r.worst.pxr);
if (big.length) {
  big.sort((a, c) => c - a);
  console.log(`  worst on-screen radii (CSS px): ${big.slice(0, 8).join(', ')}`);
  console.log(`  occluders: ${[...new Set(anyFrames.map((r) => r.worst.occName))].join(', ')}`);
}
await b.close();

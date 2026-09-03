// WHO CUTS THE PLANET? For the far frame, cast rays from the camera to each sky
// body's centre and to the bottom of its disc, and name what the rays hit
// first (object name, geometry, bounding-box size, y, material flags).
import { chromium } from 'playwright';
const WORLD = process.argv[2] || 'lantern', PORT = process.argv[3] || '4177';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try { localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1'); localStorage.setItem('voidFirstNom', '1'); localStorage.setItem('voidMute', '1'); localStorage.setItem('voidDailyLast', new Date().toDateString()); localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder'); } catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.evaluate(() => document.getElementById('btnPlay')?.click()); await p.waitForTimeout(1400);
await p.evaluate((w) => document.querySelector(`#worldRow .wCard[data-world="${w}"]`)?.click(), WORLD);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 4.0, null, { timeout: 600000 });
await p.evaluate(() => window.__setVoidR?.(8));
const t0 = await p.evaluate(() => window.__matchState().t);
await p.waitForFunction((x) => (window.__matchState?.().t ?? 0) > x, t0 + 3.5, { timeout: 600000 });
const r = await p.evaluate(() => {
  const THREE = window.__THREE, cam = window.__cam, scene = window.__scene; cam.updateMatrixWorld(true); const camPos = cam.getWorldPosition(new THREE.Vector3());   // WORLD position: camPos is local and lied (occ 1 on visible planets)
  const up = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1).normalize();
  const all = []; scene.traverse((o) => { if ((o.isMesh || o.isPoints) && !o.isSprite && o.visible) all.push(o); });
  const ray = new THREE.Raycaster(); const out = [];
  const desc = (o) => { const bb = new THREE.Box3().setFromObject(o); const s = bb.getSize(new THREE.Vector3()); const m = Array.isArray(o.material) ? o.material[0] : o.material; return `${o.type}${o.name ? ' "' + o.name + '"' : ''} geom=${o.geometry?.type} size=${s.x.toFixed(0)}x${s.y.toFixed(1)}x${s.z.toFixed(0)} y=${o.position.y.toFixed(1)} mat=${m?.type} transparent=${!!m?.transparent} opacity=${m?.opacity} depthWrite=${m?.depthWrite} depthTest=${m?.depthTest} color=${m?.color ? '#' + m.color.getHexString() : '-'} renderOrder=${o.renderOrder}`; };
  scene.traverse((sp) => { if (!(sp.isSprite && sp.userData.planet)) return;
    const C = sp.getWorldPosition(new THREE.Vector3()), s = sp.scale.x;
    for (const [label, P] of [['centre', C.clone()], ['bottom', C.clone().addScaledVector(up, -s / 2 * 0.9)], ['top', C.clone().addScaledVector(up, s / 2 * 0.9)]]) {
      const n = P.clone().project(cam); const dir = P.clone().sub(camPos); const L = dir.length(); dir.normalize();
      ray.set(camPos, dir); ray.near = 0.5; ray.far = L;
      const hits = ray.intersectObjects(all, false).slice(0, 3);
      out.push(`size ${s} ${label}: ndc(${n.x.toFixed(2)},${n.y.toFixed(2)}) dist ${L.toFixed(0)} -> ` + (hits.length ? hits.map((h) => `${h.distance.toFixed(0)}u ${desc(h.object)}`).join(' | ') : 'NOTHING (visible)'));
    }
  });
  return { camY: camPos.y.toFixed(0), far: cam.far, out };
});
console.log(`${WORLD} far frame: camY ${r.camY}, camera far ${r.far}`); for (const l of r.out) console.log('  ' + l);
await b.close();

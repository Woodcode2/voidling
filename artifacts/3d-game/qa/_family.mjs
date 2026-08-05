// THE FAMILY, MEASURED AGAINST THE HERO.
//
//   node qa/_family.mjs [world]
//
// Three questions, one boot (the software renderer costs ~4 minutes a boot):
//
//  1. UNIFORMS. rivals.ts:247 hands the family the hero's body shader. This
//     dumps what is actually written into that shader per frame for each void
//     in the scene, plus each one's on-screen radius in device pixels.
//  2. SIDE BY SIDE. Warps the hero next to the biggest rival and forces him to
//     THAT rival's radius, so the two are photographed at the same size in the
//     same light. Anything that differs in the frame is a real difference.
//  3. OCCLUSION. Drops an opaque box between the camera and a rival and shoots
//     it. The family's eyes/blush/smile are built with depthTest:false
//     (rivals.ts:280-298), so this asks whether a face paints through solid
//     scenery.
import { chromium } from 'playwright';
import fs from 'node:fs';

const WORLD = process.argv[2] || 'maple';
fs.mkdirSync('qa-out/family', { recursive: true });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
} catch { /* private mode */ } });
await p.goto(`http://127.0.0.1:4177/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show')
  .forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1400);
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);

await p.evaluate(() => {
  window.__bodies = () => {
    const THREE = window.__THREE, cam = window.__cam, out = [];
    const fov = cam.fov ?? 32, H = window.innerHeight * (window.devicePixelRatio || 1);
    window.__scene.traverse((o) => {
      const m = o.material;
      if (!o.isMesh || !m || !m.uniforms || !m.uniforms.uAbyss) return;
      const wp = new THREE.Vector3(); o.getWorldPosition(wp);
      const sc = new THREE.Vector3(); o.getWorldScale(sc);
      const camD = Math.max(1, cam.position.distanceTo(wp));
      const pxR = (H / (2 * camD * Math.tan(fov * Math.PI / 360))) * sc.x;
      out.push({ seg: o.geometry.parameters?.widthSegments ?? -1,
        x: +wp.x.toFixed(1), z: +wp.z.toFixed(1),
        r: +sc.x.toFixed(2), camD: +camD.toFixed(1), pxR: Math.round(pxR),
        uSmall: +m.uniforms.uSmall.value.toFixed(3), uStage: m.uniforms.uStage.value,
        uSlow: +m.uniforms.uSlow.value.toFixed(3),
        uStretch: +m.uniforms.uStretchAmt.value.toFixed(3),
        uWobble: +m.uniforms.uWobble.value.toFixed(3) });
    });
    return { t: window.__matchState().t, pr: window.__voidState().r, bodies: out };
  };
});

for (const target of [12, 60, 130]) {
  await p.waitForFunction((tt) => (window.__matchState?.().t ?? 0) > tt, target, { timeout: 900000 });
  const s = await p.evaluate(() => window.__bodies());
  console.log(`\n=== ${WORLD}  t=${s.t.toFixed(1)}s  playerR=${s.pr.toFixed(2)} ===`);
  for (const o of s.bodies) {
    console.log(`${o.seg >= 90 ? 'HERO ' : 'rival'} r=${String(o.r).padStart(6)} camD=${String(o.camD).padStart(6)} pxR=${String(o.pxR).padStart(5)}  uSmall=${o.uSmall} uStage=${o.uStage} uSlow=${o.uSlow} uStretch=${o.uStretch}`);
  }
}

// ── 2. SIDE BY SIDE ─────────────────────────────────────────────────────────
await p.addStyleTag({ content: '#news,#hud,#stageBar,.bub,#btnHome,#coins{opacity:0!important}' });
const pos = await p.evaluate(() => {
  const bs = window.__bodies().bodies.filter((o) => o.seg < 90);
  bs.sort((a, b2) => b2.r - a.r);
  const t = bs[0];
  // stand him one and a half diameters to the rival's west, at the rival's size
  window.__setVoidR(t.r);
  window.__warpVoid(t.x - t.r * 3.4, t.z);
  return t;
});
console.log(`\nside-by-side: biggest rival r=${pos.r} at (${pos.x},${pos.z})`);
await p.waitForTimeout(3500);
await p.screenshot({ path: `qa-out/family/${WORLD}-pair.png` });
console.log(`qa-out/family/${WORLD}-pair.png`);

// ── 3. OCCLUSION ────────────────────────────────────────────────────────────
const occ = await p.evaluate(() => {
  const THREE = window.__THREE, cam = window.__cam;
  const bs = window.__bodies().bodies.filter((o) => o.seg < 90);
  bs.sort((a, b2) => b2.r - a.r);
  const t = bs[0];
  const wp = new THREE.Vector3(t.x, t.r, t.z);
  // a slab halfway between the camera and that rival, big enough to hide it
  const mid = wp.clone().lerp(cam.position, 0.35);
  const box = new THREE.Mesh(new THREE.BoxGeometry(40, 40, 40),
    new THREE.MeshBasicMaterial({ color: 0x00ff00 }));
  box.position.copy(mid); box.name = '__occluder';
  window.__scene.add(box);
  return t;
});
await p.waitForTimeout(2500);
await p.screenshot({ path: `qa-out/family/${WORLD}-occlude.png` });
console.log(`qa-out/family/${WORLD}-occlude.png  (green slab hides rival r=${occ.r}; any face on the green is drawing through solid geometry)`);
await b.close();

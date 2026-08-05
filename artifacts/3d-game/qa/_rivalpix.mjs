// WHAT DO THE RIVALS ACTUALLY LOOK LIKE, AS NUMBERS.
//
//   node qa/_rivalpix.mjs [world]
//
// The family shares the hero's body shader (rivals.ts:247). The question this
// answers is whether it shares the hero's *driving* of that shader: uSmall,
// uStage, uSlow and uStretchAmt are what turn the shader from a tinted ball
// into a heavy, evolved, legible creature, and only one of them is written
// per frame for the family (rivals.ts:644-648).
//
// Also reports each void's on-screen radius in device pixels, which is the
// only honest way to ask "does the rim survive at gameplay distance".
import { chromium } from 'playwright';

const WORLD = process.argv[2] || 'maple';
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

const probe = () => window.__scene && (() => {
  const THREE = window.__THREE, cam = window.__cam, out = [];
  const fov = cam.fov ?? 32, H = window.innerHeight * (window.devicePixelRatio || 1);
  window.__scene.traverse((o) => {
    const m = o.material;
    if (!o.isMesh || !m || !m.uniforms || !m.uniforms.uAbyss) return;
    const wp = new THREE.Vector3(); o.getWorldPosition(wp);
    const sc = new THREE.Vector3(); o.getWorldScale(sc);
    const camD = Math.max(1, cam.position.distanceTo(wp));
    const pxR = (H / (2 * camD * Math.tan(fov * Math.PI / 360))) * sc.x;
    const seg = o.geometry.parameters ? o.geometry.parameters.widthSegments : -1;
    // does anything dark and flat sit under this void? (a contact shadow)
    let shadow = false;
    (o.parent?.parent ?? o.parent)?.traverse?.((c) => {
      if (c.isMesh && c.geometry?.type === 'CircleGeometry' && c.material?.map
          && Math.abs(c.rotation.x + Math.PI / 2) < 0.01) shadow = true;
    });
    out.push({ seg, r: +sc.x.toFixed(2), camD: +camD.toFixed(1), pxR: Math.round(pxR),
      uSmall: +m.uniforms.uSmall.value.toFixed(3), uStage: m.uniforms.uStage.value,
      uSlow: +m.uniforms.uSlow.value.toFixed(3), uStretch: +m.uniforms.uStretchAmt.value.toFixed(3),
      uWobble: +m.uniforms.uWobble.value.toFixed(3), shadow });
  });
  return { t: window.__matchState().t, pr: window.__voidState().r, bodies: out };
})();

for (const target of [10, 45, 90, 150]) {
  await p.waitForFunction((tt) => (window.__matchState?.().t ?? 0) > tt, target, { timeout: 900000 });
  const s = await p.evaluate(probe);
  console.log(`\n=== ${WORLD}  t=${s.t.toFixed(1)}s  playerR=${s.pr.toFixed(2)} ===`);
  for (const o of s.bodies) {
    const who = o.seg >= 90 ? 'HERO ' : 'rival';
    console.log(`${who} seg=${o.seg} r=${String(o.r).padStart(6)} camD=${String(o.camD).padStart(6)} pxR=${String(o.pxR).padStart(5)}  uSmall=${o.uSmall} uStage=${o.uStage} uSlow=${o.uSlow} uStretch=${o.uStretch} shadow=${o.shadow}`);
  }
}
await b.close();

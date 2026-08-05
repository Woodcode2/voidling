// PORTRAIT + THE NUMBERS BEHIND IT, in one boot.
//
//   node qa/_heroshoot.mjs [world] [r...]
//
// portrait.mjs photographs the hero but says nothing about the shader state
// that produced the picture. The readability uniform uSmall (void3d.ts:1221)
// re-widens the rim band as he shrinks on screen, so "the rim band is 0.86"
// is only true at a size the hero may never actually be. This shoots the same
// frames AND prints, per radius: camera distance, on-screen radius in CSS px,
// uSmall, and the rim stop that uSmall is actually producing —
// mix(0.86, 0.50, uSmall) — which is the number the silhouette argument is
// really about (void3d.ts:147).
import { chromium } from 'playwright';
import fs from 'node:fs';

const WORLD = process.argv[2] || 'maple';
const RS = process.argv.slice(3).map(Number).filter((n) => n > 0);
const radii = RS.length ? RS : [1.4, 3, 5, 8, 12];
fs.mkdirSync('qa-out/portrait', { recursive: true });

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
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 5, null, { timeout: 900000 });
await p.addStyleTag({ content: '#news,#hud,#stageBar,.bub,#btnHome,#coins{opacity:0!important}' });

const read = () => {
  const THREE = window.__THREE, cam = window.__cam;
  let hero = null;
  window.__scene.traverse((o) => {
    const m = o.material;
    if (!o.isMesh || !m?.uniforms?.uAbyss) return;
    if ((o.geometry.parameters?.widthSegments ?? 0) < 90) return;   // rivals are 40-seg
    const wp = new THREE.Vector3(); o.getWorldPosition(wp);
    const sc = new THREE.Vector3(); o.getWorldScale(sc);
    const camD = cam.position.distanceTo(wp);
    hero = { camD: +camD.toFixed(1), dispR: +sc.x.toFixed(2),
      pxR: +((window.innerHeight / (2 * camD * Math.tan(cam.fov * Math.PI / 360))) * sc.x).toFixed(1),
      uSmall: +m.uniforms.uSmall.value.toFixed(3), uStage: m.uniforms.uStage.value,
      uSlow: +m.uniforms.uSlow.value.toFixed(3) };
  });
  return hero;
};

for (const r of radii) {
  await p.evaluate((rr) => window.__setVoidR(rr), r);
  await p.waitForTimeout(2600);
  const h = await p.evaluate(read);
  const rimStop = (0.86 + (0.50 - 0.86) * h.uSmall);
  // u is the NORMALISED DISC RADIUS, so the rim's share of the visible disc is
  // 1 - stop^2, not 1 - stop. That factor of two is why 0.74 looked like a halo.
  const area = (1 - rimStop * rimStop) * 100;
  console.log(`r=${String(r).padStart(4)}  camD=${String(h.camD).padStart(6)}  pxR(css)=${String(h.pxR).padStart(5)}  uSmall=${String(h.uSmall).padStart(5)}  uStage=${h.uStage}  uSlow=${h.uSlow}  ->  rim stop ${rimStop.toFixed(3)} = ${area.toFixed(0)}% of disc area`);
  const S = 620;
  await p.screenshot({ path: `qa-out/portrait/${WORLD}-r${r}.png`,
    clip: { x: (430 - S / 3) / 2, y: 932 / 2 - S / 6 - 40, width: S / 3, height: S / 3 } });
}
await b.close();

// HOW BIG IS THE HERO ON THE PHONE, REALLY — across the whole growth ladder.
//
//   node qa/_gh_size.mjs <world> [port]
//
// No pixels: the draw is stubbed the whole way, the camera is settled against
// the distance law at prototype3d.ts:4519 to 0.5%, and the on-screen radius is
// read from the same expression the shader's readability term uses
// (void3d.ts:1219). This exists because every r=12 screenshot in qa-out was
// taken before camDist had finished pulling back, which makes a WORLD ENDER
// look about three times the size it actually settles at.
import { chromium } from 'playwright';

const WORLD = process.argv[2] || 'maple';
const PORT = process.argv[3] || '4242';
const RADII = [0.9, 1.2, 1.6, 2.5, 3.6, 5.5, 8, 12, 16, 20];

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
} catch { /* private mode */ } });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show')
  .forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1500);
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
await p.evaluate(() => { window.__renderer.render = () => {}; });
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 5, null, { timeout: 900000 });
await p.evaluate(() => { window.__pinQuality(0); window.__setMood('cruise'); });
await p.evaluate(() => {
  let hero = null;
  window.__scene.traverse((o) => {
    if (o.isMesh && o.material?.uniforms?.uAbyss && o.geometry?.parameters?.widthSegments === 96) hero = o;
  });
  window.__heroBody = hero; window.__heroGroup = hero.parent.parent;
});
const frames = (n) => p.evaluate((k) => new Promise((res) => {
  let i = 0; const s = () => { if (++i >= k) return res(1); requestAnimationFrame(s); }; requestAnimationFrame(s);
}), n);

console.log(`world  r      camD    voidDiam(CSS px)  %screenH  uSmall  eyeDiam(CSS)  mouthW(CSS)`);
for (const R of RADII) {
  let err = 1, n = 0;
  while (err > 0.005 && n++ < 300) {
    await frames(8);
    err = await p.evaluate((rr) => {
      window.__setVoidR(rr);
      const c = window.__cam.position;
      const steep = Math.min(1, Math.max(0, (rr - 2.5) / 5.5));
      const ox = 0.62 + (0.45 - 0.62) * steep, oy = 0.92 + (1.4 - 0.92) * steep;
      const camDist = c.y / (oy / Math.hypot(ox, oy, ox));
      const target = Math.min(340, Math.max(26, 38 * Math.pow(rr / 0.9, 0.82)));
      return Math.abs(camDist - target) / target;
    }, R);
  }
  const g = await p.evaluate(() => {
    const cam = window.__cam, o = window.__heroGroup;
    o.updateWorldMatrix(true, false);
    const e = o.matrixWorld.elements;
    const camD = Math.hypot(cam.position.x - e[12], cam.position.y - e[13], cam.position.z - e[14]);
    const vs = window.__voidState();
    const pxR = (window.innerHeight / (2 * camD * Math.tan(cam.fov * Math.PI / 360))) * vs.r;
    const small = window.__heroBody.material.uniforms.uSmall.value;
    // void3d.ts:1330 / :1345 — the authored feature sizes, in face units
    const eyeLod = 1 + small * 0.18;
    return { r: vs.r, camD: +camD.toFixed(1), pxR: +pxR.toFixed(1), small: +small.toFixed(3),
      eye: +(0.42 * eyeLod * pxR).toFixed(1),                    // sclera diameter
      mouth: +(0.33 * (1 + small * 0.20) * pxR).toFixed(1) };    // smile width
  });
  console.log(`${WORLD.padEnd(7)}${String(g.r).padEnd(7)}${String(g.camD).padEnd(8)}${(g.pxR * 2).toFixed(0).padEnd(18)}${((g.pxR * 2 / 932) * 100).toFixed(1).padEnd(10)}${String(g.small).padEnd(8)}${String(g.eye).padEnd(14)}${g.mouth}`);
}
await b.close();

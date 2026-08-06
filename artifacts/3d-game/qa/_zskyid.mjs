// WHICH PIXELS ARE ACTUALLY SKY?
// Shoot the frame twice: once as authored, once with scene.background forced to
// pure magenta. Every pixel that changed is a background pixel. That is the only
// way to label a region "sky" without guessing from colour.
import { chromium } from 'playwright';
import fs from 'node:fs';
const WORLD = process.argv[2] || 'lantern';
const MARK = Number(process.argv[3] || 5);
const PORT = process.argv[4] || '4177';
fs.mkdirSync('/tmp/claude-0/-home-user-voidling/1f93d8f7-3ff2-5559-8b0b-a74b62b39437/scratchpad/sky', { recursive: true });
const OUT = '/tmp/claude-0/-home-user-voidling/1f93d8f7-3ff2-5559-8b0b-a74b62b39437/scratchpad/sky';

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
p.setDefaultTimeout(400000);
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1400);
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });

await p.evaluate(() => {
  window.__RR = window.__renderer.render.bind(window.__renderer);
  window.__stub = () => { window.__renderer.render = () => {}; };
  window.__unstub = () => { window.__renderer.render = window.__RR; };
  const cv = document.querySelector('canvas');
  const cx = innerWidth / 2, cy = innerHeight / 2;
  cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
  const tick = () => {
    const vs = window.__voidState(); let best = null, bd = 1e9;
    for (const e of window.__edibles) {
      if (e.eaten || !e.mesh?.visible || e.radius > vs.r * 0.92) continue;
      const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
      const d = dx * dx + dz * dz; if (d < bd) { bd = d; best = { dx, dz }; }
    }
    if (best) { const m = Math.hypot(best.dx, best.dz) || 1;
      dispatchEvent(new PointerEvent('pointermove', { pointerId: 1,
        clientX: cx + best.dx / m * 110, clientY: cy + best.dz / m * 110, bubbles: true })); }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

await p.evaluate(() => window.__stub());
await p.waitForFunction(t => (window.__matchState?.().t ?? 0) > t, MARK, { timeout: 900000 });
await p.evaluate(() => window.__unstub());
await p.waitForTimeout(1400);

const info = await p.evaluate(() => {
  const s = window.__scene;
  const cam = window.__cam;
  return {
    bgType: s.background?.isTexture ? 'texture' : (s.background?.isColor ? 'color #' + s.background.getHexString() : String(s.background)),
    bgI: s.backgroundIntensity,
    exposure: window.__renderer.toneMappingExposure,
    hemi: s.children.filter(c => c.isHemisphereLight).map(c => c.intensity),
    sun: s.children.filter(c => c.isDirectionalLight).map(c => c.intensity),
    fog: s.fog ? { c: '#' + s.fog.color.getHexString(), near: s.fog.near, far: s.fog.far } : null,
    camPos: cam ? [+cam.position.x.toFixed(1), +cam.position.y.toFixed(1), +cam.position.z.toFixed(1)] : null,
    camRotX: cam ? +(cam.rotation.x * 180 / Math.PI).toFixed(1) : null,
    fov: cam?.fov, t: +window.__matchState().t.toFixed(1), r: +window.__voidState().r.toFixed(2),
  };
});
console.log(JSON.stringify(info, null, 1));

// hide the DOM HUD so only the 3D frame is compared
await p.addStyleTag({ content: '#hud,#news,.bub,#ticker,#lead,#progress,#combo,body>div{ }' });
await p.screenshot({ path: `${OUT}/${WORLD}-${MARK}-A.png` });

// force the background to pure magenta; nothing else changes
await p.evaluate(() => {
  const s = window.__scene;
  window.__oldBG = s.background; window.__oldI = s.backgroundIntensity;
  const THREEColor = s.fog ? s.fog.color.constructor : null;
  s.background = new THREEColor(1, 0, 1);
  s.backgroundIntensity = 1;
});
await p.waitForTimeout(1200);
await p.screenshot({ path: `${OUT}/${WORLD}-${MARK}-B.png` });
await b.close();
console.log('wrote', `${OUT}/${WORLD}-${MARK}-{A,B}.png`);

import { chromium } from 'playwright';
const WORLD = process.argv[2] || 'lantern';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
p.on('pageerror', (e) => console.log('PAGEERR', String(e).slice(0,120)));
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try { localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1');
  localStorage.setItem('voidMute','1'); localStorage.setItem('voidDailyLast', new Date().toDateString());
  localStorage.setItem('voidUnlocked','maple,pirate,gameday,lantern'); } catch {} });
await p.goto(`http://127.0.0.1:4177/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => { if (['daily','gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1200);
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 900000 });
const out = await p.evaluate(() => {
  const THREE = window.__THREE, ren = window.__renderer, scene = window.__scene, cam = window.__cam;
  const W = 430, H = 932;
  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.FloatType });
  const old = ren.getRenderTarget();
  ren.setRenderTarget(rt); ren.render(scene, cam);
  const buf = new Float32Array(W * H * 4);
  ren.readRenderTargetPixels(rt, 0, 0, W, H, buf);
  ren.setRenderTarget(old);
  let mx = 0, over105 = 0, over12 = 0, n = 0;
  const hist = {};
  for (let i = 0; i < buf.length; i += 4) {
    const v = 0.299*buf[i] + 0.587*buf[i+1] + 0.114*buf[i+2];
    if (v > mx) mx = v;
    if (v > 1.05) over105++;
    if (v > 1.2) over12++;
    n++;
  }
  // count emissive materials in view frustum roughly: scan scene for emissiveIntensity > 1
  let emCount = 0;
  scene.traverse((o) => { const m = o.material; if (m && m.emissiveIntensity > 1) emCount++; });
  return { max: +mx.toFixed(3), over105, over12, total: n, emissiveMats: emCount };
});
console.log(WORLD, JSON.stringify(out));
await b.close();

// THE HERO'S RENDERED APPEARANCE, AS NUMBERS YOU CAN AIM AT.
// Frozen frame, fixed radius, fixed uniforms — the null control on this setup
// is 0.016 saturation, so a difference of 0.03 is real. Used to preserve an
// APPROVED look across a change to the pipeline underneath it: record the mean
// RGB before, change the substrate, then solve the palette back to these.
//   node qa/heroswatch.mjs [port] [radii]
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4173';
const RADII = (process.argv[3] || '1.25,3').split(',').map(Number);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('voidPlayed','1');
  localStorage.setItem('voidTut','1'); localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => { if (['daily','gift'].includes(e.id)) e.classList.remove('show'); }));
await p.evaluate(() => document.getElementById('btnPlay')?.click());
await p.waitForTimeout(1500);
await p.evaluate(() => document.querySelector('#worldRow .wCard[data-world="maple"]')?.click());
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 2.5, null, { timeout: 400000 });
await p.addStyleTag({ content: '#joy,#joyNub,.bub{display:none !important}' });
console.log('   r     mean RGB        hex       sat     val');
for (const rr of RADII) {
  await p.evaluate((v) => window.__setVoidR?.(v), rr);
  await p.waitForTimeout(4200);
  await p.evaluate(() => { window.__RAF = window.requestAnimationFrame; window.requestAnimationFrame = () => 0; });
  await p.waitForTimeout(400);
  const o = await p.evaluate(() => {
    const THREE = window.__THREE, sc = window.__scene, cam = window.__cam, ren = window.__renderer;
    const vs = window.__voidState();
    sc.traverse((o) => { const m = o.material;
      if (m && m.uniforms && m.uniforms.uTime) m.uniforms.uTime.value = 12.0; });
    ren.setRenderTarget(null); ren.render(sc, cam);
    const cv = ren.domElement, W = cv.width, H = cv.height;
    const c2 = document.createElement('canvas'); c2.width = W; c2.height = H;
    const g = c2.getContext('2d'); g.drawImage(cv, 0, 0);
    const wp = new THREE.Vector3(vs.x, vs.r * 0.1, vs.z).project(cam);
    const cx = Math.round((wp.x * 0.5 + 0.5) * W), cy = Math.round((-wp.y * 0.5 + 0.5) * H);
    const camD = cam.position.distanceTo(new THREE.Vector3(vs.x, vs.r * 0.1, vs.z));
    const rad = Math.round((H / (2 * camD * Math.tan(cam.fov * Math.PI / 360))) * vs.r * 0.55);
    const d = g.getImageData(cx - rad, cy - rad, rad * 2, rad * 2).data;
    let R = 0, G = 0, B = 0, n = 0;
    for (let y = 0; y < rad * 2; y++) for (let x = 0; x < rad * 2; x++) {
      if (Math.hypot(x - rad, y - rad) > rad) continue;
      const i = ((y * rad * 2) + x) * 4; R += d[i]; G += d[i+1]; B += d[i+2]; n++;
    }
    return { R: R/n, G: G/n, B: B/n };
  });
  await p.evaluate(() => { window.requestAnimationFrame = window.__RAF; });
  const mx = Math.max(o.R, o.G, o.B), mn = Math.min(o.R, o.G, o.B);
  const hx = '#' + [o.R, o.G, o.B].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  console.log(`${String(rr).padStart(5)}   ${o.R.toFixed(0).padStart(3)},${o.G.toFixed(0).padStart(3)},${o.B.toFixed(0).padStart(3)}    ${hx}   ${(mx?(mx-mn)/mx:0).toFixed(3)}   ${(mx/255).toFixed(3)}`);
}
await b.close();

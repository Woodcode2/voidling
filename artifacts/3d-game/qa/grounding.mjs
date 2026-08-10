// IS THE HERO STANDING ON THE GROUND, OR FLOATING OVER IT?
//
// The void's body does NOT cast into the shadow map — deliberately, and the
// reasoning is sound (void3d.ts setRadius: a 24-unit sphere under Game Day's
// 40-degree sun laid a hard black ellipse BESIDE the hero that read as a second
// void). Everything grounding him therefore rests on one thing: the contact
// disc, a soft dark circle on the floor at 1.52x his radius.
//
// 1.52 is thinner than it sounds. The comment next to it concedes that at the
// camera's elevation "anything under about 1.45x is entirely hidden behind the
// ball" — so the disc shows a ring 4.6% of his radius wide, and the alpha
// profile at that distance from centre is about 0.24, times the material's 0.62
// opacity. A near-black at 15% over a 4.6% annulus is close to nothing.
//
// That is an argument, not a measurement, and arguments about this game's
// pixels have been wrong before. So: MEASURE THE DISC'S CONTRIBUTION DIRECTLY,
// by rendering the identical frame twice — once as shipped, once with the disc
// hidden — and differencing them. The difference IS the shadow, with no
// assumption about where it lands, how big it is, or what colour the ground
// under it happens to be.
//
//   shadow px    pixels the disc changes by more than 3/255
//   vs hero      that count as a fraction of the hero's own on-screen disc area
//   peak         the largest darkening the disc achieves anywhere, in 0-255
//   mean         mean darkening across the pixels it touches
//   reach        how far the darkened region extends past the silhouette, in
//                units of the hero's on-screen radius. Under 1.0 means every
//                dark pixel is BEHIND him and the player sees none of it.
//
//   node qa/grounding.mjs [port] [radii]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const PORT = process.argv[2] || '4173';
const RADII = (process.argv[3] || '1.5,4,8,14').split(',').map(Number);
const OUT = 'qa/out/grounding';
mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
p.on('pageerror', (e) => console.log(`  [pageerror] ${e.message.split('\n')[0]}`));
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => {
  try {
    localStorage.clear();
    localStorage.setItem('voidPlayed', '1');
    localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
  } catch { }
});
await p.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show');
}));
await p.evaluate(() => document.getElementById('btnPlay')?.click());
await p.waitForTimeout(1400);
await p.evaluate(() => document.querySelector('#worldRow .wCard[data-world="maple"]')?.click());
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
await p.evaluate(() => {
  const cv = document.querySelector('canvas');
  cv.dispatchEvent(new PointerEvent('pointerdown', {
    pointerId: 1, clientX: innerWidth / 2, clientY: innerHeight / 2, bubbles: true }));
});
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 2.5, null, { timeout: 400000 });
await p.addStyleTag({ content: '#joy,#joyNub{display:none !important}' });

// Both renders in this probe come out of a render target inside ONE evaluate,
// with nothing stepped in between, so the two frames are the same frame in every
// respect except the disc. No clock freeze is needed for that — but the radius
// still has to settle before the pair is taken, hence the wait below.
console.log('     r   heroPxR   shadow px   vs hero   peak   mean   reach');
const rows = [];
for (const rr of RADII) {
  await p.evaluate((v) => window.__setVoidR(v), rr);
  // 3.4 s: jumping the radius fires the evolution burst, whose torus takes
  // about three seconds to reach opacity zero. See qa/heroface.mjs.
  await p.waitForTimeout(3400);
  const m = await p.evaluate(() => {
    const THREE = window.__THREE, ren = window.__renderer, sc = window.__scene, cam = window.__cam;
    const vs = window.__voidState();
    const dpr = ren.getPixelRatio();
    const W = Math.floor(ren.domElement.width), H = Math.floor(ren.domElement.height);
    // the hero on screen: centre and radius, projected rather than guessed
    const wp = new THREE.Vector3(vs.x, vs.r, vs.z);
    const sp = wp.clone().project(cam);
    const cx = (sp.x * 0.5 + 0.5) * W, cy = (1 - (sp.y * 0.5 + 0.5)) * H;
    const camD = Math.max(1, cam.position.distanceTo(wp));
    const pxR = (window.innerHeight / (2 * camD * Math.tan(cam.fov * Math.PI / 360))) * vs.r * dpr;
    // …and where his FEET are, which is what the disc is drawn around
    const gp = new THREE.Vector3(vs.x, 0, vs.z).project(cam);
    const gx = (gp.x * 0.5 + 0.5) * W, gy = (1 - (gp.y * 0.5 + 0.5)) * H;

    const rt = new THREE.WebGLRenderTarget(W, H);
    const prev = ren.getRenderTarget();
    const shoot = () => {
      ren.setRenderTarget(rt); ren.render(sc, cam);
      const buf = new Uint8Array(W * H * 4);
      ren.readRenderTargetPixels(rt, 0, 0, W, H, buf);
      return buf;
    };
    const disc = sc.getObjectByName('contact');
    const withDisc = shoot();
    const was = disc ? disc.visible : null;
    if (disc) disc.visible = false;
    const without = shoot();
    if (disc) disc.visible = was;
    ren.setRenderTarget(prev); rt.dispose();

    // the difference IS the shadow
    let n = 0, sum = 0, peak = 0, reach = 0;
    const L = (buf, i) => 0.2126 * buf[i] + 0.7152 * buf[i + 1] + 0.0722 * buf[i + 2];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        // readRenderTargetPixels is bottom-up; both buffers share that, so the
        // difference does not care, but the reach measurement does
        const d = L(without, i) - L(withDisc, i);      // positive = the disc darkened it
        if (d <= 3) continue;
        n++; sum += d; if (d > peak) peak = d;
        const yy = H - 1 - y;
        reach = Math.max(reach, Math.hypot(x - cx, yy - cy) / Math.max(1, pxR));
      }
    }
    return { pxR, n, mean: n ? sum / n : 0, peak, reach, W, H, discFound: !!disc,
      heroArea: Math.PI * pxR * pxR, gx, gy, cx, cy };
  });
  if (!m.discFound) { console.log('  FAIL — no object named "contact" in the scene.'); break; }
  rows.push({ rr, ...m });
  console.log(`${String(rr).padStart(6)}    ${m.pxR.toFixed(0).padStart(5)}`
    + `      ${String(m.n).padStart(6)}`
    + `    ${(m.n / m.heroArea * 100).toFixed(1).padStart(5)}%`
    + `   ${m.peak.toFixed(1).padStart(4)}`
    + `   ${m.mean.toFixed(1).padStart(4)}`
    + `    ${m.reach.toFixed(2)}`);
}
await b.close();

if (!rows.length) process.exit(1);
console.log('\n══ READ IT LIKE THIS');
console.log('  vs hero   the shadow\'s visible footprint as a % of the hero\'s own disc.');
console.log('            A grounded character in a shipped game reads at tens of percent.');
console.log('  peak      how dark the darkest shadow pixel gets, out of 255. Under ~12 is');
console.log('            below the threshold most phone screens resolve outdoors.');
console.log('  reach     max distance of any darkened pixel from the hero\'s centre, in his');
console.log('            own radii. UNDER 1.00 MEANS THE WHOLE SHADOW IS BEHIND HIM and the');
console.log('            player never sees it — he is a ball floating over a clean floor.');
const floating = rows.filter((r) => r.reach < 1.02 || r.n / r.heroArea < 0.05);
console.log(floating.length
  ? `\nUNGROUNDED at r = ${floating.map((r) => r.rr).join(', ')}`
  : '\nPASS — the contact disc is visible and doing work at every size sampled.');
process.exit(floating.length ? 1 : 0);

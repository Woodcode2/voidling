// REFUTATION PROBE for "the family is excluded from the readability law".
//
//   node qa/_famref.mjs [world]
//
// 1. Dump every void body's per-frame uniforms at t=12/60/130 (as qa/_family
//    did) so the "five of seven never written" claim can be checked at HEAD.
// 2. At t=130, photograph the frame twice — rivals at their shipped uStage=0
//    and again with uStage forced to the value stageFor(rv.r) would give the
//    hero — and measure the pixel difference inside each rival's own bounding
//    disc. That answers "would a child ever notice" with a number.
// 3. Same for uStretchAmt at the hero's ceiling (0.085).
import { chromium } from 'playwright';
import fs from 'node:fs';

const WORLD = process.argv[2] || 'maple';
fs.mkdirSync('qa-out/famref', { recursive: true });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
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
      // project the centre to screen space so a diff can be scoped to the body
      const ndc = wp.clone().project(cam);
      out.push({ hero: (o.geometry.parameters?.widthSegments ?? -1) >= 90,
        x: +wp.x.toFixed(1), z: +wp.z.toFixed(1),
        r: +sc.x.toFixed(2), camD: +camD.toFixed(1), pxR: Math.round(pxR),
        sx: Math.round((ndc.x * 0.5 + 0.5) * window.innerWidth),
        sy: Math.round((-ndc.y * 0.5 + 0.5) * window.innerHeight),
        onscreen: Math.abs(ndc.x) < 1 && Math.abs(ndc.y) < 1 && ndc.z < 1,
        uSmall: +m.uniforms.uSmall.value.toFixed(3), uStage: m.uniforms.uStage.value,
        uSlow: +m.uniforms.uSlow.value.toFixed(3),
        uStretch: +m.uniforms.uStretchAmt.value.toFixed(3),
        uWobble: +m.uniforms.uWobble.value.toFixed(3) });
    });
    return { t: window.__matchState().t, pr: window.__voidState().r, bodies: out };
  };
  // force a uniform on every RIVAL body (hero is the 96-segment sphere)
  window.__forceRivals = (name, val) => {
    let n = 0;
    window.__scene.traverse((o) => {
      const m = o.material;
      if (!o.isMesh || !m || !m.uniforms || !m.uniforms.uAbyss) return;
      if ((o.geometry.parameters?.widthSegments ?? -1) >= 90) return;
      if (name === 'uStage') {
        const R = [0, 1.6, 2.5, 3.6, 5.5, 8.0], V = [0, 1, 2, 3, 3, 4];
        const sc = new window.__THREE.Vector3(); o.getWorldScale(sc);
        let s = 0; for (let i = 0; i < R.length; i++) if (sc.x >= R[i]) s = i;
        m.uniforms.uStage.value = V[s];
      } else m.uniforms[name].value = val;
      n++;
    });
    return n;
  };
  // read a screenshot back through a 2D canvas (preserveDrawingBuffer is off)
  window.__px = (b64) => new Promise((res) => {
    const i = new Image();
    i.onload = () => {
      const c = document.createElement('canvas');
      c.width = i.width; c.height = i.height;
      const g = c.getContext('2d'); g.drawImage(i, 0, 0);
      res({ w: i.width, h: i.height, d: Array.from(g.getImageData(0, 0, i.width, i.height).data) });
    };
    i.src = 'data:image/png;base64,' + b64;
  });
});

const dump = (s, tag) => {
  console.log(`\n=== ${WORLD} ${tag} t=${s.t.toFixed(1)}s playerR=${s.pr.toFixed(2)} ===`);
  for (const o of s.bodies) {
    console.log(`${o.hero ? 'HERO ' : 'rival'} r=${String(o.r).padStart(6)} pxR=${String(o.pxR).padStart(5)} on=${o.onscreen ? 'Y' : 'n'} @(${o.sx},${o.sy})  uSmall=${o.uSmall} uStage=${o.uStage} uSlow=${o.uSlow} uStretch=${o.uStretch}`);
  }
};

for (const target of [12, 60, 130]) {
  await p.waitForFunction((tt) => (window.__matchState?.().t ?? 0) > tt, target, { timeout: 900000 });
  dump(await p.evaluate(() => window.__bodies()), 't' + target);
}

// ── the visible cost of uStage / uStretch, in pixels ────────────────────────
await p.addStyleTag({ content: '#news,#hud,#stageBar,.vb,.vf,#btnHome,#coins{opacity:0!important}' });
// park the hero far away and freeze the clock feel: we compare two frames of a
// LIVE game, so first measure the frame-to-frame noise floor with nothing
// changed at all. Anything below that noise floor is not a visible difference.
async function shoot(name) {
  const buf = await p.screenshot({ path: `qa-out/famref/${WORLD}-${name}.png` });
  return buf.toString('base64');
}
const before = await shoot('a');
await p.waitForTimeout(1200);
const noiseShot = await shoot('a2');
const state = await p.evaluate(() => window.__bodies());
const rivals = state.bodies.filter((o) => !o.hero && o.onscreen);
console.log('\nvisible rivals for the diff:', JSON.stringify(rivals.map((r) => ({ r: r.r, pxR: r.pxR, at: [r.sx, r.sy] }))));

const forced = await p.evaluate(() => window.__forceRivals('uStage', 0));
console.log('rival bodies forced:', forced);
await p.waitForTimeout(1200);
const stageShot = await shoot('b');
await p.evaluate(() => window.__forceRivals('uStretchAmt', 0.085));
await p.waitForTimeout(1200);
const stretchShot = await shoot('c');

const diff = await p.evaluate(async ([base, others, boxes]) => {
  const A = await window.__px(base);
  const out = [];
  for (const [name, b64] of others) {
    const B = await window.__px(b64);
    for (const bx of boxes) {
      const rr = Math.max(6, Math.min(120, bx.pxR + 6));
      let n = 0, sum = 0, mx = 0;
      for (let y = Math.max(0, bx.sy - rr); y < Math.min(A.h, bx.sy + rr); y++) {
        for (let x = Math.max(0, bx.sx - rr); x < Math.min(A.w, bx.sx + rr); x++) {
          const i = (y * A.w + x) * 4;
          const d = Math.max(Math.abs(A.d[i] - B.d[i]), Math.abs(A.d[i + 1] - B.d[i + 1]), Math.abs(A.d[i + 2] - B.d[i + 2]));
          n++; sum += d; if (d > mx) mx = d;
        }
      }
      out.push({ name, pxR: bx.pxR, r: bx.r, meanDiff: +(sum / n).toFixed(2), maxDiff: mx });
    }
  }
  return out;
}, [before, [['noise(no change)', noiseShot], ['uStage=ladder', stageShot], ['+uStretch=0.085', stretchShot]], rivals]);
console.log('\nper-rival pixel difference vs the shipped frame:');
for (const d of diff) console.log(`  ${d.name.padEnd(18)} rival r=${d.r} pxR=${d.pxR}  mean|d|=${d.meanDiff}  max|d|=${d.maxDiff}`);
await b.close();

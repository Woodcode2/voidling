// Fast companion to qa/_famref.mjs. Forces the endgame instead of waiting for
// it: the family's size ceiling is 0.78x the player (rivals.ts:707), so
// __setVoidR(11.5) drags every sibling up to r~9 in a few seconds of match
// time. That is where the "a rival at r=8 renders as a stage-0 hatchling"
// claim bites hardest, so that is where the pixel diff is worth taking.
import { chromium } from 'playwright';
import fs from 'node:fs';

const WORLD = process.argv[2] || 'maple';
fs.mkdirSync('qa-out/famref', { recursive: true });
const log = (s) => { console.log(s); fs.appendFileSync(`qa-out/famref/${WORLD}-log.txt`, s + '\n'); };

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
      const ndc = wp.clone().project(cam);
      out.push({ hero: (o.geometry.parameters?.widthSegments ?? -1) >= 90,
        r: +sc.x.toFixed(2), camD: +camD.toFixed(1), pxR: Math.round(pxR),
        sx: Math.round((ndc.x * 0.5 + 0.5) * window.innerWidth),
        sy: Math.round((-ndc.y * 0.5 + 0.5) * window.innerHeight),
        onscreen: Math.abs(ndc.x) < 0.95 && Math.abs(ndc.y) < 0.95 && ndc.z < 1,
        uSmall: +m.uniforms.uSmall.value.toFixed(3), uStage: m.uniforms.uStage.value,
        uSlow: +m.uniforms.uSlow.value.toFixed(3),
        uStretch: +m.uniforms.uStretchAmt.value.toFixed(3) });
    });
    return { t: window.__matchState().t, pr: window.__voidState().r, bodies: out };
  };
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
  log(`\n=== ${WORLD} ${tag} t=${s.t.toFixed(1)}s playerR=${s.pr.toFixed(2)} ===`);
  for (const o of s.bodies) {
    log(`${o.hero ? 'HERO ' : 'rival'} r=${String(o.r).padStart(6)} pxR=${String(o.pxR).padStart(5)} on=${o.onscreen ? 'Y' : 'n'}  uSmall=${o.uSmall} uStage=${o.uStage} uSlow=${o.uSlow} uStretch=${o.uStretch}`);
  }
};

await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 12, null, { timeout: 900000 });
dump(await p.evaluate(() => window.__bodies()), 'shipped t12');

// force the endgame
await p.evaluate(() => window.__setVoidR(11.5));
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 30, null, { timeout: 900000 });
await p.evaluate(() => window.__setVoidR(11.5));
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 45, null, { timeout: 900000 });
dump(await p.evaluate(() => window.__bodies()), 'endgame-forced');

await p.addStyleTag({ content: '#news,#hud,#stageBar,.vb,.vf,#btnHome,#coins{opacity:0!important}' });
const shoot = async (n) => (await p.screenshot({ path: `qa-out/famref/${WORLD}-${n}.png` })).toString('base64');
const A = await shoot('shipped');
await p.waitForTimeout(1200);
const noise = await shoot('shipped2');
const st = await p.evaluate(() => window.__bodies());
const rivals = st.bodies.filter((o) => !o.hero && o.onscreen && o.pxR > 3);
log('\nrivals in frame for the diff: ' + JSON.stringify(rivals.map((r) => ({ r: r.r, pxR: r.pxR }))));
await p.evaluate(() => window.__forceRivals('uStage', 0));
await p.waitForTimeout(1200);
const S = await shoot('stage');
await p.evaluate(() => window.__forceRivals('uStretchAmt', 0.085));
await p.waitForTimeout(1200);
const T = await shoot('stretch');

const res = await p.evaluate(async ([base, others, boxes]) => {
  const a = await window.__px(base); const out = [];
  for (const [name, b64] of others) {
    const b2 = await window.__px(b64);
    for (const bx of boxes) {
      const rr = Math.max(6, Math.min(160, bx.pxR + 8));
      let n = 0, sum = 0, mx = 0, over8 = 0;
      for (let y = Math.max(0, bx.sy - rr); y < Math.min(a.h, bx.sy + rr); y++)
        for (let x = Math.max(0, bx.sx - rr); x < Math.min(a.w, bx.sx + rr); x++) {
          const i = (y * a.w + x) * 4;
          const d = Math.max(Math.abs(a.d[i] - b2.d[i]), Math.abs(a.d[i + 1] - b2.d[i + 1]), Math.abs(a.d[i + 2] - b2.d[i + 2]));
          n++; sum += d; if (d > mx) mx = d; if (d > 8) over8++;
        }
      out.push({ name, r: bx.r, pxR: bx.pxR, mean: +(sum / n).toFixed(2), max: mx, pctOver8: +(100 * over8 / n).toFixed(1) });
    }
  }
  return out;
}, [A, [['noise', noise], ['uStage=ladder', S], ['+uStretch.085', T]], rivals]);
log('\npixel difference vs the shipped frame, inside each rival disc:');
for (const d of res) log(`  ${d.name.padEnd(16)} r=${String(d.r).padStart(5)} pxR=${String(d.pxR).padStart(4)}  mean|d|=${d.mean}  max|d|=${d.max}  %px>8=${d.pctOver8}`);
await b.close();

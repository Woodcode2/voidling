// REFUTATION PROBE — "every rival is the same face, the predator never stops smiling"
//
//   node qa/_rf_face2.mjs [world] [untilT]
//
// Three questions, measured, never asserted:
//  1. How big is a rival's SMILE on a phone, in device pixels, at the moment
//     NIBBLES is charging the player? (the whole finding rests on the child
//     being able to READ that mouth)
//  2. Does anything on the hunter's face move when she hunts? (the finding says
//     only `fleeing` moves it; rivals.ts:1394 also has rv.cst===1 -> 1.2)
//  3. Screenshot the charge as the child sees it.
import { chromium } from 'playwright';
import fs from 'node:fs';

const WORLD = process.argv[2] || 'maple';
const UNTIL = Number(process.argv[3] || 150);
fs.mkdirSync('qa-out/rf-face2', { recursive: true });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
} catch { /* private */ } });
await p.goto(`http://127.0.0.1:4177/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show')
  .forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1500);
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 1, null, { timeout: 900000 });

// bind every rival's face rig by geometry signature, then name it by matching
// its group world position against __matchState().rivals each sample
await p.evaluate(() => {
  const rigs = [];
  window.__scene.traverse((o) => {
    const g = o.geometry && o.geometry.parameters;
    if (!g || !o.isMesh) return;
    // rival smile: CircleGeometry(0.095, 24, PI, PI)  (rivals.ts:295)
    if (Math.abs(g.radius - 0.095) < 1e-6 && g.segments === 24
        && Math.abs((g.thetaLength ?? 0) - Math.PI) < 1e-6) {
      const eyes = o.parent, group = eyes.parent;
      rigs.push({ smile: o, eyes, group,
        whites: eyes.children.filter((c, i) => i < 4 && i % 2 === 0),
        blush: eyes.children.filter((c) => c.geometry?.parameters?.radius === 0.085) });
    }
  });
  window.__rigs = rigs;
  return rigs.length;
});

const sample = () => p.evaluate(() => {
  const THREE = window.__THREE, cam = window.__cam, ms = window.__matchState();
  const H = window.innerHeight * (window.devicePixelRatio || 1);
  const fov = cam.fov ?? 32;
  const wp = new THREE.Vector3(), sc = new THREE.Vector3();
  const out = [];
  for (const rig of window.__rigs) {
    rig.group.getWorldPosition(wp);
    // name it: nearest rival in the state list
    let best = null, bd = 1e9;
    for (const r of ms.rivals) {
      const d = Math.hypot(r.x - wp.x, r.z - wp.z);
      if (d < bd) { bd = d; best = r; }
    }
    if (!best || bd > 3) continue;
    rig.smile.getWorldScale(sc);
    const camD = Math.max(1, cam.position.distanceTo(wp));
    const perUnit = H / (2 * camD * Math.tan(fov * Math.PI / 360));
    // smile is a half-disc of radius 0.095 in eyes-local units, so its widest
    // extent on screen is 2*0.095*worldScale
    const smilePx = 2 * 0.095 * sc.x * perUnit;
    const ndc = wp.clone().project(cam);
    out.push({ name: best.name, hunt: best.hunt, r: +best.r.toFixed(2),
      d: +Math.hypot(best.x - ms.x, best.z - ms.z).toFixed(1),
      smilePx: +smilePx.toFixed(1),
      smileSy: +rig.smile.scale.y.toFixed(3),
      smileVis: rig.smile.visible,
      blushOp: +(rig.blush[0]?.material.opacity ?? -1).toFixed(2),
      whiteScale: +(rig.whites[0]?.scale.x ?? -1).toFixed(3),
      onScreen: Math.abs(ndc.x) < 1 && Math.abs(ndc.y) < 1 && ndc.z < 1,
      ndc: [+ndc.x.toFixed(2), +ndc.y.toFixed(2)] });
  }
  return { t: +ms.t.toFixed(1), pr: +ms.r.toFixed(2), rivals: out };
});

const log = [];
let shots = 0;
let last = -1;
while (true) {
  const s = await sample();
  if (s.t > UNTIL) break;
  if (s.t !== last) { log.push(s); last = s.t; }
  const z = s.rivals.find((r) => r.name === 'NIBBLES');
  // photograph a charge: hunting, close, on screen
  if (z && z.hunt && z.d < 55 && z.onScreen && shots < 6) {
    shots++;
    await p.screenshot({ path: `qa-out/rf-face2/${WORLD}-charge-${shots}-t${Math.round(s.t)}-d${Math.round(z.d)}-px${Math.round(z.smilePx)}.png` });
  }
  await p.waitForTimeout(120);
}

// ── what actually moved on the hunter's face over the whole match ────────────
const zRows = log.flatMap((s) => s.rivals.filter((r) => r.name === 'NIBBLES').map((r) => ({ t: s.t, ...r })));
const uniq = (k) => [...new Set(zRows.map((r) => r[k]))];
console.log('samples:', log.length, 'chompzilla rows:', zRows.length);
console.log('smile scale.y values seen :', uniq('smileSy').join(', '));
console.log('smile visible values seen :', uniq('smileVis').join(', '));
console.log('blush opacity values seen :', uniq('blushOp').join(', '));
console.log('eye-white scale values seen:', uniq('whiteScale').join(', '));
const hunting = zRows.filter((r) => r.hunt);
console.log('hunting rows:', hunting.length,
  'white scales while hunting:', [...new Set(hunting.map((r) => r.whiteScale))].join(', '));
const near = zRows.filter((r) => r.onScreen && r.d < 60);
near.sort((a, b) => a.smilePx - b.smilePx);
if (near.length) {
  const q = (f) => near[Math.floor(f * (near.length - 1))].smilePx;
  console.log(`SMILE WIDTH on screen, NIBBLES within 60u and on camera (n=${near.length}, device px @dpr3):`);
  console.log(`  min ${q(0)}  p25 ${q(0.25)}  median ${q(0.5)}  p75 ${q(0.75)}  max ${q(1)}`);
  console.log(`  in CSS px (÷3): median ${(q(0.5) / 3).toFixed(1)}  max ${(q(1) / 3).toFixed(1)}`);
}
const allOn = zRows.filter((r) => r.onScreen);
console.log(`NIBBLES on screen at all: ${allOn.length}/${zRows.length} samples`);
console.log('shots written:', shots);
fs.writeFileSync(`qa-out/rf-face2/${WORLD}.json`, JSON.stringify(log, null, 1));
await b.close();

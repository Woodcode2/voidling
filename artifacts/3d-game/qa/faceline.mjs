// THE FACE LINE-UP — every Hair x Hat, from the play camera (studio round 4, I-3)
//
//   node qa/faceline.mjs [port] [world] [--pitch=46,55,65] [--hat=cap,beanie]
//
// qa/faceray.mjs proves in node that every walking person has a face. This is
// the same question asked of the BUILD a child runs, and the frame a person
// reads to answer it — which is the half of Job 4 no number can close (the
// governor: "a person reads the line-up").
//
// For each hat (and none), nine people — one per hair style — are built by the
// game's own makePerson through `__life.person` (a QA hook in life.ts; no other
// way reaches makePerson from a page), stood in a 3x3 block just beyond the
// void, each turned to face the live camera, and photographed:
//   qa/out/faceline/<world>_<pitch>_<hat>.png   the block, at 3x
// Nothing about them is steered: they are not in `movers`, so no update
// rewrites their heading (retraction 9's trap in docs/GOVERNOR.md), and not in
// the edibles, so the void cannot eat the subject.
//
// ── THE THREE ANGLES, AND WHAT IS APPROXIMATE ABOUT THEM ────────────────────
// The render loop owns the camera, so the camera cannot be moved from a probe
// (personsheet.mjs's TRAP). 46 is the spawn camera itself. 55 and 65 are made
// by tipping each SUBJECT back about its feet, top away from the camera, by
// the difference — the head then meets the camera's rays at the steeper angle.
// The angle every verdict below reports is MEASURED, not assumed: the camera's
// position taken into each head's own frame, elevation and azimuth, so a tip
// that misses shows up as a number. What the tip cannot do is move the sun:
// on the tipped rows the key light falls on the face from a slightly different
// direction than it would under a steeper camera. Read those rows for where
// the eyes are, not for how the face is lit.
//
// ── THE VERDICT: SAME MEASURE AS faceray, ON THE REAL MESH ──────────────────
// Sample points on each eye's surface (the eye read out of life.ts, not
// copied into this file), facing the camera. A point is DRAWN if a ray from the
// camera to it lands on it on a bald reference head in the same pose (skull,
// eyes, mouth — the eye as a bald head shows it, with the part sunk into the
// skull already excluded). It LANDS ON INK if the ray lands on it on the real
// subject, hair and hat and all. Score = landed / drawn, weighted by how much
// screen each point covers, worse eye reported. Three's Raycaster against the
// shipped geometry honours PEOPLE_MAT's FrontSide, as the renderer does.
// Bar: 50% at every angle for every hat that qa/faceray.mjs does not exempt by
// name — the exemptions are read out of faceray.mjs, so the two probes cannot
// disagree about which hats are a convention.
//
// Clocks: every wait is on __matchState().t (the game's clock); the software
// renderer runs it ~14x slower than the wall (GOVERNOR rule 4).
import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';
import { enterMatch } from './_enter.mjs';

const pos = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const PORT = pos[0] || '4177';
const WORLD = pos[1] || 'maple';
const opt = (k) => { const a = process.argv.find((s) => s.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3).split(',') : null; };
const PITCHES = (opt('pitch') || ['46', '55', '65']).map(Number);
const OUT = 'qa/out/faceline';
mkdirSync(OUT, { recursive: true });
const BAR = 0.50;

// ── what to line up, read from the source ───────────────────────────────────
const SRC = readFileSync('src/proto3d/life.ts', 'utf8');
const need = (m, what) => { if (!m) throw new Error(`faceline: could not find ${what} in life.ts — the call site moved`); return m; };
const union = (name) => need(SRC.match(new RegExp(`export type ${name} =([^;]*);`)), `type ${name}`)[1]
  .replace(/\/\/[^\n]*/g, '').match(/'([a-z]+)'/g).map((s) => s.slice(1, -1));
const HAIRS = union('Hair');
const HATS = [null, ...union('Hat')].filter((h) => !opt('hat') || opt('hat').includes(String(h)));
const eyeM = need(SRC.match(/for \(const (\w+) of \[\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\]\)\s*\{?\s*hp\.push\(pc\(B\.dot,\s*INK,\s*\1,\s*([^)]*)\)\)/),
  'the eye statement');
const [ey, ez, esx, esy = esx, esz = esx] = eyeM[4].split(',').map((s) => parseFloat(s));
const EYE = { x: Math.max(parseFloat(eyeM[2]), parseFloat(eyeM[3])), y: ey, z: ez, ax: esx / 2, ay: esy / 2, az: esz / 2 };
if (Object.values(EYE).some(Number.isNaN)) throw new Error(`faceline: the eye did not parse: ${eyeM[0]}`);
const CONV = Object.keys(Object.fromEntries([...need(readFileSync('qa/faceray.mjs', 'utf8')
  .match(/const CONVENTION = \{([\s\S]*?)\n\};/), 'faceray.mjs CONVENTION')[1].matchAll(/^\s*(\w+):/gm)].map((m) => [m[1], 1])));

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
p.setDefaultTimeout(400000);
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
  localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark'); } catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await enterMatch(p, WORLD);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
await p.mouse.click(215, 700).catch(() => {});
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 2.0, null, { timeout: 400000, polling: 200 });

if (!(await p.evaluate(() => typeof window.__life?.person === 'function'))) {
  console.log('FAIL — this build has no __life.person hook, so the line-up cannot be built (life.ts, studio round 4 I-3)');
  await b.close(); process.exit(1);
}
// the HUD off with a marked class and an !important sheet — addCoins rewrites
// inline styles (qa/shippedlook.mjs, Job 0)
await p.evaluate(() => {
  const cv = document.querySelector('canvas');
  for (const el of Array.from(document.body.children)) if (el !== cv && !el.contains(cv)) el.setAttribute('data-qahide', '');
  const st = document.createElement('style'); st.textContent = '[data-qahide]{display:none !important}';
  document.head.appendChild(st);
  window.__calm?.();
  if (typeof window.__settleCam === 'function') window.__settleCam(4);
});
const frame = async (dt) => { const t0 = await p.evaluate(() => window.__matchState().t);
  await p.waitForFunction((t) => window.__matchState().t > t, t0 + dt, { timeout: 400000 }).catch(() => {}); };
await frame(0.15);

const rows = [];
let bad = 0, offAngle = 0, noSamples = 0;
for (const pitch of PITCHES) {
  for (const hat of HATS) {
    const r = await p.evaluate(({ hat, hairs, pitch, EYE }) => {
      const THREE = window.__THREE, cam = window.__cam, scene = window.__scene, vs = window.__voidState();
      cam.updateMatrixWorld(true);
      const C = new THREE.Vector3().setFromMatrixPosition(cam.matrixWorld);
      // ground axes of the view: F away from the camera, L across it
      const F = new THREE.Vector3(vs.x - C.x, 0, vs.z - C.z).normalize();
      const L = new THREE.Vector3(-F.z, 0, F.x);
      const centre = new THREE.Vector3(vs.x, 0, vs.z).addScaledVector(F, 5 + vs.r);
      const angleOf = (head) => {
        const v = head.worldToLocal(C.clone()).normalize();
        return { el: THREE.MathUtils.radToDeg(Math.asin(v.y)), az: THREE.MathUtils.radToDeg(Math.atan2(v.x, v.z)) };
      };
      const people = [];
      const ref = window.__life.person({ hair: 'bald', hat: null });
      hairs.forEach((hair, i) => {
        const g = window.__life.person({ hair, hat });
        const at = centre.clone().addScaledVector(L, ((i % 3) - 1) * 2.0).addScaledVector(F, (Math.floor(i / 3) - 1) * 3.6);
        g.position.copy(at);
        const yaw = Math.atan2(C.x - at.x, C.z - at.z);
        g.rotation.set(0, yaw, 0, 'YXZ');
        scene.add(g); g.updateMatrixWorld(true);
        // tip the subject back by whatever this head still needs to meet the
        // camera at `pitch`; two passes, because tipping moves the head too
        for (let k = 0; k < 2; k++) {
          const a = angleOf(g.getObjectByName('head'));
          g.rotation.x -= THREE.MathUtils.degToRad(pitch - a.el);
          g.updateMatrixWorld(true);
        }
        people.push({ hair, g });
      });
      // ── the measure, per person, per eye ──
      const rc = new THREE.Raycaster();
      const out = [];
      for (const { hair, g } of people) {
        const head = g.getObjectByName('head');
        ref.position.copy(g.position); ref.rotation.copy(g.rotation); ref.updateMatrixWorld(true);
        const refHead = ref.getObjectByName('head');
        const eyes = [];
        for (const sx of [-1, 1]) {
          let drawn = 0, landed = 0;
          for (let i = 0; i < 24; i++) for (let j = 0; j < 48; j++) {
            const th = Math.PI * (i + 0.5) / 24, ph = 2 * Math.PI * (j + 0.5) / 48;
            const d = new THREE.Vector3(Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph));
            const local = new THREE.Vector3(sx * EYE.x + EYE.ax * d.x, EYE.y + EYE.ay * d.y, EYE.z + EYE.az * d.z);
            const nrm = new THREE.Vector3(d.x / EYE.ax, d.y / EYE.ay, d.z / EYE.az).normalize();
            const P = head.localToWorld(local.clone());
            const N = nrm.transformDirection(head.matrixWorld);
            const toCam = C.clone().sub(P).normalize();
            const facing = N.dot(toCam); if (facing <= 0) continue;
            const w = Math.sin(th) * facing;
            const dir = P.clone().sub(C).normalize();
            rc.set(C, dir);
            const Pref = refHead.localToWorld(local.clone());
            const h0 = rc.intersectObject(ref, true)[0];
            if (!h0 || h0.point.distanceTo(Pref) > 0.012) continue;
            drawn += w;
            const h1 = rc.intersectObject(g, true)[0];
            if (h1 && h1.point.distanceTo(P) <= 0.012) landed += w;
          }
          eyes.push(drawn > 0 ? landed / drawn : NaN);
        }
        const a = angleOf(head);
        out.push({ hair, eye: Math.min(...eyes), el: a.el, az: a.az, drawn: eyes.every((e) => !Number.isNaN(e)) });
      }
      // where the block is on screen, for the shutter
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const { g } of people) {
        const bb = new THREE.Box3().setFromObject(g);
        for (const y of [bb.min.y, bb.max.y]) for (const x of [bb.min.x, bb.max.x]) for (const z of [bb.min.z, bb.max.z]) {
          const v = new THREE.Vector3(x, y, z).project(cam);
          const sx = (v.x * 0.5 + 0.5) * innerWidth, sy = (-v.y * 0.5 + 0.5) * innerHeight;
          x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
        }
      }
      window.__faceline = people.map((q) => q.g);
      ref.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
      return { out, box: { x0, y0, x1, y1 } };
    }, { hat, hairs: HAIRS, pitch, EYE });
    await frame(0.1);
    const pad = 8;
    const x = Math.max(0, Math.floor(r.box.x0) - pad), y = Math.max(0, Math.floor(r.box.y0) - pad);
    const w = Math.min(430 - x, Math.ceil(r.box.x1 - r.box.x0) + 2 * pad), h = Math.min(932 - y, Math.ceil(r.box.y1 - r.box.y0) + 2 * pad);
    const file = `${OUT}/${WORLD}_${pitch}_${hat || 'none'}.png`;
    if (w > 10 && h > 10) await p.screenshot({ path: file, clip: { x, y, width: w, height: h } });
    else console.log(`  ! ${hat || 'none'} at ${pitch}: the block is off screen (${JSON.stringify(r.box)}) — no frame`);
    await p.evaluate(() => { for (const g of window.__faceline || []) {
      window.__scene.remove(g); g.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }); } window.__faceline = []; });
    const conv = hat && CONV.includes(hat);
    for (const o of r.out) {
      if (Math.abs(o.el - pitch) > 2 || Math.abs(o.az) > 3) offAngle++;
      if (!o.drawn) noSamples++;
      if (!conv && !(o.eye >= BAR)) bad++;
    }
    rows.push({ pitch, hat: hat || 'none', conv, out: r.out, file });
    console.log(`  ${String(pitch).padStart(2)}°  ${(hat || 'none').padEnd(8)}${conv ? '(convention) ' : ''}`
      + r.out.map((o) => `${o.hair} ${Number.isNaN(o.eye) ? '-' : Math.round(100 * o.eye)}`).join(' · ')
      + `   [measured ${Math.min(...r.out.map((o) => o.el)).toFixed(1)}-${Math.max(...r.out.map((o) => o.el)).toFixed(1)}°]`);
  }
}
await b.close();
const n = rows.reduce((s, r) => s + r.out.length, 0);
const nConv = rows.filter((r) => r.conv).reduce((s, r) => s + r.out.length, 0);
console.log(`\n  frames: ${OUT}/${WORLD}_<pitch>_<hat>.png — A PERSON READS THESE: does every face have two eyes and a mouth?`);
if (noSamples) console.log(`FAIL — ${noSamples} of ${n} heads gave no eye samples on the bald reference: the head or the eye moved, and nothing below means anything`);
else if (offAngle) console.log(`FAIL — ${offAngle} of ${n} heads met the camera more than 2 degrees off the asked pitch or 3 off square; the tip missed, so the angle columns are not what they say`);
else if (bad) console.log(`FAIL — ${bad} of ${n - nConv} heads (not under a named convention) show less than ${BAR * 100}% of an eye from the live camera`);
else console.log(`PASS — every head outside the named conventions shows at least ${BAR * 100}% of each eye from the live camera at ${PITCHES.join('/')} degrees (${n} heads, ${nConv} under a convention)`);
process.exit(noSamples || offAngle || bad ? 1 : 0);

// ── HOW FAR MUST THE HERO STEP TO GET HIS FACE BACK ON THE SHIPPED MENU? ─────
//
// qa/_dioocc.mjs, both clocks pinned: on the menu that ships today the hero is
// 100% behind something on pirate, lantern and powder, and 44.8% on maple. He
// stands on the stage point and deriveStage sets that to the world's landmark,
// so he is inside the thing the shot is aimed at.
//
// DIO_MARK = 16 fixes this on the diorama and is `dio ? DIO_MARK : 0`, so it is
// zero here. The obvious move is to give the shipped menu a mark too — but the
// right size cannot be derived with confidence, because the shipped camera's own
// comment says 32 degrees while `h = dist * 0.62` implies 38.3. So sweep it.
//
// Two things have to come back at once, which is why this measures both:
//   COVERED  — how much of him is behind something, the thing we are fixing
//   FOOT y   — where his feet land in CSS px; the ladder panel's top edge is at
//              ~y536 of 932, and a mark that clears the landmark by burying him
//              in the panel is not a fix.
//
// ── MEASURED. THE STEP CANNOT FIX THE SHIPPED MENU. ─────────────────────────
//
// All six worlds, both clocks pinned. % of the hero covered:
//
//   world       m0     m4     m8    m12    m16    m20
//   pirate     100    100   97.1   87.5   43.5   21.3
//   lantern    100    100    100   56.5   12.9      0
//   powder     100    100    100   32.9      0      0
//   maple     55.3   63.3   41.3    5.2    3.2      0
//   gameday      0      0   14.3   54.9   90.7   35.1
//   skylark    0.5      0      0      0      0      0
//
// His feet, CSS y, against the ladder panel's top edge at 536:
//
//   pirate     322    371    423    479    541    607
//   lantern    321    366    413    464    517    576
//   powder     322    368    418    471    528    591
//   maple      300    370    447    533    629    738
//   gameday    321    366    413    464    518    577
//   skylark    389    429    472    518    568    621
//
// NO GLOBAL MARK WORKS, and the reason is gameday. It is the one world that is
// already clear at m0, and the mark WALKS HIM INTO SOMETHING: 0 -> 14.3 -> 54.9
// -> 90.7. A constant that rescues powder breaks the world that was fine. The
// diorama's "one constant clears every measured case" is true of the diorama's
// camera and does not port to this one.
//
// NO PER-WORLD MARK WORKS EITHER, on three of the six, because the two
// constraints pull opposite ways — every step that clears the landmark walks him
// further down the frame and into the ladder panel:
//
//   powder    mark 16   0% covered, feet y528     OK
//   gameday   mark  0   0% covered, feet y321     OK, unchanged
//   skylark   mark  0   0.5% covered, feet y389   OK, unchanged
//   pirate    nothing   best 21.3% and feet y607  FAILS BOTH
//   lantern   nothing   reaches 0% only at m20, feet y576, behind the panel
//   maple     nothing   reaches 0% only at m20, feet y738, far behind it
//
// SO THE AIM HAS TO MOVE, not the hero. deriveStage points the shot at the
// world's landmark and enterMenu parks him on that same point; while those two
// are the same point, clearing one costs the other. That is a per-world
// composition change to the first screen a child sees — the DIO_AIM mechanism,
// applied to the shipped menu — and it is the owner's call, not a probe's.
//
//   node qa/_marksweep.mjs [port] [world]
import { chromium } from 'playwright';

const PORT = process.argv[2] || '4177';
const WORLDS = process.argv[3] ? [process.argv[3]] : ['pirate', 'lantern', 'powder', 'maple', 'gameday', 'skylark'];
const MARKS = [0, 4, 8, 12, 16, 20];
const PANEL_Y = 536;

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const out = [];
try {
for (const w of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  p.on('pageerror', (e) => console.log(`  [pageerror ${w}] ` + e.message.split('\n')[0]));
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try { localStorage.clear();
    localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1'); localStorage.setItem('voidMute','1');
    localStorage.setItem('voidUnlocked','maple,pirate,gameday,lantern,powder,skylark'); } catch {} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${w}&manual=1&dio=0`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__menuState && window.__menuState().menuMode, null, { timeout: 420000 });
  await p.waitForTimeout(20000);
  // both clocks pinned, same as _dioocc: a fixed point in GAME time, then freeze
  await p.waitForFunction(() => window.__menuState().menuT >= 4, null, { timeout: 420000 });

  for (const mk of MARKS) {
    await p.evaluate((m) => { window.__menuMark(m); window.__menuFreeze(0); }, mk);
    await p.waitForFunction(() => {
      const s = window.__menuState();
      return s.azimuth !== null && Math.abs(s.azimuth - s.a0) < 0.01;
    }, null, { timeout: 180000 });
    const r = await p.evaluate(() => {
      const T = window.__THREE, cam = window.__cam, scene = window.__scene;
      const vg = window.__voidGroup();
      let bob = null;
      vg.traverse((o) => { const q = o.geometry && o.geometry.parameters;
        if (q && q.radius === 1 && q.widthSegments === 96 && q.heightSegments === 72) bob = o.parent; });
      if (!bob) return { error: 'body sphere not found' };
      bob.updateWorldMatrix(true, false);
      const ctr = new T.Vector3(), sc = new T.Vector3();
      bob.matrixWorld.decompose(ctr, new T.Quaternion(), sc);
      const HR = sc.y, camD = cam.position.distanceTo(ctr);
      const axis = new T.Vector3().subVectors(ctr, cam.position).normalize();
      const up = new T.Vector3(0, 1, 0).projectOnPlane(axis).normalize();
      const right = new T.Vector3().crossVectors(axis, up).normalize();
      // candidates: anything whose SPHERE reaches between the lens and his far face
      const cand = [], bs = new T.Sphere(), tmp = new T.Vector3();
      scene.traverse((o) => {
        if (!o.isMesh || o === bob) return;
        for (let a = o; a; a = a.parent) if (!a.visible) return;
        if (vg === o || (function up2(x){ for (let a=x;a;a=a.parent) if (a===vg) return true; return false; })(o)) return;
        if (!o.geometry) return;
        if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
        if (!o.geometry.boundingSphere) return;
        bs.copy(o.geometry.boundingSphere).applyMatrix4(o.matrixWorld);
        tmp.subVectors(bs.center, cam.position);
        const t = tmp.dot(axis);
        if (t + bs.radius <= 0 || t - bs.radius >= camD + HR) return;
        const perp = Math.sqrt(Math.max(0, tmp.lengthSq() - t * t));
        if (perp > HR + bs.radius) return;
        cand.push(o);
      });
      const rc = new T.Raycaster(); rc.layers.set(0);
      const N = 25; let tried = 0, blocked = 0; const by = {};
      for (let iy = 0; iy < N; iy++) for (let ix = 0; ix < N; ix++) {
        const u = (ix / (N - 1)) * 2 - 1, v = (iy / (N - 1)) * 2 - 1;
        if (u * u + v * v > 1) continue;
        tried++;
        const k = Math.sqrt(Math.max(0, 1 - (u * u + v * v)));
        const surf = ctr.clone().addScaledVector(right, u * HR).addScaledVector(up, v * HR).addScaledVector(axis, -k * HR);
        const d = new T.Vector3().subVectors(surf, cam.position); const len = d.length();
        d.multiplyScalar(1 / len);
        rc.set(cam.position.clone(), d); rc.near = 0.1; rc.far = len - 0.05;
        const hits = rc.intersectObjects(cand, false);
        if (hits.length) { blocked++;
          const nm = hits[0].object.name || hits[0].object.parent?.name || hits[0].object.type;
          by[nm] = (by[nm] || 0) + 1; }
      }
      // his FEET on screen, in CSS px from the top
      const foot = ctr.clone().addScaledVector(new T.Vector3(0, 1, 0), -HR).project(cam);
      const worst = Object.entries(by).sort((a, b) => b[1] - a[1])[0];
      return { mark: window.__dioMark(), camD: +camD.toFixed(1),
        coveredPct: tried ? +(100 * blocked / tried).toFixed(1) : 0,
        footY: Math.round((1 - foot.y) * 0.5 * 932),
        worst: worst ? `${worst[0]} x${worst[1]}` : null };
    });
    out.push({ w, ...r });
    const under = r.footY > PANEL_Y;
    console.log(`  ${w.padEnd(8)} mark ${String(mk).padStart(2)}  covered ${String(r.coveredPct).padStart(5)}%  feet y${String(r.footY).padStart(4)}${under ? ' <-- BEHIND THE LADDER PANEL' : ''}  ${r.worst || ''}`);
  }
  await p.close();
}
} finally { await b.close(); }

console.log('\nworld     ' + MARKS.map((m) => ('m' + m).padStart(7)).join('') + '     (% of him covered)');
for (const w of WORLDS) {
  const r = MARKS.map((m) => { const x = out.find((o) => o.w === w && o.mark === m); return x ? String(x.coveredPct).padStart(7) : '      ?'; });
  console.log(w.padEnd(10) + r.join(''));
}
console.log('\nworld     ' + MARKS.map((m) => ('m' + m).padStart(7)).join('') + '     (feet, CSS y; panel edge 536)');
for (const w of WORLDS) {
  const r = MARKS.map((m) => { const x = out.find((o) => o.w === w && o.mark === m); return x ? String(x.footY).padStart(7) : '      ?'; });
  console.log(w.padEnd(10) + r.join(''));
}
// THE SMALLEST MARK THAT CLEARS EVERY WORLD WITHOUT BURYING HIM
const ok = MARKS.filter((m) => WORLDS.every((w) => {
  const x = out.find((o) => o.w === w && o.mark === m);
  return x && !x.error && x.coveredPct <= 5 && x.footY <= PANEL_Y;
}));
console.log(ok.length
  ? `\nPASS — mark ${ok[0]} clears every world under 5% covered with his feet above y${PANEL_Y}`
  : `\nFAIL — no swept mark clears every world; the step alone does not fix this`);
process.exit(ok.length ? 0 : 1);

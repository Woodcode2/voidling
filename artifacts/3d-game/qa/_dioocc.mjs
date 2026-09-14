// ── IS ANYTHING STANDING IN FRONT OF THE HERO ON THE MENU? ──────────────────
//
// docs/DIORAMA-BRIEF.md §14: on powder and lantern a building renders across the
// hero at the diorama camera, and on pirate a palm frond crosses his face. Right
// now that is something I LOOKED AT. This makes it a number, so the fix has a
// before and an after instead of two opinions.
//
// ── THE FIRST VERSION OF THIS PROBE WAS WRONG, AND WHY IS THE POINT ─────────
//
// It ported qa/occlusion.mjs's O3: five renders of one frame, and the hero's
// visibility as his LUMINANCE CONTRIBUTION (how far each of his pixels moves when
// he is hidden) over that same contribution with the occluder removed. On powder
// — the world whose photograph plainly shows a lodge roof across his face — it
// reported **102.4% visible** and printed PASS.
//
// Two separate faults, both instructive:
//
//   1. THE DENOMINATOR HID ONE MESH. A raycast names the FIRST mesh in the way
//      and the probe switched that off. A lodge is not one mesh. Most of the
//      building was still there in the "occluder removed" render, so numerator
//      and denominator were nearly the same frame and the ratio went to 1 — and
//      past it, because removing one mesh also changes the backdrop BEHIND him,
//      which moves the denominator in either direction.
//
//   2. A LUMINANCE TEST CANNOT SEE THIS SYMPTOM AT ALL. The void is drawn with an
//      x-ray ghost (void3d.ts, `occludedSilhouette`, depthFunc GreaterDepth) so a
//      child never loses her character behind scenery. It is working. So he DOES
//      reach the screen through the lodge, his pixels DO move when he is hidden,
//      and "can you see him" is honestly ~100%. The thing that is wrong on powder
//      is not that he is invisible — it is that a building is drawn ACROSS him
//      and reads as a rendering fault. That is a GEOMETRY question, not a pixel
//      one, and no colour test will ever answer it.
//
// So this asks the geometric question directly: over a grid of samples across his
// projected disc, cast a ray from the lens and ask whether the scene's triangles
// stop it before it reaches his surface. Colour-blind, ghost-blind, and unmoved by
// how many meshes an occluder happens to be built from.
//
// Candidates are pre-filtered the way fadeOccluders filters them — along the
// camera->hero axis, within a perpendicular reach — because raycasting ~3000
// meshes by 450 rays is not a thing to do once per world, let alone twelve times.
//
//   node qa/_dioocc.mjs [port] [world]
import { chromium } from 'playwright';

const PORT = process.argv[2] || '4177';
const WORLDS = process.argv[3] ? [process.argv[3]] : ['maple', 'pirate', 'gameday', 'lantern', 'powder', 'skylark'];

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const rows = [];
try {
for (const w of WORLDS) for (const dio of [1, 0]) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  p.on('pageerror', (e) => console.log(`  [pageerror ${w}] ` + e.message.split('\n')[0]));
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try { localStorage.clear();
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidMute', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
    localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
  } catch {} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${w}&manual=1&dio=${dio}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__menuState && window.__menuState().menuMode, null, { timeout: 420000 });
  await p.waitForTimeout(20000);   // the GLB landmarks load async under software GL
  // PIN THE PENDULUM, same as _dioful. This probe has none of its own protection
  // against the menu's +/-7 degree drift, which runs on GAME time while the wait
  // above is WALL clock — so every number it has ever printed was taken at an
  // unknown azimuth. That is fatal here in a way it is not for area: this bar sits
  // at 5% and pirate reads 5.7, so drift alone can move a world across it.
  // Wait on the CAMERA, not on menuT: __menuFreeze writes menuT synchronously and
  // stageCam.az is only recomputed inside the frame loop.
  await p.evaluate(() => window.__menuFreeze(0));
  await p.waitForFunction(() => {
    const m = window.__menuState();
    return m.azimuth !== null && Math.abs(m.azimuth - m.a0) < 0.01;
  }, null, { timeout: 180000 });

  // OCCLUSION ON THIS MENU IS A DISTRIBUTION, NOT A NUMBER. The crowd is alive
  // here — prototype3d.ts:1374 exists only to stop it panicking on the menu — so
  // people walk in front of the hero and away again. With the camera frozen and
  // the world identical, two runs still disagreed: maple 7.0% then 0%, and on the
  // shipped menu 47.6% then 16.6%, while skylark's candidate list went 36 then 51.
  // A frozen camera cannot explain a changing candidate list; a moving crowd can.
  // So one shot cannot grade this, and a 5% bar on one shot is a coin toss near
  // the line. Take several within ONE page load and report the spread.
  const SAMPLES = 5, GAP = 1500;
  const shots = [];
  for (let k = 0; k < SAMPLES; k++) {
    if (k) await p.waitForTimeout(GAP);
    shots.push(await p.evaluate(() => {
    const T = window.__THREE, cam = window.__cam, scene = window.__scene;
    const vs = window.__voidState(), vg = window.__voidGroup();

    // HIS SURFACE, from the body mesh's own world scale — not voidling.radius.
    // dispR is a spring, so the two differ whenever he is changing size, and the
    // mesh is what a ray would actually hit.
    let bob = null;
    vg.traverse((o) => { const q = o.geometry && o.geometry.parameters;
      if (q && q.radius === 1 && q.widthSegments === 96 && q.heightSegments === 72) bob = o.parent; });
    if (!bob) return { error: 'body sphere not found' };
    bob.updateWorldMatrix(true, false);
    const ctr = new T.Vector3(), sc = new T.Vector3();
    bob.matrixWorld.decompose(ctr, new T.Quaternion(), sc);
    const HR = sc.y;                       // his world radius
    const camD = cam.position.distanceTo(ctr);

    // ── CANDIDATES: what could possibly be in the way ────────────────────────
    // The same filter fadeOccluders uses — distance ALONG the camera->hero axis
    // inside (0, camD), and perpendicular distance from that axis within his
    // radius plus the object's own. Raycasting the whole scene per ray is not
    // affordable; this leaves a handful of meshes.
    const axis = new T.Vector3().subVectors(ctr, cam.position).multiplyScalar(1 / camD);
    const cand = [];
    const tmp = new T.Vector3(), bs = new T.Sphere();
    scene.traverse((o) => {
      if (!o.isMesh || !o.geometry || !o.material) return;
      let a = o, shown = true;
      while (a) { if (!a.visible) { shown = false; break; } a = a.parent; }
      if (!shown || vg.getObjectById(o.id)) return;
      if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
      if (!o.geometry.boundingSphere) return;
      bs.copy(o.geometry.boundingSphere).applyMatrix4(o.matrixWorld);
      tmp.subVectors(bs.center, cam.position);
      const t = tmp.dot(axis);
      // THE NEAR FACE IS WHAT OCCLUDES, NOT THE CENTRE. This test used to be
      // `t <= 0 || t >= camD + HR`, which drops a prop whose bounding-sphere
      // CENTRE is past the hero even when its near face is still between him and
      // the lens. That is the exact bug that was found and fixed in the shipped
      // fadeOccluders (src/prototype3d.ts:1925) after it was measured skipping
      // Powder's lodge, Lantern's pagoda and Pirate's palm; the probe kept the
      // broken form and so could not have seen those three either. A prop is out
      // of the running only if it is WHOLLY behind the lens or WHOLLY past the
      // hero's far surface. Being generous here costs nothing but time: the
      // raycast below has rc.far = len - 0.05, so a prop that does not actually
      // reach him cannot register a hit.
      if (t + bs.radius <= 0 || t - bs.radius >= camD + HR) return;
      const perp = Math.sqrt(Math.max(0, tmp.lengthSq() - t * t));
      if (perp > HR + bs.radius) return;
      cand.push(o);
    });

    // ── THE SAMPLES: a grid across his projected disc ────────────────────────
    // Screen-space, so every sample is a pixel a child could be looking at, and
    // the count is independent of how big he happens to be.
    const right = new T.Vector3().crossVectors(axis, new T.Vector3(0, 1, 0)).normalize();
    const up = new T.Vector3().crossVectors(right, axis).normalize();
    const N = 25;
    let tried = 0, blocked = 0;
    const by = Object.create(null);
    const rc = new T.Raycaster();
    rc.layers.set(0);
    for (let iy = 0; iy < N; iy++) for (let ix = 0; ix < N; ix++) {
      const u = (ix / (N - 1)) * 2 - 1, v = (iy / (N - 1)) * 2 - 1;
      if (u * u + v * v > 1) continue;                       // outside the disc
      tried++;
      // the point on his sphere this sample sees: offset across the view plane,
      // then pulled toward the lens by the sphere's own bulge, so the ray is
      // stopped at his SURFACE rather than at his centre
      const k = Math.sqrt(Math.max(0, 1 - (u * u + v * v)));
      const surf = ctr.clone()
        .addScaledVector(right, u * HR)
        .addScaledVector(up, v * HR)
        .addScaledVector(axis, -k * HR);
      const d = new T.Vector3().subVectors(surf, cam.position);
      const len = d.length();
      d.multiplyScalar(1 / len);
      rc.set(cam.position.clone(), d);
      rc.near = 0.1; rc.far = len - 0.05;                    // stop short of him
      const hits = rc.intersectObjects(cand, false);
      if (hits.length) {
        blocked++;
        const nm = hits[0].object.name || hits[0].object.parent?.name || hits[0].object.type;
        by[nm] = (by[nm] || 0) + 1;
      }
    }
    const worst = Object.entries(by).sort((a, b) => b[1] - a[1])[0];
    return {
      // HOW FAR THE DIORAMA STEPPED HIM OFF THE STAGE POINT. Reported next to the
      // coverage it is meant to fix, so a run where the step silently did not
      // happen reads as "mark 0, still covered" rather than as a mystery.
      mark: window.__dioMark ? window.__dioMark() : -1,
      camD: +camD.toFixed(1), heroR: +HR.toFixed(2), candidates: cand.length,
      samples: tried, blocked,
      coveredPct: tried ? +(100 * blocked / tried).toFixed(1) : 0,
      worst: worst ? `${worst[0]} x${worst[1]}` : null,
    };
  }));
  }
  const err = shots.find((x) => x.error);
  const pcts = shots.map((x) => x.coveredPct).sort((a, b) => a - b);
  const med = pcts.length ? pcts[Math.floor(pcts.length / 2)] : 0;
  const byName = {};
  for (const x of shots) if (x.worst) { const n = x.worst.split(' x')[0]; byName[n] = (byName[n] || 0) + 1; }
  const modal = Object.entries(byName).sort((a, b) => b[1] - a[1])[0];
  const r = err ? { error: err.error } : {
    ...shots[shots.length - 1],
    // THE MEDIAN IS THE VERDICT. min and max are printed so a world that is clear
    // half the time and buried the other half cannot hide behind either one.
    coveredPct: med, lo: pcts[0], hi: pcts[pcts.length - 1],
    spread: +(pcts[pcts.length - 1] - pcts[0]).toFixed(1),
    worst: modal ? `${modal[0]} in ${modal[1]}/${SAMPLES}` : null,
  };
  rows.push({ w, dio, ...r });
  if (r.error) { console.log(`  ${w.padEnd(8)} dio=${dio}  ERROR ${r.error}`); await p.close(); continue; }
  console.log(`  ${w.padEnd(8)} dio=${dio}  camD ${String(r.camD).padStart(5)}  mark ${String(r.mark).padStart(3)}  ${String(r.candidates).padStart(3)} could block  median ${String(r.coveredPct).padStart(5)}%  (${r.lo}-${r.hi}, spread ${r.spread})  ${r.worst ? '<- ' + r.worst : ''}`);
  await p.close();
}
} finally { await b.close(); }

console.log('\nworld     % of the hero with something in front of him');
console.log('          diorama, median (min-max) -> today, median (min-max)      what is in the way');
let bad = 0;
for (const w of WORLDS) {
  const a = rows.find((r) => r.w === w && r.dio === 1), c = rows.find((r) => r.w === w && r.dio === 0);
  if (!a || !c || a.error || c.error) continue;
  // 5%, not a quarter. The first version of this bar used 25% because that was
  // where the photographs started to look like a fault — but a bar set at the
  // point where damage becomes VISIBLE banks the damage below it. docs/
  // DIORAMA-BRIEF.md §17.2 states the honest target: <= 5% on all six worlds.
  const flag = a.coveredPct > 5;
  if (flag) bad++;
  console.log(`${w.padEnd(9)} ${String(a.coveredPct).padStart(5)}% (${String(a.lo).padStart(4)}-${String(a.hi).padStart(5)}) -> ${String(c.coveredPct).padStart(5)}% (${String(c.lo).padStart(4)}-${String(c.hi).padStart(5)})   ${(a.worst || 'nothing').padEnd(22)}${flag ? ' <-- BROKEN' : ''}`);
}
// SILENCE IS FAILURE. Errored rows are skipped by the loop above, so without
// this a run where every world threw would leave `bad` at 0 and print PASS over
// zero measurements — a probe reporting good news about something it never
// looked at. Count what was actually graded and say so.
const graded = WORLDS.filter((w) => {
  const a = rows.find((r) => r.w === w && r.dio === 1), c = rows.find((r) => r.w === w && r.dio === 0);
  return a && c && !a.error && !c.error;
});
const missing = WORLDS.filter((w) => !graded.includes(w));
if (missing.length) {
  console.log(`\nFAIL — ${missing.length} world(s) produced no measurement: ${missing.join(', ')}`);
  process.exit(1);
}
console.log(bad
  ? `\nFAIL — ${bad} world(s) have something across more than 5% of the hero on the diorama`
  : `\nPASS — under 5% of the hero is behind anything, on all ${graded.length} world(s) measured`);
process.exit(bad ? 1 : 0);

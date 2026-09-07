// qa/occlusion.mjs — CAN THE PLAYER SEE THE HERO?
//
// Round 7, stream D. Written before the fix and required to fail on the tree as
// it stands.
//
//   node qa/occlusion.mjs [world] [port] [gameSeconds]
//
// The game has a camera-occlusion fade (prototype3d.ts fadeOccluders): a prop
// standing between the lens and the void dissolves to a 62%-solid ghost so the
// hero is never lost behind scenery. Its own comment records why it exists —
// "3-13% of sampled frames per world hid a quarter or more of the void behind
// scenery, and both Maple and Lantern produced a frame inside the first FORTY
// SECONDS where it was 100% invisible" — and it carries an elaborate tuning
// history: a Bayer keep-mask argument, a killed cone-taper, a measured 0.62.
//
// A spawn frame then showed the hero ENTIRELY behind a solid, undithered maple
// canopy. So either the mechanism does not run, or it does not do enough. This
// probe separates those two questions, and neither answer shares any arithmetic
// with fadeOccluders itself:
//
//   O2  when the hero is genuinely blocked, is ANYTHING fading?   (mechanism)
//   O3  at the worst moment, how much of him can you actually SEE? (outcome)
//
// O2's ground truth is a RAYCAST — a fan of rays from the lens at the hero's
// own silhouette, answered by the scene's triangles. O3's is FOUR renders of a
// single frame: nothing, the hero alone, the frame as it is, and the frame with
// the hero hidden. The first pair differ exactly where the hero is, which gives
// his silhouette by construction rather than by a colour guess; the second pair
// differ exactly where he reached the screen. Neither asks what colour anything
// is, and neither cares whether the thing in front of him is a prop, a rival or
// a hat — which the first version of this probe, hiding `__edibles` and calling
// the rest of the frame background, silently did.
//
// Note that O2 and O3 can disagree, and that is the point: a ghosted prop still
// has triangles, so making the fade fire cannot move a raycast. Only pixels can
// say whether a child can see their character.
//
// The renderer is stubbed for the drive, as in qa/_worldshots.mjs: the software
// renderer runs the sim ~20x slower than the wall clock and the raycast audit
// needs no frame drawn. fadeOccluders lives in the game loop, not in render(),
// so stubbing does not disturb what is under test.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const WORLD = process.argv[2] || 'maple';
const PORT = process.argv[3] || '4177';
const SECONDS = Number(process.argv[4] || 40);
const OUT = 'qa-out/occ';
mkdirSync(OUT, { recursive: true });

const BARS = {
  O2: { what: 'blocked frames in which something is fading', want: '>= 90%', cmp: (v) => v >= 90 },
  O3: { what: 'the hero you can see at his worst moment', want: '>= 60%', cmp: (v) => v >= 60 },
};

const pageLog = [];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
p.setDefaultTimeout(400000);
p.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') pageLog.push(m.text()); });
p.on('pageerror', (e) => pageLog.push('pageerror: ' + e.message));
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1400);
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });

// ── the structural fact, asked once, and reported rather than scored ────────
// fadeOccluders reads `e.mesh.userData.fade` and skips the prop when it is
// undefined. armFade() sets it on the merged MESH; 56 of the 58 prop factories
// return a GROUP wrapping that mesh, and addEdible() is handed the group. So
// this counts, per edible, what the loop can see and what is armed underneath.
// It is a diagnosis, not a bar: any threshold on it would be a restatement of
// whichever implementation happens to be in the tree.
const armed = await p.evaluate(() => {
  let n = 0, onTop = 0, deeper = 0;
  for (const e of window.__edibles) {
    if (e.eaten || !e.mesh) continue;
    n++;
    if (e.mesh.userData.fade !== undefined) { onTop++; continue; }
    let found = false;
    e.mesh.traverse((o) => { if (!found && o !== e.mesh && o.userData?.fade !== undefined) found = true; });
    if (found) deeper++;
  }
  return { n, onTop, deeper };
});

// ── the drive, with a per-frame raycast audit ──────────────────────────────
await p.evaluate((seconds) => {
  const T = window.__THREE, cam = window.__cam;
  const ray = new T.Raycaster();
  const audit = { frames: 0, worst: 0, sum: 0, blocked: 0, blockedFading: 0,
    everFaded: 0, done: false, t0: null, hold: false, misses: [] };
  window.__occ = audit;

  // 13 rays: the centre, four at 45% of his radius, eight at 85%. The disc is
  // perpendicular to the view direction and centred on the hero, so it is his
  // silhouette as the lens sees it, not a slice through the world.
  const RING = [[0, 0]];
  for (let i = 0; i < 4; i++) RING.push([Math.cos(i * Math.PI / 2) * 0.45, Math.sin(i * Math.PI / 2) * 0.45]);
  for (let i = 0; i < 8; i++) RING.push([Math.cos(i * Math.PI / 4) * 0.85, Math.sin(i * Math.PI / 4) * 0.85]);

  const dir = new T.Vector3(), right = new T.Vector3(), up = new T.Vector3();
  const hero = new T.Vector3(), target = new T.Vector3(), from = new T.Vector3(), aim = new T.Vector3();

  const cv = document.querySelector('canvas');
  const cx = innerWidth / 2, cy = innerHeight / 2;
  cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));

  // how blocked is the hero, right now, according to the triangles
  window.__blockedNow = () => {
    const vs = window.__voidState(), vg = window.__voidGroup();
    hero.set(vs.x, vg.position.y, vs.z);
    from.copy(cam.position);
    dir.copy(hero).sub(from);
    const camToHero = dir.length();
    if (camToHero < 1) return 0;
    dir.multiplyScalar(1 / camToHero);
    up.set(0, 1, 0);
    right.crossVectors(dir, up).normalize();
    up.crossVectors(right, dir).normalize();
    const near = [];
    for (const e of window.__edibles) {
      if (e.eaten || !e.mesh?.visible) continue;
      const m = e.mesh;
      const dx = m.position.x - vs.x, dz = m.position.z - vs.z;
      if (dx * dx + dz * dz > 3600) continue;                     // within 60 units of the hero
      if (m.position.distanceTo(from) - (e.radius + 8) >= camToHero) continue;
      near.push(m);
    }
    if (!near.length) return 0;
    let blocked = 0;
    for (const [a, c] of RING) {
      target.copy(hero).addScaledVector(right, a * vs.r).addScaledVector(up, c * vs.r);
      aim.copy(target).sub(from);
      const len = aim.length();
      ray.set(from, aim.multiplyScalar(1 / len));
      ray.far = len - 0.05;
      if (ray.intersectObjects(near, true).length) blocked++;
    }
    return 100 * blocked / RING.length;
  };

  // ── WHO BLOCKS HIM WHEN NOTHING IS FADING ─────────────────────────────────
  // O2's gap is frames where the triangles say he is covered and the game is
  // doing nothing about it. Naming the culprit is the whole diagnosis, and the
  // candidates look nothing alike: a prop armed nowhere (life.ts builds its
  // cars and people from plain materials), a prop the cylinder misses because
  // it measures from an origin at the foot of something tall, or scenery that
  // is not an edible at all and so was never in the search.
  window.__whoBlocks = () => {
    const vs = window.__voidState(), vg = window.__voidGroup();
    const c = new T.Vector3(vs.x, vg.position.y, vs.z);
    const len = cam.position.distanceTo(c);
    const d = new T.Vector3().subVectors(c, cam.position).multiplyScalar(1 / len);
    const rc = new T.Raycaster(cam.position.clone(), d, 0.1, len - 0.05);
    const all = [];
    scene.traverse((q) => {
      if (!q.isMesh || !q.visible || !q.geometry || !q.material) return;
      let a = q, shown = true;
      while (a) { if (!a.visible) { shown = false; break; } a = a.parent; }
      if (shown && !vg.getObjectById(q.id)) all.push(q);
    });
    const h = rc.intersectObjects(all, false)[0];
    if (!h) return null;
    let e = null, anc = h.object;
    while (anc && !e) { e = window.__edibles.find((x) => x.mesh === anc) || null; anc = anc.parent; }
    return { mat: h.object.material ? h.object.material.type : 'none',
      armed: h.object.userData.fade !== undefined,
      edible: !!e, r: e ? e.radius : null, reachable: !!(e && e.fadeTo),
      dist: +h.distance.toFixed(1), camToHero: +len.toFixed(1) };
  };

  // is the game fading anything at all, right now
  window.__fadingNow = () => {
    let n = 0;
    for (const e of window.__edibles) {
      if (e.eaten || !e.mesh) continue;
      let f = e.mesh.userData.fade;
      if (f === undefined) e.mesh.traverse((o) => {
        const g = o.userData?.fade; if (g !== undefined && (f === undefined || g < f)) f = g; });
      if (f !== undefined && f < 0.999) n++;
    }
    return n;
  };

  const tick = () => {
    if (audit.hold) { requestAnimationFrame(tick); return; }
    const ms = window.__matchState(), vs = window.__voidState();
    if (audit.t0 === null) audit.t0 = ms.t;
    if (ms.t - audit.t0 > seconds) { audit.done = true; return; }

    // drive at the nearest edible, exactly as qa/_worldshots.mjs does
    let best = null, bd = 1e9;
    for (const e of window.__edibles) {
      if (e.eaten || !e.mesh?.visible || e.radius > vs.r * 0.92) continue;
      const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
      const d = dx * dx + dz * dz; if (d < bd) { bd = d; best = { dx, dz }; }
    }
    if (best) { const m = Math.hypot(best.dx, best.dz) || 1;
      dispatchEvent(new PointerEvent('pointermove', { pointerId: 1,
        clientX: cx + best.dx / m * 110, clientY: cy + best.dz / m * 110, bubbles: true })); }

    const share = window.__blockedNow();
    const fading = window.__fadingNow();
    audit.frames++; audit.sum += share;
    if (share > audit.worst) audit.worst = share;
    if (fading) audit.everFaded++;
    if (share > 0) {
      audit.blocked++;
      if (fading) audit.blockedFading++;
      else if (audit.misses.length < 4) {
        const who = window.__whoBlocks();
        if (who) audit.misses.push(who);
      }
    }
    requestAnimationFrame(tick);
  };
  window.__RR = window.__renderer.render.bind(window.__renderer);
  window.__renderer.render = () => {};   // the sim, at its proper rate
  requestAnimationFrame(tick);
}, SECONDS);

await p.waitForFunction(() => window.__occ?.done === true, null, { timeout: 900000 });
const drive = await p.evaluate(() => ({
  frames: window.__occ.frames, worst: window.__occ.worst,
  mean: window.__occ.sum / Math.max(1, window.__occ.frames),
  blocked: window.__occ.blocked, blockedFading: window.__occ.blockedFading,
  everFaded: window.__occ.everFaded, misses: window.__occ.misses,
}));

// ── O3 NEEDS A MOMENT IT CAN REPRODUCE ─────────────────────────────────────
// The first version shot "the first frame where the raycast says 60% blocked",
// which sounds deterministic and is not: swiftshader's frame times vary, dt with
// them, and two builds of the same seeded world diverge within seconds. Before
// and after a fix the probe was shooting different scenes — one 62% blocked with
// 20,366 px of silhouette, the other 69% with 28,765 — and reporting the change
// as if it were the fix's doing. A number that moves when nothing moves is not a
// measurement.
//
// So the hero is now WALKED somewhere: pick the occluder by a rule the world
// decides (the lowest-indexed prop of at least 1.6 units within 90 of him), and
// steer him to the spot where that prop sits between him and the lens. The path
// there is still at the mercy of the frame rate; the place he ends up is not.
const walk = await p.evaluate(() => new Promise((done) => {
  const vs0 = window.__voidState();
  let pick = null;
  for (const e of window.__edibles) {
    if (e.eaten || !e.mesh?.visible || e.radius < 1.6) continue;
    const dx = e.mesh.position.x - vs0.x, dz = e.mesh.position.z - vs0.z;
    if (dx * dx + dz * dz > 8100) continue;
    pick = e; break;
  }
  if (!pick) { done({ ok: false, why: 'no prop of 1.6+ units within 90' }); return; }
  // the lens sits on the +x +z diagonal (camOffset 0.62, 0.92, 0.62), so the
  // hero belongs that far back along it from the prop. 4.4 units puts a canopy
  // centred ~4.6 up on the sight line of a camera raking down at about 46 deg.
  const k = Math.SQRT1_2 * 4.4;
  const tx = pick.mesh.position.x - k, tz = pick.mesh.position.z - k;
  const cv = document.querySelector('canvas');
  const cx = innerWidth / 2, cy = innerHeight / 2;
  cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
  const t0 = window.__matchState().t;
  const step = () => {
    const vs = window.__voidState();
    const dx = tx - vs.x, dz = tz - vs.z, d = Math.hypot(dx, dz);
    const t = window.__matchState().t;
    if (d < 0.8 || t - t0 > 40) { done({ ok: d < 0.8, d, took: t - t0, r: vs.r,
      prop: { x: pick.mesh.position.x, z: pick.mesh.position.z, radius: pick.radius } }); return; }
    dispatchEvent(new PointerEvent('pointermove', { pointerId: 1,
      clientX: cx + dx / d * 110, clientY: cy + dz / d * 110, bubbles: true }));
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}));

// ── O3: four renders of ONE frame ──────────────────────────────────────────
// The first version of this shot three Playwright screenshots with the world
// hidden differently each time, and the match clock moved 2:20 -> 2:19 between
// the first and the last: the camera had travelled, so the three masks were of
// three different compositions. These four renders happen inside a single
// synchronous evaluate, so the world cannot advance between them at all.
//
//   D  nothing drawn        (camera moved to an empty layer)
//   B  the hero alone       (his subtree added to that layer)
//   A  the frame as it is
//   C  the frame with the hero hidden
//
// B vs D is his silhouette, by construction — no colour test, and it does not
// care whether the thing in front of him is a prop, a rival or a hat. A vs C is
// where he actually reached the screen: a 62%-solid dither leaves 6/16 of its
// pixels showing him, and those pixels differ between A and C, so a ghosted
// occluder correctly counts as partly seen.
//
// All four go through renderer.render rather than the bloom composer. Bloom is
// a glow around him, it is the same in all four, and forcing one path is what
// makes them comparable.
const shot = await p.evaluate(() => {
  window.__occ.hold = true;
  const T = window.__THREE, cam = window.__cam, scene = window.__scene;
  const R = window.__renderer, gl = R.getContext();
  const vs = window.__voidState(), vg = window.__voidGroup();

  const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
  const grab = () => { const u = new Uint8Array(w * h * 4);
    window.__RR(scene, cam); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, u); return u; };

  // ── RENDER ONCE BEFORE ASKING ANYTHING ABOUT A SHADER ─────────────────────
  // The drive stubs renderer.render, and onBeforeRender only fires from inside
  // a render — so throughout the drive the fade hook never runs and every
  // material's uFade reads its initial 1, whatever the props' userData say.
  // The first version of this block asked before rendering and I read that 1 as
  // evidence that the uniform was being clobbered. It was evidence of the stub.
  window.__RR(scene, cam);

  const c = new T.Vector3(vs.x, vg.position.y, vs.z);
  const toCam = new T.Vector3().subVectors(cam.position, c).normalize();
  const right = new T.Vector3().crossVectors(toCam, new T.Vector3(0, 1, 0)).normalize();
  const na = c.clone().project(cam), nb = c.clone().addScaledVector(right, vs.r).project(cam);
  const blocked = window.__blockedNow(), fadingNow = window.__fadingNow();

  // WHY. A raycast down the centre names what is actually in the way — and this
  // time against EVERYTHING in the scene, not only the edibles, because "the
  // thing covering him is not a prop" is one of the answers.
  const why = [];
  const camToHero = cam.position.distanceTo(c);
  {
    const d = new T.Vector3().subVectors(c, cam.position).multiplyScalar(1 / camToHero);
    const rc = new T.Raycaster(cam.position.clone(), d.clone(), 0.1, camToHero - 0.05);
    rc.layers.set(0);
    // Meshes only, gathered by hand. intersectObject(scene, true) throws inside
    // three's own Sprite raycast on this scene ("Cannot read properties of null
    // (reading 'matrixWorld')"), and a probe that dies on the frame it exists to
    // explain is no probe.
    const all = [];
    scene.traverse((o) => {
      if (!o.isMesh || !o.visible || !o.geometry || !o.material) return;
      let a = o, shown = true;
      while (a) { if (!a.visible) { shown = false; break; } a = a.parent; }
      if (shown && !vg.getObjectById(o.id)) all.push(o);
    });
    const hits = rc.intersectObjects(all, false);
    for (const hit of hits) {
      if (why.length >= 6) break;
      const o = hit.object;
      let e = null, anc = o;
      while (anc && !e) { e = window.__edibles.find((x) => x.mesh === anc) || null; anc = anc.parent; }
      const mat = o.material;
      const sh = mat && mat.userData && mat.userData.shader;
      // STRICTLY this object's own fade. An earlier version fell back to the
      // edible's, which reported 0.62 for a mesh setMeshFade had never touched.
      const own = o.userData.fade;
      why.push({ name: o.name || '(unnamed)', dist: +hit.distance.toFixed(1),
        mat: mat ? (mat.name || mat.type) + '#' + mat.id : 'none', hooked: !!sh,
        uFade: sh && sh.uniforms.uFade ? +sh.uniforms.uFade.value.toFixed(2) : null,
        fade: own === undefined ? null : +own.toFixed(2),
        eFade: e && e.mesh.userData.fade !== undefined ? +e.mesh.userData.fade.toFixed(2) : null,
        inFadeTo: !!(e && e.fadeTo && e.fadeTo.indexOf(o) >= 0),
        nFadeTo: e && e.fadeTo ? e.fadeTo.length : 0,
        hookLen: o.onBeforeRender ? String(o.onBeforeRender).length : 0,
        edible: !!e, r: e ? e.radius : null, reachable: !!(e && e.fadeTo), obj: o });
    }
  }

  // ── THE FOUR RENDERS, PLUS ONE EXPERIMENT ─────────────────────────────────
  //   D  nothing drawn        (camera moved to an empty layer)
  //   B  the hero alone       (his subtree added to that layer)
  //   A  the frame as it is
  //   C  the frame with the hero hidden
  //   E  the frame with the nearest thing in the way simply switched off
  // B vs D is his silhouette, by construction. A vs C is where he reached the
  // screen. E answers the question the other four cannot: if the occluder were
  // gone rather than dissolved, would he be there at all — which separates "the
  // dissolve is not working" from "that is not what is covering him".
  const LAYER = 31;
  cam.layers.set(LAYER);
  const D = grab();
  vg.traverse((o) => o.layers.enable(LAYER));
  const B = grab();
  vg.traverse((o) => o.layers.disable(LAYER));
  cam.layers.set(0);
  const A = grab();
  vg.visible = false;
  const C = grab();
  vg.visible = true;
  let E = null, F = null;
  if (why.length) {
    const o = why[0].obj;
    o.visible = false; E = grab(); o.visible = true;
    // F: the same prop asked to disappear ENTIRELY through the fade path.
    // uFade 0 discards every pixel (voidBayer is never negative), so if F still
    // shows a solid prop the value is not reaching the GPU, and if it vanishes
    // the path works and 0.62 is doing exactly what 0.62 asks for.
    const was = o.userData.fade;
    o.userData.fade = 0;
    window.__RR(scene, cam);           // let the hook write it
    F = grab();
    o.userData.fade = was;
  }
  window.__RR(scene, cam);

  const DIFF = 14;
  const dif = (X, Y, i) => Math.abs(X[i] - Y[i]) > DIFF
    || Math.abs(X[i + 1] - Y[i + 1]) > DIFF || Math.abs(X[i + 2] - Y[i + 2]) > DIFF;
  // ── HOW MUCH OF HIM, NOT HOW MANY PIXELS MENTION HIM ──────────────────────
  // Counting pixels where A differs from C answers a dither honestly — each of
  // its pixels is either all hero or all prop — and flatters a blend, where
  // every pixel differs a little and the count reads 100% at any opacity. So
  // O3 is now his CONTRIBUTION: how far each pixel moves when he is hidden,
  // against how far that pixel would move if nothing were in front of him at
  // all. A dither scores exactly as before (6 pixels in 16 at full strength,
  // the rest at none, is 0.375); a 28% ghost scores the 0.72 it actually lets
  // through. The two mechanisms become comparable, which they were not.
  const lum = (X, i) => 0.2126 * X[i] + 0.7152 * X[i + 1] + 0.0722 * X[i + 2];
  let mask = 0, seenSum = 0, ifGone = 0, ifZero = 0;
  for (let i = 0; i < A.length; i += 4) {
    if (!dif(B, D, i)) continue;          // not the hero
    mask++;
    const full = Math.abs(lum(B, i) - lum(D, i));      // him against the bare ground
    const got = Math.abs(lum(A, i) - lum(C, i));       // him against what is in front
    if (full > 2) seenSum += Math.min(1, got / full);
    if (E && dif(E, A, i)) ifGone++;      // and here, only once the occluder was off
    if (F && dif(F, A, i)) ifZero++;      // and here, only once it was faded to nothing
  }
  const seen = seenSum;
  for (const q of why) delete q.obj;
  return { blocked, fadingNow, mask, seen, ifGone, ifZero, didExperiment: !!E, w, h, why,
    fadeStats: window.__fadeStats ? { ...window.__fadeStats() } : null,
    px: { x: (na.x * 0.5 + 0.5) * w, y: (-na.y * 0.5 + 0.5) * h,
          r: Math.abs(nb.x - na.x) * 0.5 * w } };
});

await p.waitForTimeout(1200);
await p.screenshot({ path: `${OUT}/${WORLD}-worst.png` });
await b.close();
const visible = shot.mask ? 100 * shot.seen / shot.mask : 100;

const got = { O2: drive.blocked ? 100 * drive.blockedFading / drive.blocked : 100, O3: visible };
console.log(`\nOCCLUSION — ${WORLD} @ ${PORT}, ${SECONDS} game-seconds, ${drive.frames} frames`);
console.log(`  edibles ${armed.n}`);
console.log(`    armed on the object fadeOccluders reads: ${armed.onTop}`
  + `   armed only on a child underneath it: ${armed.deeper}`);
console.log(`  raycast: hero blocked in ${drive.blocked}/${drive.frames} frames`
  + `   worst ${drive.worst.toFixed(0)}%   mean ${drive.mean.toFixed(1)}%`);
console.log(`  the game was fading something in ${drive.everFaded}/${drive.frames} frames`);
for (const m of drive.misses) console.log(`    blocked with nothing fading, by: ${JSON.stringify(m)}`);
console.log(`  the shot: hero ${shot.blocked.toFixed(0)}% blocked by raycast, `
  + `${shot.fadingNow} props fading, ${shot.mask} px of silhouette, `
  + `${shot.seen.toFixed(0)} px worth of him coming through`);
console.log(`  walked to the chosen occluder: ${walk.ok ? 'arrived' : 'did NOT arrive'}`
  + ` (${JSON.stringify(walk)})`);
for (const q of shot.why) console.log(`    in the way at ${q.dist}: ${q.name} ${q.mat}`
  + ` | ${q.edible ? 'edible r=' + q.r : 'NOT an edible'}, `
  + `${q.reachable ? 'reachable(' + q.nFadeTo + ')' : 'not reachable'}, `
  + `in fadeTo ${q.inFadeTo}, hooked ${q.hooked}, onBeforeRender len ${q.hookLen}, `
  + `own fade ${q.fade}, edible's fade ${q.eFade}, uFade ${q.uFade}`);
if (shot.didExperiment) {
  console.log(`  EXPERIMENT: with the nearest occluder switched off, `
    + `${shot.ifGone} of ${shot.mask} silhouette px changed `
    + `(${(100 * shot.ifGone / Math.max(1, shot.mask)).toFixed(1)}%)`);
  console.log(`  EXPERIMENT: with that occluder's own fade set to 0, `
    + `${shot.ifZero} of ${shot.mask} changed `
    + `(${(100 * shot.ifZero / Math.max(1, shot.mask)).toFixed(1)}%) `
    + `— near 0 means the value never reaches the GPU`);
}
if (shot.fadeStats) console.log(`  setMeshFade: ${JSON.stringify(shot.fadeStats)}`);
console.log(`  that frame: ${OUT}/${WORLD}-worst.png\n`);
let pass = 0;
for (const [id, bar] of Object.entries(BARS)) {
  const v = got[id], ok = bar.cmp(v);
  if (ok) pass++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id}   ${bar.what.padEnd(46)} got ${v.toFixed(1).padStart(7)}%   want ${bar.want}`);
}
if (pageLog.length) { console.log('\n  the page said:');
  for (const l of pageLog.slice(0, 12)) console.log('    ' + l); }
console.log(`\n${pass}/${Object.keys(BARS).length}`);
process.exit(pass === Object.keys(BARS).length ? 0 : 1);

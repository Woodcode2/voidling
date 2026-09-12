// ── THE KILL TEST: IS THE VOID STILL A CHARACTER ON A DIORAMA? ──────────────
//
// docs/DIORAMA-BRIEF.md §6. The menu-as-floating-diorama composition works and
// costs what today's menu costs — but in the reference there is no character at
// all, and here the void is the star. The further back the camera goes to frame
// a block, the smaller he gets, and at some size he stops being a creature and
// becomes a purple dot on a model.
//
// This measures that, rather than arguing it:
//   1. his on-screen HEIGHT IN PIXELS, projected through the real camera
//   2. THE SILHOUETTE RULE — a purple void against a purple card is a HOLE, and
//      a hole is the one thing this game may never show. So the rule is
//      geometric: the camera ray through his centre must land on the plinth TOP
//      FACE with at least 8 world units of face beyond him on every side. This
//      checks it by projecting his screen-space disc against the plinth's.
//   3. a CROP of just him at each size, so the verdict is taken by looking and
//      not by a number alone — which is how day 8 got its framing wrong four
//      times in a row.
//
// Sweeps the void's scale so the answer is a THRESHOLD, not one sample.
//
//   node qa/_diovoid.mjs [port] [world]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const PORT = process.argv[2] || '4177';
const WORLD = process.argv[3] || 'maple';
const CX = -42.75, CZ = -42.75, HALF = 46, MINR = 1.2, AZ = 225, DIST = 430;
// TARGET WORLD RADIUS, not a scale factor — see the Box3 note below.
const SCALES = [3, 5, 8, 12, 17];
const OUT = 'qa/out/diovoid';
mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
p.on('pageerror', (e) => console.log('  [pageerror] ' + e.message.split('\n')[0]));
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try { localStorage.clear();
  localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1'); localStorage.setItem('voidMute','1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
  localStorage.setItem('voidUnlocked','maple,pirate,gameday,lantern,powder,skylark');
} catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}&manual=1`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__menuState && window.__menuState().menuMode, null, { timeout: 420000 });
await p.waitForTimeout(3000);

const setup = await p.evaluate(({ CX, CZ, HALF, MINR }) => {
  const S = window.__scene, T = window.__THREE, R = window.__renderer;
  R.info.autoReset = false;
  const v = new T.Vector3();
  const VG = window.__voidGroup();
  let ground = null, best = 0;
  S.traverse((o) => { if (!o.isMesh || !o.geometry || !o.material || !o.material.map) return;
    o.geometry.computeBoundingBox(); const bb = o.geometry.boundingBox;
    const sx = bb.max.x - bb.min.x, sy = bb.max.y - bb.min.y, sz = bb.max.z - bb.min.z;
    if (sz > 1 || sx < 200 || sy < 200) return;
    if (Math.abs(o.position.y) > 0.5) return;
    if (sx * sy > best) { best = sx * sy; ground = o; } });
  if (!ground) return { error: 'no ground mesh found' };
  const gp = ground.geometry.attributes.position, gu = ground.geometry.attributes.uv;
  const pick = [];
  for (let i = 0; i < gp.count; i += Math.max(1, Math.floor(gp.count / 400))) {
    v.set(gp.getX(i), gp.getY(i), gp.getZ(i)); ground.localToWorld(v);
    pick.push({ x: v.x, z: v.z, u: gu.getX(i), v: gu.getY(i) }); }
  const fit = (k, o) => { let n = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (const q of pick) { const X = q[k], Y = q[o]; n++; sx += X; sy += Y; sxx += X * X; sxy += X * Y; }
    const a = (n * sxy - sx * sy) / (n * sxx - sx * sx); return { a, b: (sy - a * sx) / n }; };
  const fu = fit('x', 'u'), fv = fit('z', 'v');

  const hide = (o) => { o.visible = false; };
  const owner = new Map(), moverOf = new Map();
  for (const e of (window.__edibles || [])) { if (e.eaten) continue;
    e.mesh.traverse((o) => { if (o.isMesh) { owner.set(o, e.radius || 0); moverOf.set(o, !!e.mesh.userData.mover); } }); }
  const all = []; S.traverse((o) => { if (o.isMesh || o.isPoints || o.isSprite) all.push(o); });
  let kept = 0;
  for (const o of all) {
    if (!o.visible) continue;
    let inVoid = false; for (let a = o; a; a = a.parent) if (a === VG) inVoid = true;
    if (inVoid) { kept++; continue; }
    if (o === ground) { hide(o); continue; }
    if (o.isPoints || o.isSprite) {
      o.geometry && o.geometry.computeBoundingSphere();
      const bs = o.geometry && o.geometry.boundingSphere;
      if (!bs || bs.radius > 120) { hide(o); continue; }
      o.getWorldPosition(v);
      if (Math.abs(v.x - CX) > HALF + 40 || Math.abs(v.z - CZ) > HALF + 40) { hide(o); continue; }
      kept++; continue;
    }
    if (o.isInstancedMesh) { hide(o); continue; }
    o.geometry && o.geometry.computeBoundingBox();
    const bb = o.geometry && o.geometry.boundingBox;
    if (bb && (bb.max.x - bb.min.x) > 250) { hide(o); continue; }
    o.getWorldPosition(v);
    const inside = Math.abs(v.x - CX) <= HALF && Math.abs(v.z - CZ) <= HALF;
    const r = owner.has(o) ? owner.get(o) : -1;
    if (!inside) { hide(o); continue; }
    if (r >= 0 && !moverOf.get(o) && r < MINR) { hide(o); continue; }
    kept++;
  }

  const DEPTH = 30, SIDE = HALF * 2;
  const topGeo = new T.PlaneGeometry(SIDE, SIDE, 1, 1); topGeo.rotateX(-Math.PI / 2);
  { const pos = topGeo.attributes.position, uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) { const wx = CX + pos.getX(i), wz = CZ + pos.getZ(i);
      uv[i * 2] = fu.a * wx + fu.b; uv[i * 2 + 1] = fv.a * wz + fv.b; }
    topGeo.setAttribute('uv', new T.BufferAttribute(uv, 2)); }
  const top = new T.Mesh(topGeo, ground.material);
  top.position.set(CX, 0.02, CZ); top.receiveShadow = true; S.add(top);
  const body = new T.Mesh(new T.BoxGeometry(SIDE, DEPTH, SIDE),
    new T.MeshStandardMaterial({ color: 0x7a5f8c, roughness: 0.95, flatShading: true,
      emissive: 0x4b2f6e, emissiveIntensity: 0.45 }));
  body.position.set(CX, -DEPTH / 2 - 0.01, CZ); S.add(body);
  return { kept, uvFit: { u: fu, v: fv } };
}, { CX, CZ, HALF, MINR });

if (setup.error) { console.log('FAIL — ' + setup.error); await b.close(); process.exit(1); }
console.log(`\n  THE VOID ON THE DIORAMA — ${WORLD}, ${setup.kept} meshes kept\n`);
console.log(`  ${'r want'.padStart(6)} ${'r built'.padStart(8)} ${'px tall'.padStart(7)} ${'% screen'.padStart(8)}  ${'clearance (world units to plinth edge)'.padEnd(38)} calls`);

const rows = [];
for (const sc of SCALES) {
  const r = await p.evaluate(({ CX, CZ, HALF, AZ, DIST, sc }) => {
    const S = window.__scene, C = window.__cam, R = window.__renderer, T = window.__THREE;
    const VG = window.__voidGroup();
    // ON THE TOP FACE, front-right third. y is set from his own radius so he
    // STANDS on the plinth rather than floating over it or sinking into it —
    // the first version of this put him at whatever y the match had left and he
    // read as an orb hanging beside the block.
    // MEASURE HIM, DO NOT COMPUTE HIM. Two drafts of this got his size wrong
    // in two different ways and both produced confident numbers:
    //   1. `window.__voidRadius?.() ?? 1` — a hook that does not exist, so every
    //      figure would have been against a radius of 1 while the menu sets him
    //      to menuVoidR(dist) = 3.2-3.8.
    //   2. `VG.scale.setScalar(sc)` plus `rw = voidR * sc`, which assumes the
    //      rig's base mesh is unit-radius. It is not: at sc 2.4 the "42.8px"
    //      void overflowed a 220px crop, so the real radius was an order of
    //      magnitude out.
    // A Box3 over the group asks the scene what is actually there, and is right
    // however the rig is built.
    const box0 = new T.Box3().setFromObject(VG);
    const sz0 = new T.Vector3(); box0.getSize(sz0);
    const r0 = Math.max(sz0.x, sz0.z) / 2;          // his world radius, as built
    if (!(r0 > 0)) throw new Error('void group has no size');
    // `sc` is the TARGET world radius; scale relative to what he already is.
    const k = sc / r0;
    VG.scale.multiplyScalar(k);
    const rw = sc;
    const px = CX + HALF * 0.34, pz = CZ + HALF * 0.40;
    // stand him ON the face: lift by the radius his own box says he has
    const box1 = new T.Box3().setFromObject(VG);
    const sz1 = new T.Vector3(); box1.getSize(sz1);
    VG.position.set(px, sz1.y * 0.46, pz);
    S.background = new T.Color(0x2a1552); S.fog = null;
    C.fov = 32; C.far = DIST * 3; C.updateProjectionMatrix();
    const rad = AZ * Math.PI / 180;
    C.position.set(CX + Math.sin(rad) * DIST, DIST * 0.60, CZ + Math.cos(rad) * DIST);
    C.lookAt(CX, -8, CZ);
    C.updateMatrixWorld(true);
    R.info.reset(); R.render(S, C);
    // AND KEEP RENDERING IT — see the note at the call site. Without this the
    // game's own animate() re-renders with the MENU camera between this
    // evaluate and the screenshot, and every shot this file took for five runs
    // was that camera pointed at a town the probe had just hidden.
    window.__DIOREDRAW = () => {
      // HIS POSITION TOO, EVERY FRAME. voidling.update() writes the group's
      // position from voidState on every animate() tick, so a one-time
      // VG.position.set is overwritten before the screenshot — he drifts back to
      // the world's stage and reads as a speck floating beside the block. Same
      // class of mistake as the camera, found the same way: by looking.
      VG.position.set(px, sz1.y * 0.46, pz);
      S.background = new T.Color(0x2a1552); S.fog = null;
      C.fov = 32; C.far = DIST * 3; C.updateProjectionMatrix();
      C.position.set(CX + Math.sin(rad) * DIST, DIST * 0.60, CZ + Math.cos(rad) * DIST);
      C.lookAt(CX, -8, CZ); C.updateMatrixWorld(true);
      R.render(S, C);
    };
    // project his sphere: centre and a point one radius above
    const proj = (x, y, z) => { const v = new T.Vector3(x, y, z).project(C);
      return { x: (v.x * 0.5 + 0.5) * 430, y: (-v.y * 0.5 + 0.5) * 932 }; };
    // project his MEASURED box, not an assumed sphere
    const bb = new T.Box3().setFromObject(VG);
    const c = proj((bb.min.x + bb.max.x) / 2, (bb.min.y + bb.max.y) / 2, (bb.min.z + bb.max.z) / 2);
    const lo = proj((bb.min.x + bb.max.x) / 2, bb.min.y, (bb.min.z + bb.max.z) / 2);
    const hi = proj((bb.min.x + bb.max.x) / 2, bb.max.y, (bb.min.z + bb.max.z) / 2);
    const pxTall = Math.abs(hi.y - lo.y);
    // clearance: world units from him to each plinth edge along x and z
    const clr = { '+x': (CX + HALF) - (px + rw), '-x': (px - rw) - (CX - HALF),
      '+z': (CZ + HALF) - (pz + rw), '-z': (pz - rw) - (CZ - HALF) };
    return { sc, rw: +rw.toFixed(2), pxTall: +pxTall.toFixed(1),
      pct: +(pxTall / 932 * 100).toFixed(1), cx: +c.x.toFixed(0), cy: +c.y.toFixed(0),
      clr: Object.fromEntries(Object.entries(clr).map(([k, v]) => [k, +v.toFixed(1)])),
      calls: R.info.render.calls };
  }, { CX, CZ, HALF, AZ, DIST, sc });
  rows.push(r);
  const worst = Math.min(...Object.values(r.clr));
  console.log(`  ${String(r.sc).padStart(5)} ${String(r.rw).padStart(8)} ${String(r.pxTall).padStart(7)} ${String(r.pct).padStart(7)}%  `
    + `${JSON.stringify(r.clr).padEnd(38)} ${r.calls}${worst < 8 ? '   ** BREAKS THE 8-UNIT SILHOUETTE RULE **' : ''}`);
  // HOLD THE CAMERA, DO NOT JUST SET IT. The game's own animate() runs between
  // an evaluate() and a screenshot and re-renders with the MENU camera — parked
  // at the world's stage, 66 units from this block, looking at a town this probe
  // has just hidden. Five runs of this file shot exactly that and I read it as
  // "the void is too big" rather than "this is not my frame".
  await p.evaluate(() => {
    if (window.__DIOHOLD) return;
    window.__DIOHOLD = true;
    const k = () => { window.__DIOREDRAW && window.__DIOREDRAW(); requestAnimationFrame(k); };
    k();
  });
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${OUT}/${WORLD}-s${String(r.sc).replace('.', '_')}.png`, timeout: 180000 });
  // and a crop of just him, 220x220 CSS px around his centre, so the face can be judged
  const cw = 110;
  await p.screenshot({ path: `${OUT}/${WORLD}-s${String(r.sc).replace('.', '_')}-face.png`, timeout: 180000,
    clip: { x: Math.max(0, r.cx - cw), y: Math.max(0, r.cy - cw), width: cw * 2, height: cw * 2 } });
}
await b.close();
console.log(`\n  shots in ${OUT}/  — LOOK at the -face crops; the number is not the verdict\n`);

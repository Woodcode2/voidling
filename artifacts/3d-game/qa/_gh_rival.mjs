// THE FAMILY, MEASURED AGAINST THE HERO.
//
//   node qa/_gh_rival.mjs <world> [port]
//
// Three questions, three measurements:
//  1. the five rivals wear makeVoidBody() but a DIFFERENT face rig and a
//     DIFFERENT sphere (40x30 vs the hero's 96x72). How far apart do the two
//     read at the same on-screen size?
//  2. the rival keeps the additive bloom sprite the hero deleted for reading as
//     "a white circle glued around the void". How much light does it add?
//  3. every rival eye mesh is depthTest:false (rivals.ts:277-283). Raycast from
//     the camera to each rival's eye plane and count how often scenery is in
//     the way while the eyes are still being painted on top of it.
import { chromium } from 'playwright';
import fs from 'node:fs';

const WORLD = process.argv[2] || 'maple';
const PORT = process.argv[3] || '4242';
fs.mkdirSync('qa-out/gh', { recursive: true });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
} catch { /* private mode */ } });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show')
  .forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1500);
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
await p.evaluate(() => { window.__realRender = window.__renderer.render.bind(window.__renderer); });
const draw = (on) => p.evaluate((v) => { window.__renderer.render = v ? window.__realRender : () => {}; }, on);
await draw(false);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 900000 });
await p.evaluate(() => window.__pinQuality(0));

const frames = (n) => p.evaluate((k) => new Promise((res) => {
  let i = 0; const step = () => { if (++i >= k) return res(1); requestAnimationFrame(step); };
  requestAnimationFrame(step);
}), n);

await p.evaluate(() => {
  let hero = null; const others = [];
  window.__scene.traverse((o) => {
    if (!o.isMesh || !o.material?.uniforms?.uAbyss) return;
    if (o.geometry?.parameters?.widthSegments === 96) hero = o; else others.push(o);
  });
  window.__heroBody = hero; window.__rivalBodies = others;
});

// ── 3. THE EYE-THROUGH-WALLS CENSUS ────────────────────────────────────────
// Sampled on the MATCH CLOCK, not the wall clock, with the draw stubbed.
// three is not on window, so the raycast is done by hand: march the segment
// from the camera to each rival's eye plane and test it against the bounding
// spheres of the world's opaque meshes. Coarser than a triangle raycast, and
// deliberately conservative — a hit only counts when the segment passes inside
// a prop's own bounding sphere.
const census = await p.evaluate(async () => {
  const cam = window.__cam;
  const out = [];
  const props = [];
  window.__scene.traverse((o) => {
    if (!o.isMesh || !o.visible || !o.geometry) return;
    if (o.material?.uniforms?.uAbyss) return;             // the voids themselves
    if (o.material?.transparent) return;                  // glass, water, FX
    if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
    const bs = o.geometry.boundingSphere; if (!bs || !isFinite(bs.radius)) return;
    o.updateWorldMatrix(true, false);
    const e = o.matrixWorld.elements;
    const sc = Math.max(Math.hypot(e[0], e[1], e[2]), Math.hypot(e[4], e[5], e[6]), Math.hypot(e[8], e[9], e[10]));
    const c = { x: bs.center.x, y: bs.center.y, z: bs.center.z };
    // world centre
    const wx = e[0] * c.x + e[4] * c.y + e[8] * c.z + e[12];
    const wy = e[1] * c.x + e[5] * c.y + e[9] * c.z + e[13];
    const wz = e[2] * c.x + e[6] * c.y + e[10] * c.z + e[14];
    const r = bs.radius * sc;
    if (r > 60) return;                                   // the ground plate etc
    props.push([wx, wy, wz, r]);
  });
  const samples = [];
  const wait = (k) => new Promise((res) => { let i = 0; const s = () => { if (++i >= k) return res(1); requestAnimationFrame(s); }; requestAnimationFrame(s); });
  for (let s = 0; s < 24; s++) {
    await wait(20);   // ~1 s of sim time per sample
    const t = window.__matchState().t;
    let vis = 0, blocked = 0;
    for (const rb of window.__rivalBodies) {
      const g = rb.parent;
      if (!g?.visible) continue;
      g.updateWorldMatrix(true, false);
      const e = g.matrixWorld.elements;
      const scl = Math.hypot(e[0], e[1], e[2]);
      // the eye plane sits at z=1.0 in the billboarded eye group, i.e. one
      // radius toward the camera from the body centre
      const cx = e[12], cy = e[13], cz = e[14];
      const dx = cam.position.x - cx, dy = cam.position.y - cy, dz = cam.position.z - cz;
      const L = Math.hypot(dx, dy, dz) || 1;
      const ex = cx + dx / L * scl, ey = cy + dy / L * scl, ez = cz + dz / L * scl;
      vis++;
      // segment camera -> eye
      const sx = cam.position.x, sy = cam.position.y, sz = cam.position.z;
      const vx = ex - sx, vy = ey - sy, vz = ez - sz;
      const vl2 = vx * vx + vy * vy + vz * vz;
      let hit = false;
      for (const [px, py, pz, pr] of props) {
        const wxx = px - sx, wyy = py - sy, wzz = pz - sz;
        let tt = (wxx * vx + wyy * vy + wzz * vz) / vl2;
        if (tt <= 0.02 || tt >= 0.98) continue;            // behind camera / behind eye
        const qx = sx + vx * tt - px, qy = sy + vy * tt - py, qz = sz + vz * tt - pz;
        if (qx * qx + qy * qy + qz * qz < pr * pr * 0.36) { hit = true; break; }   // 0.6r core
      }
      if (hit) blocked++;
    }
    samples.push({ t: +t.toFixed(1), visible: vis, eyesThroughProp: blocked });
  }
  return { props: props.length, samples };
});
const tot = census.samples.reduce((a, s) => a + s.visible, 0);
const bad = census.samples.reduce((a, s) => a + s.eyesThroughProp, 0);
console.log(`# rival-eye census (${WORLD}): ${census.props} opaque props considered`);
console.log(`# ${bad}/${tot} rival sightings had a prop core between camera and eye plane (${((bad / Math.max(1, tot)) * 100).toFixed(1)}%)`);
console.log('# ' + census.samples.map((s) => `t${s.t}:${s.eyesThroughProp}/${s.visible}`).join(' '));

// ── 1 & 2. THE FAMILY PORTRAIT ─────────────────────────────────────────────
await p.addStyleTag({ content: '#news,#hud,#stageBar,.vb,.vf,#btnHome,#coins,#rank,#growBar,#toast,#combo{opacity:0!important}' });
await draw(true);
await frames(3);
const shots = await p.evaluate(() => {
  const cam = window.__cam, out = [];
  const push = (o, tag) => {
    const g = o.parent; if (!g?.visible) return;
    g.updateWorldMatrix(true, false);
    const e = g.matrixWorld.elements;
    const scl = Math.hypot(e[0], e[1], e[2]);
    const V = cam.position.constructor;
    const wp = new V(e[12], e[13], e[14]);
    const camD = cam.position.distanceTo(wp);
    const pxR = (window.innerHeight / (2 * camD * Math.tan(cam.fov * Math.PI / 360))) * scl;
    const sp = wp.clone().project(cam);
    out.push({ tag, scl: +scl.toFixed(2), camD: +camD.toFixed(1), pxR: +pxR.toFixed(1),
      sx: (sp.x * 0.5 + 0.5) * window.innerWidth, sy: (-sp.y * 0.5 + 0.5) * window.innerHeight,
      onScreen: sp.z < 1 && Math.abs(sp.x) < 1 && Math.abs(sp.y) < 1,
      uSmall: +o.material.uniforms.uSmall.value.toFixed(3),
      uSlow: +o.material.uniforms.uSlow.value.toFixed(3),
      segs: o.geometry.parameters.widthSegments,
      hasBloom: g.children.some((c) => c.isSprite && c.material?.blending === 2 && c.material.opacity > 0.01) });
  };
  push(window.__heroBody, 'HERO');
  window.__rivalBodies.forEach((o, i) => push(o, 'rival' + i));
  return out;
});
console.log('# bodies:', JSON.stringify(shots, null, 1));
for (const s of shots) {
  if (!s.onScreen) continue;
  const S = Math.max(50, Math.min(400, Math.round(s.pxR * 3.0)));
  const clip = { x: Math.round(Math.max(0, Math.min(430 - S, s.sx - S / 2))),
    y: Math.round(Math.max(0, Math.min(932 - S, s.sy - S / 2))), width: S, height: S };
  const buf = await p.screenshot({ clip });
  fs.writeFileSync(`qa-out/gh/${WORLD}-fam-${s.tag}.png`, buf);
  console.log(`  ${s.tag} r=${s.scl} pxR=${s.pxR} -> qa-out/gh/${WORLD}-fam-${s.tag}.png`);
}
await b.close();

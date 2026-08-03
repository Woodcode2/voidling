// HERO CLEARANCE AT SPAWN — what fraction of the void is hidden behind scenery
// in the opening frame.
//
//   node qa/hero.mjs [world] [port]
//
// The opening is hand-authored and identical every load, which makes this a
// fixed, checkable property rather than something that varies per run: either
// the hero is clear on the first frame a child ever sees, or it is not, and it
// is the same either way forever.
//
// A SINGLE RAY AT THE VOID'S CENTRE IS NOT THE TEST. Scenery that clips the
// hero's edge — the case that actually looks wrong — leaves the centre ray
// completely clear, and the first version of this check duly reported "nothing
// blocks the void" for a frame with a tree lying across it. So this samples a
// disc over the void's projected silhouette and asks, for each sample, whether
// anything sits between the camera and the void's surface.
import { chromium } from 'playwright';

const WORLD = process.argv[2] || 'maple';
const PORT = process.argv[3] || '4177';

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1400);
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
// past the intro camera move and the title card, in MATCH time
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 5, null, { timeout: 600000 });

const out = await p.evaluate(() => {
  const T = window.__THREE;
  // MEASURE AT THE AUTHORED SPAWN, not wherever the void has got to. It drifts
  // toward whatever it is eating, so by t=5 __voidState() is a couple of units
  // downhill of the composed shot and the reading swung 8%-51% between runs on
  // the same build. The authored point is fixed forever; that is the thing with
  // a right answer.
  const sp = window.__spawn ? window.__spawn() : window.__voidState();
  const vs = { x: sp.x, z: sp.z, r: window.__voidState().r };
  const centre = new T.Vector3(vs.x, vs.r * 0.55, vs.z);
  // …and reconstruct the OPENING SHOT's camera rather than reading the live one,
  // which has followed the void off its mark. prototype3d.ts composes it as
  // spawn + camOffset * camDist with camOffset (0.62, 0.92, 0.62) normalised and
  // camDist reset to 50 — so this is that camera, exactly, every run.
  const camOff = new T.Vector3(0.62, 0.92, 0.62).normalize();
  const cam = { position: new T.Vector3(vs.x + camOff.x * 50, camOff.y * 50, vs.z + camOff.z * 50) };
  // everything that can occlude — the void's own parts are excluded by stopping
  // each ray short of the sphere surface
  const list = [];
  window.__scene.traverse(o => { if (o.isMesh && o.visible && o.geometry && o.matrixWorld) list.push(o); });

  // build a camera-facing basis so the sample disc covers the SILHOUETTE
  const fwd = centre.clone().sub(cam.position).normalize();
  const up = new T.Vector3(0, 1, 0);
  const right = new T.Vector3().crossVectors(fwd, up).normalize();
  const upv = new T.Vector3().crossVectors(right, fwd).normalize();

  const rc = new T.Raycaster();
  let total = 0, blocked = 0;
  const culprits = new Map();
  const N = 9;                       // 9x9 grid, circle-masked
  for (let iy = 0; iy < N; iy++) for (let ix = 0; ix < N; ix++) {
    const u = (ix / (N - 1)) * 2 - 1, v = (iy / (N - 1)) * 2 - 1;
    if (u * u + v * v > 1) continue;                       // inside the disc only
    total++;
    const pt = centre.clone()
      .add(right.clone().multiplyScalar(u * vs.r))
      .add(upv.clone().multiplyScalar(v * vs.r));
    const dir = pt.clone().sub(cam.position).normalize();
    const d = cam.position.distanceTo(pt);
    // stop a hair short of the void's own surface so the hero never counts
    // itself, and start clear of the near plane
    rc.set(cam.position, dir); rc.near = 0.5; rc.far = d - vs.r * 0.35;
    const hits = rc.intersectObjects(list, false);
    // THE HERO'S OWN RIG IS NOT AN OCCLUDER. The void carries a find-ring, a
    // contact shadow and a glow disc, all centred on it and all wider than the
    // body, so they sit across most of its own silhouette — reported as 94%
    // "occluded" before this filter, which is the hero hiding behind itself.
    let hit = null;
    for (const h of hits) {
      let t = h.object; while (t.parent && t.parent !== window.__scene) t = t.parent;
      const w = new T.Vector3(); t.getWorldPosition(w);
      if (Math.hypot(w.x - centre.x, w.z - centre.z) < vs.r * 2) continue;   // the void's own
      hit = { h, top: t, wp: w }; break;
    }
    if (!hit) continue;
    blocked++;
    const top = hit.top, wp = hit.wp;
    const key = top.uuid;
    const rec = culprits.get(key) || { n: 0, eRadius: top.userData?.eRadius ?? null,
      mover: !!top.userData?.mover, pos: `(${wp.x.toFixed(1)}, ${wp.z.toFixed(1)})`,
      dist: +cam.position.distanceTo(wp).toFixed(1) };
    rec.n++; culprits.set(key, rec);
  }
  return { spawn: `(${vs.x.toFixed(1)}, ${vs.z.toFixed(1)})`, r: +vs.r.toFixed(2),
    total, blocked, pct: +(blocked / total * 100).toFixed(1),
    culprits: [...culprits.values()].sort((a, b) => b.n - a.n) };
});
await b.close();

console.log(`\n  HERO CLEARANCE — ${WORLD.toUpperCase()} opening frame`);
console.log(`  spawn ${out.spawn}  r=${out.r}`);
console.log(`  silhouette samples ${out.total}, occluded ${out.blocked} = ${out.pct}%`);
for (const c of out.culprits)
  console.log(`     ${String(c.n).padStart(3)} samples  by ${c.mover ? 'MOVER' : 'static'} eRadius=${c.eRadius} at ${c.pos}`);
// The opening is authored and identical every load, so anything here is
// permanent. A few percent is a clipped edge; a fifth is the hero behind a tree.
const LIMIT = 8;
console.log('\n  ' + (out.pct > LIMIT
  ? `FAIL — ${out.pct}% of the hero is hidden on the first frame a child sees (limit ${LIMIT}%)`
  : `PASS — hero is clear (${out.pct}% occluded, limit ${LIMIT}%)`) + '\n');
process.exit(out.pct > LIMIT ? 1 : 0);

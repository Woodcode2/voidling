// TEAM MOVERS — the WALKING crowd, photographed from the front.
//
// Two instrument bugs make this necessary and qa/personsheet.mjs has both:
//   1. it filters edibles to radius 0.5-1.6, and life.ts registers every
//      walking adult at radius 2.4 (life.ts:2946, 4064, ...) and every child at
//      1.9 — so the character sheet has NEVER photographed a life.ts person.
//   2. setting mesh.rotation.y on a mover does nothing: addWanderer's update()
//      rewrites the heading every frame, so the subject turns away before the
//      shutter. Only the statics ever held the pose, which is why the sheet
//      looks like one population.
// So this probe CLONES the person. A clone is not in `movers`, nothing steers
// it, and it holds whatever facing it is given.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const PORT = process.argv[2] || '4177';
const WORLD = process.argv[3] || 'maple';
const OUT = 'qa/out/crowdface';
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
  localStorage.setItem('voidUnlocked','maple,pirate,gameday,lantern,powder'); } catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach((e)=>{ if(['daily','gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1400);
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`); await p.waitForTimeout(2500);
await p.mouse.click(215, 700).catch(()=>{});
await p.waitForFunction(() => { const m = window.__matchState && window.__matchState(); return m && m.t > 2.0; }, null, { timeout: 120000, polling: 200 });
await p.waitForTimeout(2500);
const HUD_SEL = '#timer,#board,#coins,#quests,#growth,#banner,#count,#news,'
  + '#hungerlbl,#hunger,#joy,#powers,#guide,#btnQuit,.vb,.vf,.vbN';
await p.addStyleTag({ content: `${HUD_SEL}{opacity:0 !important}` });
const found = await p.evaluate(() => {
  const THREE = window.__THREE, cam = window.__cam, vs = window.__voidState();
  const faceCam = Math.atan2(0.62, 0.62);
  const movers = [];
  for (const e of window.__edibles) {
    const m = e.mesh; if (!m || !m.userData.mover) continue;
    let verts = 0, meshes = 0;
    m.traverse((o) => { if (o.isMesh && o.geometry) { verts += o.geometry.attributes.position?.count || 0; meshes++; } });
    if (verts < 2500 || meshes < 6) continue;          // a person is ~8 welded meshes
    const bb = new THREE.Box3().setFromObject(m);
    if (bb.max.y - bb.min.y < 2.4) continue;           // not a dog, a duck or a crab
    movers.push({ m, verts, h: bb.max.y - bb.min.y,
      d: Math.hypot(m.position.x - vs.x, m.position.z - vs.z) });
  }
  movers.sort((a, c) => a.d - c.d);
  const out = [];
  movers.slice(0, 5).forEach((q, i) => {
    // CLONE: a clone is not in `movers`, so nothing rewrites its heading.
    const c = q.m.clone(true);
    c.userData = {}; c.traverse((o) => { o.userData = {}; o.castShadow = true; });
    const off = (i - 2) * 2.6;
    c.position.set(vs.x + off * 0.71 - 3.0, 0, vs.z - off * 0.71 - 3.0);
    c.rotation.y = faceCam; c.updateMatrixWorld(true);
    window.__scene.add(c);
    const bb = new THREE.Box3().setFromObject(c);
    const P = (yy) => { const v = new THREE.Vector3(c.position.x, yy, c.position.z).project(cam);
      return { x: (v.x*0.5+0.5)*window.innerWidth, y: (-v.y*0.5+0.5)*window.innerHeight }; };
    const a = P(bb.max.y + 0.1), d = P(bb.max.y - 1.2);
    out.push({ i, verts: q.verts, h: +q.h.toFixed(2),
      sx: (a.x+d.x)/2, sy: (a.y+d.y)/2, hpx: Math.hypot(d.x-a.x, d.y-a.y) });
  });
  return out;
});
await p.waitForTimeout(900);
await p.screenshot({ path: `${OUT}/${WORLD}_front.png` });
let n = 0;
for (const f of found) {
  const w = Math.max(50, Math.round(f.hpx * 2.4)), h = w;
  const x = Math.round(Math.max(0, Math.min(430 - w, f.sx - w/2)));
  const y = Math.round(Math.max(0, Math.min(932 - h, f.sy - h*0.42)));
  await p.screenshot({ path: `${OUT}/${WORLD}_head_${n++}.png`, clip: { x, y, width: w, height: h } });
}
console.log(`  ${WORLD}: ${found.length} cloned crowd people, ${n} head crops  ${found.map(f=>`h${f.h}/px${Math.round(f.hpx)}`).join(' ')}`);
await b.close();

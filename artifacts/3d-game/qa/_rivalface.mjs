// A RIVAL, PHOTOGRAPHED THE WAY A CHILD SEES ONE.
//
//   node qa/_rivalface.mjs [world] [dpr]
//
// Stands the hero next to a family member at the hero's own starting size and
// waits for the camera to actually settle before shooting (the camera eases at
// 1-exp(-1.6·dt) per frame, so a probe that jumps the radius and waits 3s of
// WALL clock at 0.02x real time photographs a camera still in flight — which
// is how qa/_hero2.mjs produced a "pair" shot of two specks).
//
// Then it drops a THIN wall between the lens and the rival. The family's eyes,
// blush and smile are built depthTest:false (rivals.ts:279-298), so a face that
// appears on the wall is a face painting through solid scenery. The hero's own
// face is depth-tested (void3d.ts:434, flat()), so the two behave differently
// in the same frame.
import { chromium } from 'playwright';
import fs from 'node:fs';

const WORLD = process.argv[2] || 'maple';
const DPR = Number(process.argv[3] || 2);
fs.mkdirSync('qa-out/family', { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: DPR });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
} catch { /* private mode */ } });
await p.goto(`http://127.0.0.1:4177/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show')
  .forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
const tap = async (sel) => { await p.waitForSelector(sel, { timeout: 300000 });
  await p.evaluate((s) => document.querySelector(s).click(), sel); };
await tap('#btnPlay'); await p.waitForTimeout(2500);
await tap(`#worldRow .wCard[data-world="${WORLD}"]`);
// t>20: everyone has joined and the family has grown past its 1.0 start
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 20, null, { timeout: 2400000 });
await p.addStyleTag({ content: '#news,#hud,#stageBar,.vb,.vf,#btnHome,#coins{opacity:0!important}' });

const near = await p.evaluate(() => {
  // JOINED ONLY. A family member that has not walked in yet is parked on a
  // 150-unit ring with group.visible = false and still reports a position, so
  // "the nearest rival" without this filter warps the hero into an empty field
  // — which is what produced the two-specks pair shots from qa/_hero2.mjs.
  const v = window.__voidState(), rs = window.__matchState().rivals.filter((r) => r.joined);
  rs.sort((a, c) => Math.hypot(a.x - v.x, a.z - v.z) - Math.hypot(c.x - v.x, c.z - v.z));
  const t = rs[0];
  // stand just west of them, at the hero's own natural size for this point in
  // the match — no radius jump, so the camera does not have to travel
  window.__warpVoid(t.x - 9, t.z);
  return t;
});
console.log(`nearest family member: ${near.name} r=${near.r.toFixed(2)} at (${near.x.toFixed(0)},${near.z.toFixed(0)})`);
// camera settle: WAIT ON THE CAMERA, not on a wall clock
await p.waitForFunction(() => {
  const c = window.__cam, v = window.__voidState();
  const d = Math.hypot(c.position.x - v.x, c.position.z - v.z);
  window.__camPrev = window.__camPrev ?? d;
  const settled = Math.abs(d - window.__camPrev) < 0.05;
  window.__camPrev = d;
  return settled;
}, null, { timeout: 600000 });
await p.screenshot({ path: `qa-out/family/${WORLD}-rival.png` });
console.log(`qa-out/family/${WORLD}-rival.png`);

// ── the wall ────────────────────────────────────────────────────────────────
await p.evaluate(() => {
  const THREE = window.__THREE, cam = window.__cam;
  // JOINED ONLY. A family member that has not walked in yet is parked on a
  // 150-unit ring with group.visible = false and still reports a position, so
  // "the nearest rival" without this filter warps the hero into an empty field
  // — which is what produced the two-specks pair shots from qa/_hero2.mjs.
  const v = window.__voidState(), rs = window.__matchState().rivals.filter((r) => r.joined);
  rs.sort((a, c) => Math.hypot(a.x - v.x, a.z - v.z) - Math.hypot(c.x - v.x, c.z - v.z));
  const t = rs[0];
  const wp = new THREE.Vector3(t.x, t.r, t.z);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(3 * t.r + 6, 3 * t.r + 6, 0.4),
    new THREE.MeshBasicMaterial({ color: 0x00cc22 }));
  wall.position.copy(wp.clone().lerp(cam.position, 0.12));
  wall.lookAt(cam.position);
  window.__scene.add(wall);
});
await p.waitForTimeout(6000);
await p.screenshot({ path: `qa-out/family/${WORLD}-rivalwall.png` });
console.log(`qa-out/family/${WORLD}-rivalwall.png — a face on the green wall is a face drawn through solid geometry`);
await b.close();

// INSTRUMENTED copy of qa/crowdface.mjs — prints the numbers the finding asserts.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const PORT = process.argv[2] || '4177';
const WORLD = process.argv[3] || 'maple';
const OUT = '/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/cfout';
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
    if (verts < 2500 || meshes < 6) continue;
    const bb = new THREE.Box3().setFromObject(m);
    if (bb.max.y - bb.min.y < 2.4) continue;
    movers.push({ m, verts, h: bb.max.y - bb.min.y,
      d: Math.hypot(m.position.x - vs.x, m.position.z - vs.z) });
  }
  movers.sort((a, c) => a.d - c.d);
  const out = [];
  movers.slice(0, 5).forEach((q, i) => {
    // capture the head node BEFORE the clone blanks userData
    const limbs = q.m.userData.limbs;
    const hasHead = !!(limbs && limbs.head);
    // index path of the head inside the group, so we can find it on the clone
    let headIdx = -1;
    if (hasHead) headIdx = q.m.children.indexOf(limbs.head);

    const c = q.m.clone(true);
    c.userData = {}; c.traverse((o) => { o.userData = {}; o.castShadow = true; });
    const off = (i - 2) * 2.6;
    c.position.set(vs.x + off * 0.71 - 3.0, 0, vs.z - off * 0.71 - 3.0);
    c.rotation.y = faceCam; c.updateMatrixWorld(true);
    window.__scene.add(c);
    const bb = new THREE.Box3().setFromObject(c);

    // the head on the CLONE, by index
    let headTopY = null, headBotY = null, headCtrY = null, headWorldY = null;
    if (headIdx >= 0) {
      const hc = c.children[headIdx];
      const hbb = new THREE.Box3().setFromObject(hc);
      headTopY = hbb.max.y; headBotY = hbb.min.y; headCtrY = (hbb.max.y + hbb.min.y) / 2;
      const wp = new THREE.Vector3(); hc.getWorldPosition(wp); headWorldY = wp.y;
    }
    const P = (yy) => { const v = new THREE.Vector3(c.position.x, yy, c.position.z).project(cam);
      return { x: (v.x*0.5+0.5)*window.innerWidth, y: (-v.y*0.5+0.5)*window.innerHeight }; };
    const a = P(bb.max.y + 0.1), d = P(bb.max.y - 1.2);
    const sy = (a.y+d.y)/2, sx = (a.x+d.x)/2;
    const hpx = Math.hypot(d.x-a.x, d.y-a.y);
    // where the head actually is, on screen
    const hcS = headCtrY != null ? P(headCtrY) : null;
    const htS = headTopY != null ? P(headTopY) : null;
    const hbS = headBotY != null ? P(headBotY) : null;
    // crop box the probe actually takes
    const w = Math.max(50, Math.round(hpx * 2.4));
    const cy = Math.round(Math.max(0, Math.min(932 - w, sy - w*0.42)));
    const cropTop = cy, cropBot = cy + w, cropCtr = cy + w/2;
    out.push({ i, verts: q.verts, h: +q.h.toFixed(2),
      hasHead,
      bbMaxY: +bb.max.y.toFixed(3), bbMinY: +bb.min.y.toFixed(3),
      headTopY: headTopY != null ? +headTopY.toFixed(3) : null,
      headCtrY: headCtrY != null ? +headCtrY.toFixed(3) : null,
      headPxH: (htS && hbS) ? +Math.abs(hbS.y - htS.y).toFixed(1) : null,
      propOverhead: headTopY != null ? +(bb.max.y - headTopY).toFixed(3) : null,
      sx: +sx.toFixed(1), sy: +sy.toFixed(1), hpx: +hpx.toFixed(1), cropW: w,
      cropTop, cropBot, cropCtr,
      headScreenY: hcS ? +hcS.y.toFixed(1) : null,
      headTopScreenY: htS ? +htS.y.toFixed(1) : null,
      headBotScreenY: hbS ? +hbS.y.toFixed(1) : null,
      headInsideCrop: hcS ? (hcS.y >= cropTop && hcS.y <= cropBot) : null,
      errPx: hcS ? +(cropCtr - hcS.y).toFixed(1) : null,
    });
  });
  return out;
});
console.log(JSON.stringify(found.map(f=>({i:f.i,h:f.h,bbMaxY:f.bbMaxY,headTopY:f.headTopY,propOverhead:f.propOverhead,headPxH:f.headPxH,cropW:f.cropW,headInsideCrop:f.headInsideCrop,errPx:f.errPx,fracErr:+(f.errPx/f.cropW).toFixed(3)}))));
await p.waitForTimeout(900);
const TAG = process.argv[4] || 'a';
await p.screenshot({ path: `${OUT}/${WORLD}_${TAG}_front.png` });
let n=0;
for (const f of found) {
  const w = f.cropW, h = w;
  const x = Math.round(Math.max(0, Math.min(430 - w, f.sx - w/2)));
  const y = f.cropTop;
  await p.screenshot({ path: `${OUT}/${WORLD}_${TAG}_head_${n++}.png`, clip: { x, y, width: w, height: h } });
}
await b.close();

// TEAM MOVERS — does a WALKING crowd person have a front?
//
// qa/personsheet.mjs picks the six person-sized edibles NEAREST the void at
// spawn. In Maple that is the town square, whose nearest people are all
// mainstreet.ts statics — so the sheet has never photographed a life.ts mover
// and the crowd's face has never been looked at. This probe picks by
// userData.mover instead, turns them to face the play camera, and writes a
// tight head crop per subject.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const PORT = process.argv[2] || '4177';
const WORLD = process.argv[3] || 'maple';
const OUT = 'qa/out/moverface';
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
  localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder');
} catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1400);
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`); await p.waitForTimeout(2500);
await p.mouse.click(215, 700).catch(() => {});
await p.waitForFunction(() => { const m = window.__matchState && window.__matchState(); return m && m.t > 1.5; },
  null, { timeout: 120000, polling: 200 });
await p.waitForFunction(() => { const n = window.__edibles.length;
  if (window.__lastN !== n) { window.__lastN = n; window.__stableSince = performance.now(); return false; }
  return performance.now() - (window.__stableSince || 0) > 2500; }, null, { timeout: 300000, polling: 250 });
const HUD_SEL = '#timer,#board,#coins,#quests,#growth,#banner,#count,#news,'
  + '#hungerlbl,#hunger,#joy,#powers,#guide,#btnQuit,.vb,.vf,.vbN';
await p.addStyleTag({ content: `${HUD_SEL}{opacity:0 !important}` });

for (const [tag, turn] of [['front', 0], ['q', Math.PI * 0.25]]) {
  const found = await p.evaluate(({ turn }) => {
    const THREE = window.__THREE, cam = window.__cam, vs = window.__voidState();
    const faceCam = Math.atan2(0.62, 0.62);
    const movers = [], statics = [];
    for (const e of window.__edibles) {
      const m = e.mesh; if (!m) continue;
      const r = e.radius || 0; if (r < 0.5 || r > 3.2) continue;
      let verts = 0; m.traverse((o) => { if (o.isMesh && o.geometry) verts += o.geometry.attributes.position?.count || 0; });
      if (verts < 2000) continue;
      const d = Math.hypot(m.position.x - vs.x, m.position.z - vs.z);
      (m.userData.mover ? movers : statics).push({ m, d, verts, mover: !!m.userData.mover });
    }
    movers.sort((a, c) => a.d - c.d); statics.sort((a, c) => a.d - c.d);
    const picked = [...movers.slice(0, 4), ...statics.slice(0, 2)];
    const out = [];
    picked.forEach((q, i) => {
      const off = (i - (picked.length - 1) / 2) * 2.6;
      q.m.position.set(vs.x + off * 0.71 - 2.5, 0, vs.z - off * 0.71 - 2.5);
      q.m.rotation.y = faceCam + turn; q.m.updateMatrixWorld(true);
      // head height: top of the mesh bbox, minus a sliver
      const bb = new THREE.Box3().setFromObject(q.m);
      const P = (yy) => { const v = new THREE.Vector3(q.m.position.x, yy, q.m.position.z).project(cam);
        return { x: (v.x * 0.5 + 0.5) * window.innerWidth, y: (-v.y * 0.5 + 0.5) * window.innerHeight }; };
      const H = bb.max.y - bb.min.y;
      const a = P(bb.max.y + 0.05), b = P(bb.max.y - H * 0.30);
      out.push({ i, mover: q.mover, verts: q.verts, top: +bb.max.y.toFixed(2), h: +H.toFixed(2),
        qk: q.m.userData.qk || '-',
        sx: (a.x + b.x) / 2, sy: (a.y + b.y) / 2, hpx: Math.abs(b.y - a.y) });
    });
    return out;
  }, { turn });
  await p.waitForTimeout(900);
  await p.screenshot({ path: `${OUT}/${WORLD}_${tag}.png` });
  let n = 0;
  for (const f of found) {
    const w = Math.max(40, Math.round(f.hpx * 2.2)), h = w;
    const x = Math.round(Math.max(0, Math.min(430 - w, f.sx - w / 2)));
    const y = Math.round(Math.max(0, Math.min(932 - h, f.sy - h / 2)));
    await p.screenshot({ path: `${OUT}/${WORLD}_${tag}_${n++}_${f.mover ? 'mover' : 'static'}.png`, clip: { x, y, width: w, height: h } });
  }
  console.log(`  ${tag.padEnd(6)} ${found.length} subjects  movers=${found.filter(f=>f.mover).length} statics=${found.filter(f=>!f.mover).length}  ${found.map(f=>`${f.mover?'M':'S'}:${f.qk}/h${f.h}/px${Math.round(f.hpx)}`).join(' ')}`);
}
await b.close();
console.log(`  wrote ${OUT}/`);

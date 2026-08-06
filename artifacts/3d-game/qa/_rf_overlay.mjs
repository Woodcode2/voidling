// REFUTE: "four overlapping overlays + newsroom across the void's face"
// 1) identify the white ring: is it #joy (the drag joystick the PROBE holds down)?
// 2) with keyboard steering (no finger), what round elements sit on the void?
// 3) measure real bubble/floater overlap with the void's projected silhouette.
import { chromium } from 'playwright';
import fs from 'node:fs';
const PORT = process.argv[3] || '4177';
const WORLD = process.argv[2] || 'maple';
const OUT = '/tmp/claude-0/-home-user-voidling/1f93d8f7-3ff2-5559-8b0b-a74b62b39437/scratchpad/out';
fs.mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
p.setDefaultTimeout(400000);
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil:'domcontentloaded', timeout:300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout:400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily','gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1400);
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout:400000 });

// KEYBOARD steering — no synthetic finger, so #joy stays display:none like real
// one-thumb play between drags.
await p.evaluate(() => {
  window.__RR = window.__renderer.render.bind(window.__renderer);
  window.__stub = () => { window.__renderer.render = () => {}; };
  window.__unstub = () => { window.__renderer.render = window.__RR; };
  const key = (type, code) => dispatchEvent(new KeyboardEvent(type, { code, key: code, bubbles: true }));
  let held = null;
  const tick = () => {
    const vs = window.__voidState(); let best=null, bd=1e9;
    for (const e of window.__edibles) {
      if (e.eaten || !e.mesh?.visible || e.radius > vs.r*0.92) continue;
      const dx=e.mesh.position.x-vs.x, dz=e.mesh.position.z-vs.z; const d=dx*dx+dz*dz;
      if (d<bd){bd=d;best={dx,dz};}
    }
    const want = new Set();
    if (best) {
      if (best.dz < -1) want.add('KeyW'); if (best.dz > 1) want.add('KeyS');
      if (best.dx < -1) want.add('KeyA'); if (best.dx > 1) want.add('KeyD');
    }
    for (const c of ['KeyW','KeyA','KeyS','KeyD']) {
      const on = window.__held?.has(c);
      if (want.has(c) && !on) { key('keydown', c); (window.__held ||= new Set()).add(c); }
      if (!want.has(c) && on) { key('keyup', c); window.__held.delete(c); }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

// probe of what is actually drawn on the void
await p.evaluate(() => {
  window.__probe = () => {
    const THREE = window.__THREE, cam = window.__cam, vs = window.__voidState();
    const w = innerWidth, h = innerHeight;
    const pv = new THREE.Vector3(vs.x, 0, vs.z).project(cam);
    const cx = (pv.x*0.5+0.5)*w, cy = (-pv.y*0.5+0.5)*h;
    const pe = new THREE.Vector3(vs.x+vs.r, 0, vs.z).project(cam);
    const rpx = Math.abs((pe.x*0.5+0.5)*w - cx);
    const joy = document.getElementById('joy'), nub = document.getElementById('joyNub');
    const vis = el => { if(!el) return false; const cs=getComputedStyle(el);
      return cs.display!=='none' && cs.visibility!=='hidden' && Number(cs.opacity)>0.05; };
    const rect = el => { const r=el.getBoundingClientRect(); return {l:+r.left.toFixed(1),t:+r.top.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1)}; };
    const over = r => {  // fraction of the void's FACE disc (0.72r) the box covers
      const fr = rpx*0.72;
      const ox = Math.max(0, Math.min(cx+fr, r.l+r.w) - Math.max(cx-fr, r.l));
      const oy = Math.max(0, Math.min(cy+fr, r.t+r.h) - Math.max(cy-fr, r.t));
      return +(ox*oy/(Math.PI*fr*fr||1)).toFixed(3);
    };
    const bubs=[], flts=[];
    for (const el of document.querySelectorAll('.vb')) if (vis(el) && el.textContent) {
      const r = rect(el); bubs.push({ txt: el.textContent.slice(0,40), ...r, faceCov: over(r) }); }
    for (const el of document.querySelectorAll('.vf.go')) if (vis(el) && el.textContent) {
      const r = rect(el); flts.push({ txt: el.textContent.slice(0,20), ...r, faceCov: over(r) }); }
    const combo = document.getElementById('combo');
    return { t:+window.__matchState().t.toFixed(1), cx:+cx.toFixed(1), cy:+cy.toFixed(1), rpx:+rpx.toFixed(1),
      findRingVisible: !!window.__scene.children.find(o=>o.geometry?.type==='RingGeometry'&&o.visible),
      joy: vis(joy) ? rect(joy) : null, nub: vis(nub) ? rect(nub) : null,
      combo: combo && vis(combo) ? { ...rect(combo), z:getComputedStyle(combo).zIndex, faceCov: over(rect(combo)) } : null,
      bubs, flts };
  };
});

const log = [];
const MARKS = [5, 20, 40, 60, 88, 110, 130, 150, 163, 172];
for (const m of MARKS) {
  await p.evaluate(() => window.__stub());
  await p.waitForFunction(t => (window.__matchState?.().t ?? 0) > t, m, { timeout: 900000 });
  await p.evaluate(() => window.__unstub());
  // sample the DOM many times across a few seconds of game time to catch bubbles
  for (let i=0;i<40;i++){ log.push(await p.evaluate(()=>window.__probe())); await p.waitForTimeout(60); }
  await p.screenshot({ path: `${OUT}/${WORLD}-t${m}.png` });
}
fs.writeFileSync(`${OUT}/${WORLD}-log.json`, JSON.stringify(log,null,1));

// summary
const nb = log.filter(s=>s.bubs.length).length;
const hit = log.flatMap(s=>s.bubs).filter(x=>x.faceCov>0.02);
const fhit = log.flatMap(s=>s.flts).filter(x=>x.faceCov>0.02);
console.log(`WORLD=${WORLD} samples=${log.length}`);
console.log(`  joy visible in ${log.filter(s=>s.joy).length}/${log.length} samples (keyboard steering)`);
console.log(`  findRing visible in ${log.filter(s=>s.findRingVisible).length}/${log.length}`);
console.log(`  samples with >=1 bubble: ${nb}; bubble instances: ${log.reduce((a,s)=>a+s.bubs.length,0)}`);
console.log(`  bubbles covering >2% of face disc: ${hit.length}  max=${Math.max(0,...hit.map(x=>x.faceCov))}`);
console.log(`  floaters covering >2% of face disc: ${fhit.length} max=${Math.max(0,...fhit.map(x=>x.faceCov))}`);
console.log(`  combo element seen: ${log.filter(s=>s.combo).length}`);
console.log(`  void rpx range: ${Math.min(...log.map(s=>s.rpx)).toFixed(0)}..${Math.max(...log.map(s=>s.rpx)).toFixed(0)}`);
await b.close();

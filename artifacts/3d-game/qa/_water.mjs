import { chromium } from 'playwright';
import fs from 'node:fs';
// THE WATER CATEGORY IS THE CANAL BAND, NOT DEEP WATER. qa/placement.mjs:186
// registers the canal as a road whose kind is 'water', so a prop files here
// when its FOOTPRINT CENTRE (not its origin) is within CANAL_HALF of the
// centreline. Two earlier versions of this probe asked about deep water and
// about the mesh origin, and both reported a confident zero against the
// audit's six.
const src = fs.readFileSync('src/proto3d/lantern.ts', 'utf8');
const CANAL_HALF = +/export const CANAL_HALF = (\d+);/.exec(src)[1];
const CANAL = JSON.parse('[' + /export const CANAL: Pt\[\] = \[([\s\S]*?)\];/.exec(src)[1]
  .replace(/\/\/[^\n]*/g, '').replace(/\s+/g, '').replace(/,$/, '') + ']');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox','--use-gl=angle','--use-angle=swiftshader'] });
const p = await b.newPage({ viewport:{width:430,height:932}, deviceScaleFactor:1 });
p.setDefaultTimeout(400000);
await p.route('**/functions/v1/ingest-events', r => r.fulfill({status:200, body:'{}'}));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1');
  localStorage.setItem('voidUnlocked','maple,pirate,gameday,lantern,powder,skylark'); } catch {} });
await p.goto('http://127.0.0.1:4177/?w=lantern', { waitUntil:'domcontentloaded', timeout:300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout:400000 });
await p.waitForTimeout(4000);
const out = await p.evaluate(({ CANAL, CANAL_HALF }) => {
  const rows = [];
  window.__edibles.forEach((e, i) => {
    const m = e.mesh; if (!m) return;
    const ud = m.userData || {};
    if (ud.mover || ud.afloat) return;
    // the audit judges a prop by where its FOOTPRINT sits, not its origin —
    // qa/placement.mjs:363 tests p.cx/p.cz, the centre of the ground rectangle
    const f = window.__groundFootprint ? window.__groundFootprint(m) : null;
    const c = Math.cos(m.rotation.y), sn = Math.sin(m.rotation.y);
    const cx = f ? m.position.x + f.cx * c + f.cz * sn : m.position.x;
    const cz = f ? m.position.z - f.cx * sn + f.cz * c : m.position.z;
    // world units -> 3D is x/20 - 300 in this game; the audit converts the
    // canal the same way before comparing, so do it here too
    const W = (v) => v * 0.05 - 300;
    // …AND OVER NINE POINTS, NOT ONE. qa/placement.mjs:341 samples the centre,
    // the four corners and the four edge midpoints, taking the minimum — so a
    // prop files when any PART of its footprint touches the band. Asking about
    // the centre alone found 2 where the audit finds 6.
    const cc = Math.cos(m.rotation.y), ss = Math.sin(m.rotation.y);
    const hx = f ? f.hx : 0, hz = f ? f.hz : 0;
    const lcx = f ? f.cx : 0, lcz = f ? f.cz : 0;
    const corner = (sx, sz) => [
      m.position.x + (lcx + sx * hx) * cc + (lcz + sz * hz) * ss,
      m.position.z - (lcx + sx * hx) * ss + (lcz + sz * hz) * cc];
    const cs = [corner(-1,-1), corner(1,-1), corner(1,1), corner(-1,1)];
    const samples = [[cx, cz], ...cs,
      ...cs.map((q, k) => [(q[0] + cs[(k+1)%4][0]) / 2, (q[1] + cs[(k+1)%4][1]) / 2])];
    let best = Infinity;
    for (const [sx, sz] of samples)
    for (let k = 0; k < CANAL.length - 1; k++) {
      const ax = W(CANAL[k][0]), az = W(CANAL[k][1]);
      const bx = W(CANAL[k + 1][0]), bz = W(CANAL[k + 1][1]);
      const dx = bx - ax, dz = bz - az; const L = dx * dx + dz * dz;
      let t = L ? ((sx - ax) * dx + (sz - az) * dz) / L : 0;
      t = Math.max(0, Math.min(1, t));
      const px = ax + t * dx, pz = az + t * dz;
      const d = Math.hypot(sx - px, sz - pz);
      if (d < best) best = d;
    }
    if (best >= W(CANAL_HALF) - W(0)) return;
    const depth = (W(CANAL_HALF) - W(0)) - best;
    rows.push({ i, r: e.radius, qk: ud.qk || '', kind: ud.kind || '',
      authored: !!ud.authored, at: [+cx.toFixed(1), +cz.toFixed(1)],
      depth: +depth.toFixed(2) });
  });
  return rows;
}, { CANAL, CANAL_HALF });
console.log(`${out.length} non-afloat props inside the canal band (half ${CANAL_HALF} world):`);
for (const o of out) console.log(`  #${o.i} r=${o.r} qk=${o.qk||'-'} kind=${o.kind||'-'}`
  + `${o.authored ? ' AUTHORED' : ' scattered'} at ${o.at} depth ${o.depth}`);
await b.close();

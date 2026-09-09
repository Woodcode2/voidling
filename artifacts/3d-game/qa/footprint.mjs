// FOOTPRINT — does the game's idea of a prop's ground rectangle match the
// audit's?
//
//   node qa/footprint.mjs [worlds] [port]
//
// src/proto3d/footprint.ts computes a prop's ground rectangle so the placement
// hash can reserve the ground a prop actually stands on instead of a circle
// around it. qa/placement.mjs computes the same rectangle a different way — it
// walks every vertex, this walks each child's bounding box — and the whole
// shape change rests on the two agreeing. So this measures them against each
// other on every prop in the game rather than assuming.
//
// IT CALLS THE REAL FUNCTION. The first version of this probe re-implemented
// src/proto3d/footprint.ts inside the page and graded that against a
// re-implementation of the audit — two of my own copies, agreeing with each
// other and proving nothing. Worse, the copy of the AUDIT was wrong: it took
// the prop's local frame via worldToLocal, which divides scale out, where
// qa/placement.mjs:277 builds rotation-Y-plus-translation and keeps it. On
// Powder, where props are scaled, that fake disagreement reported 3,011 props
// as faulty when the module was correct.
//
// So: the game side calls window.__groundFootprint, which is the shipped
// function. The audit side is a line-for-line replica of qa/placement.mjs's
// own walk. Anything they disagree about is real.
//
// THE BAR is asymmetric on purpose.
//   F1  no prop's rectangle is SMALLER than the audit's on either axis by more
//       than 1mm — that would mean the game reserves less ground than the prop
//       occupies, which is the bug this is meant to remove.
//   F2  the median prop is within 5% on both axes, and no more than 2% of
//       props are over by more than half a unit — over-reporting costs density,
//       which is the thing the change is FOR.
import { chromium } from 'playwright';
const ALL = 'maple,pirate,gameday,lantern,powder,skylark';
const ARGV = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const WORLDS = (ARGV[0] === 'all' ? ALL : (ARGV[0] || ALL)).split(',');
const PORT = ARGV[1] || '4177';
const GROUND_H = 1.0;

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
let fail = 0;
for (const wid of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  p.setDefaultTimeout(400000);
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark'); } catch {} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.waitForTimeout(3000);
  const r = await p.evaluate((GH) => {
    const rows = [];
    const foot = window.__groundFootprint;
    if (!foot) return rows;
    const any = window.__edibles.find((e) => e.mesh);
    if (!any) return rows;
    const V = any.mesh.position.constructor;
    const v = new V();
    for (const e of window.__edibles) {
      const m = e.mesh; if (!m || m.userData.mover) continue;
      m.updateWorldMatrix(false, true);
      // ── the AUDIT, line for line (qa/placement.mjs:277-297): a frame of
      //    rotation-about-Y plus translation and nothing else, so vertices land
      //    in WORLD units with scale baked in, filtered on true world height.
      const cy = Math.cos(m.rotation.y), sy = Math.sin(m.rotation.y);
      let ax0 = Infinity, ax1 = -Infinity, az0 = Infinity, az1 = -Infinity, nv = 0;
      m.traverse((o) => {
        if (!o.isMesh || !o.geometry) return;
        const pos = o.geometry.attributes && o.geometry.attributes.position;
        if (!pos) return;
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i);
          o.localToWorld(v);
          nv++;
          if (v.y > GH) continue;
          const dx = v.x - m.position.x, dz = v.z - m.position.z;
          const lx = dx * cy - dz * sy, lz = dx * sy + dz * cy;
          if (lx < ax0) ax0 = lx; if (lx > ax1) ax1 = lx;
          if (lz < az0) az0 = lz; if (lz > az1) az1 = lz;
        }
      });
      if (!nv) continue;
      // ── the GAME: the shipped function, called for real
      const f = foot(m);
      if (ax0 === Infinity) { if (f) rows.push({ r: e.radius, qk: m.userData.qk || '', ahx: 0, ahz: 0, ghx: f.hx, ghz: f.hz }); continue; }
      if (!f) { rows.push({ r: e.radius, qk: m.userData.qk || '', ahx: (ax1 - ax0) / 2, ahz: (az1 - az0) / 2, ghx: 0, ghz: 0 }); continue; }
      rows.push({ r: e.radius, qk: m.userData.qk || '',
        ahx: (ax1 - ax0) / 2, ahz: (az1 - az0) / 2, ghx: f.hx, ghz: f.hz });
    }
    return rows;
  }, GROUND_H);
  await p.close();
  if (!r.length) { console.log(`${wid.padEnd(9)} no props measured`); fail++; continue; }
  const under = r.filter((q) => q.ghx < q.ahx - 0.001 || q.ghz < q.ahz - 0.001);
  const ratios = r.flatMap((q) => [q.ahx > 0.01 ? q.ghx / q.ahx : 1, q.ahz > 0.01 ? q.ghz / q.ahz : 1]).sort((a, c) => a - c);
  const med = ratios[ratios.length >> 1];
  const fat = r.filter((q) => (q.ghx - q.ahx) > 0.5 || (q.ghz - q.ahz) > 0.5);
  const f1 = under.length === 0;
  const f2 = med <= 1.05 && fat.length / r.length <= 0.02;
  if (!f1 || !f2) fail++;
  console.log(`${wid.padEnd(9)} ${r.length} props  median game/audit ${med.toFixed(3)}  `
    + `smaller-than-audit ${under.length}  over-by-half-a-unit ${fat.length} (${(100 * fat.length / r.length).toFixed(1)}%)  `
    + `${f1 ? 'F1 ok' : 'F1 FAIL'}  ${f2 ? 'F2 ok' : 'F2 FAIL'}`);
  for (const q of under.slice(0, 3))
    console.log(`          smaller: r=${q.r} ${q.qk} game ${q.ghx.toFixed(2)}x${q.ghz.toFixed(2)} vs audit ${q.ahx.toFixed(2)}x${q.ahz.toFixed(2)}`);
  for (const q of fat.slice(0, 3))
    console.log(`          fat:     r=${q.r} ${q.qk} game ${q.ghx.toFixed(2)}x${q.ghz.toFixed(2)} vs audit ${q.ahx.toFixed(2)}x${q.ahz.toFixed(2)}`);
}
await b.close();
console.log(fail ? `FOOTPRINT: ${fail} world(s) FAIL` : 'FOOTPRINT: ok');
process.exit(fail ? 1 : 0);

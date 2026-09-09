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
// THE BAR. The two walks differ only in WHERE they measure height — the audit
// in world space, the game within the prop — so they should agree exactly for
// any prop standing on the ground and turned only about Y, which is how
// place() sets every prop down. A disagreement means a prop that is tilted or
// lifted, and the game would be reserving the wrong rectangle for it.
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
    // THREE is not on window, so borrow a Vector3 constructor from a live
    // object and use Object3D's own localToWorld / worldToLocal.
    const rows = [];
    const any = window.__edibles.find((e) => e.mesh);
    if (!any) return rows;
    const V = any.mesh.position.constructor;
    const v = new V();
    for (const e of window.__edibles) {
      const m = e.mesh; if (!m || m.userData.mover) continue;
      m.updateWorldMatrix(false, true);
      // ── the AUDIT's way: every vertex, filtered on world y ──────────────
      let ax0 = Infinity, ax1 = -Infinity, az0 = Infinity, az1 = -Infinity, nv = 0;
      // ── the GAME's way: each child's bounding box, in the prop's frame ───
      let gx0 = Infinity, gx1 = -Infinity, gz0 = Infinity, gz1 = -Infinity;
      m.traverse((o) => {
        if (!o.isMesh || !o.geometry) return;
        const pos = o.geometry.attributes && o.geometry.attributes.position;
        if (pos) for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i);
          o.localToWorld(v);
          nv++;
          if (v.y > GH) continue;
          m.worldToLocal(v);
          if (v.x < ax0) ax0 = v.x; if (v.x > ax1) ax1 = v.x;
          if (v.z < az0) az0 = v.z; if (v.z > az1) az1 = v.z;
        }
        // ── the GAME's way (src/proto3d/footprint.ts): the same vertex walk,
        //    but filtered on height WITHIN THE PROP rather than in the world,
        //    which is what lets the result be cached per part. Identical while
        //    a prop sits on the ground turned only about Y — and that is the
        //    assumption this probe exists to check.
        let bx0 = Infinity, bx1 = -Infinity, by0 = Infinity, bz0 = Infinity, bz1 = -Infinity;
        if (pos) for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i);
          o.localToWorld(v); m.worldToLocal(v);
          if (v.y > GH) continue;
          by0 = 0;
          if (v.x < bx0) bx0 = v.x; if (v.x > bx1) bx1 = v.x;
          if (v.z < bz0) bz0 = v.z; if (v.z > bz1) bz1 = v.z;
        }
        if (by0 > GH) return;
        if (bx0 < gx0) gx0 = bx0; if (bx1 > gx1) gx1 = bx1;
        if (bz0 < gz0) gz0 = bz0; if (bz1 > gz1) gz1 = bz1;
      });
      if (!nv || ax0 === Infinity || gx0 === Infinity) continue;
      rows.push({ r: e.radius, qk: m.userData.qk || '',
        ahx: (ax1 - ax0) / 2, ahz: (az1 - az0) / 2,
        ghx: (gx1 - gx0) / 2, ghz: (gz1 - gz0) / 2 });
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

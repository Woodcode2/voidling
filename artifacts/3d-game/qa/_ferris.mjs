// WHERE IS THE FERRIS WHEEL, actually — asked of the built scene rather than of
// the arithmetic. island.ts had a 20x scale error putting Maple's 16-unit GLB
// landmark in the sea off the west shore; the maths is checked outside the browser
// but only the scene can say the fix reached the model.
//
//   node qa/_ferris.mjs [port]
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4177';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
p.on('pageerror', (e) => console.log('  [pageerror] ' + e.message.split('\n')[0]));
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try { localStorage.clear();
  localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1'); localStorage.setItem('voidMute','1');
  localStorage.setItem('voidUnlocked','maple,pirate,gameday,lantern,powder,skylark');
} catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=maple&manual=1`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__menuState && window.__menuState().menuMode, null, { timeout: 420000 });
// the GLB loads async — give the loader real time under software GL
await p.waitForTimeout(15000);
const r = await p.evaluate(() => {
  const S = window.__scene, T = window.__THREE;
  // the wheel is ~16 units tall and its group sits at y=0; find the tall thing
  // near either candidate spot rather than trusting a name the GLB may not carry
  const spots = { shipped: [-248.25, 131.75], fixed: [-134.25, -115.25] };
  const out = {};
  for (const [k, [x, z]] of Object.entries(spots)) {
    let best = null, bd = 1e9;
    for (const o of S.children) {
      if (!o.isGroup && !o.isObject3D) continue;
      const d = Math.hypot(o.position.x - x, o.position.z - z);
      if (d < bd && d < 3) {
        const bb = new T.Box3().setFromObject(o);
        const h = bb.max.y - bb.min.y;
        if (h > 8 && h < 40) { bd = d; best = { h: +h.toFixed(1), x: +o.position.x.toFixed(2), z: +o.position.z.toFixed(2) }; }
      }
    }
    out[k] = best;
  }
  // and the ground height under the fixed spot, so "on land" is checked in 3D
  const yAt = window.__groundY ? window.__groundY(-134.25, -115.25) : null;
  return { ...out, groundY: yAt };
});
console.log(JSON.stringify(r, null, 2));
await b.close();
const ok = !!r.fixed && !r.shipped;
console.log(ok
  ? `PASS — a ${r.fixed.h}-unit landmark stands at (${r.fixed.x}, ${r.fixed.z}), the fairground midway, and nothing stands at the old sea position`
  : `FAIL — fixed spot ${r.fixed ? 'has the wheel' : 'is EMPTY'}, old sea spot ${r.shipped ? 'STILL has a landmark' : 'is empty'}`);
process.exit(ok ? 0 : 1);

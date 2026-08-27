// DO THE SNOWMEN FACE THE LENS? — owner decision 3 ("sure"), round 2b.
//
// The claim: every snowman's placement yaw sits inside -PI/4 +/- PI/3 (the
// camera-facing arc for a +X-front prop under camOffset (0.62, 0.92, 0.62)),
// no two share a yaw, and no 5-degree bucket holds the field.
//
// FAILS BEFORE the patch: the uniform-spin build admits ~1/3 of snowmen to
// the arc, so all-inside is green with probability (1/3)^N — simulated
// 1/10000 at N=8, and N here runs in the tens.
//
// LIMIT, stated: this probe shares the -PI/4 constant with the patch, so it
// verifies the patch LANDED AS DESIGNED and cannot catch a wrong-signed
// DESIGN. The screenshot leg in the proposal is the independent check for
// the sign. Run both once; only this one gates thereafter.
//
// TRAP (variety.mjs, verbatim): voidUnlocked is a COMMA-JOINED STRING.
// TRAP (variety.mjs, verbatim): props register asynchronously — wait for a
// stable edible count before counting anything.
//
//   node qa/snowyaw.mjs [port]
import { chromium } from 'playwright';

const PORT = process.argv[2] || '4177';
const CEN = -Math.PI / 4, HALF = Math.PI / 3 + 1e-6;
const MIN_N = 8;          // fewer tagged snowmen = census broken, refuse to conclude
const MAX_BUCKET = 0.25;  // anti-drill: top 5-deg bucket holds at most 25%

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
  localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder');
} catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=powder`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.waitForFunction(() => {
  const n = window.__edibles.length;
  if (window.__lastN !== n) { window.__lastN = n; window.__stableSince = performance.now(); return false; }
  return performance.now() - (window.__stableSince || 0) > 2000;
}, null, { timeout: 300000, polling: 250 });

const yaws = await p.evaluate(() =>
  window.__edibles.filter(e => e.mesh?.userData?.qk === 'snowman').map(e => e.mesh.rotation.y));
await b.close();

if (yaws.length < MIN_N) {
  console.log(`FAIL — only ${yaws.length} snowman-tagged props found (need ${MIN_N}): `
    + `the census or the tags are broken; refusing to conclude`);
  process.exit(1);
}
const circ = (a, c) => { const d = Math.abs(a - c) % (Math.PI * 2); return d > Math.PI ? Math.PI * 2 - d : d; };
const outside = yaws.filter(y => circ(y, CEN) > HALF).length;
const buckets = new Map();
for (const y of yaws) {
  const deg = Math.round((((y % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) * 180 / Math.PI / 5) * 5;
  buckets.set(deg, (buckets.get(deg) || 0) + 1);
}
const top = Math.max(...buckets.values());
const dup = yaws.length !== new Set(yaws).size;
console.log(`  ${yaws.length} snowmen — ${outside} outside 315+/-60deg, `
  + `top 5-deg bucket ${top} (${(top / yaws.length * 100).toFixed(0)}%) across ${buckets.size} buckets, `
  + `exact duplicates: ${dup}`);
const bad = [];
if (outside) bad.push(`${outside} snowmen face outside the camera arc`);
if (dup) bad.push('two snowmen share a bit-identical yaw');
if (top / yaws.length > MAX_BUCKET) bad.push(`one 5-deg bucket holds ${(top / yaws.length * 100).toFixed(0)}% (bar ${MAX_BUCKET * 100}%) — drilled`);
console.log(bad.length ? 'FAIL — ' + bad.join('; ') : 'PASS — every snowman faces the lens arc, no two alike');
process.exit(bad.length ? 1 : 0);

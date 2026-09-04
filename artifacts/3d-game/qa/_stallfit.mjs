// LANTERN NIGHT: does each stallholder stand behind a stall that exists?
// island.ts:5616 places the stalls with LN.stallSlots(Math.random, 230, 30);
// life.ts:3897 re-derives the same call for the stallholders — a second draw
// from a stream that has moved on, so the jitter differs. island.ts:1757 bakes
// the ground's warm light pools from stallSlots(rnd) at the DEFAULT pitch 210.
// This asks the scene where the stalls and the people actually are.
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4177';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark'); } catch {} let s = 7; Math.random = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; });
await p.goto(`http://127.0.0.1:${PORT}/?w=lantern`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
const r = await p.evaluate(() => {
  // the stalls are dropped with qk 'house' at radius 2.4 (island.ts:5618)
  const stalls = window.__edibles.filter((e) => e.mesh.userData?.qk === 'house' && Math.abs(e.radius - 2.4) < 0.01)
    .map((e) => [e.mesh.position.x, e.mesh.position.z]);
  // the stallholders are rooted people: movers with a tiny tether, standing
  // near a stall by intent. Take every person and measure to the nearest stall.
  const people = [];
  window.__scene.traverse((o) => { if (o.userData?.mover && o.userData.qk !== 'car') people.push([o.position.x, o.position.z]); });
  const near = (x, z, list) => { let d = Infinity; for (const [a, c] of list) { const q = Math.hypot(x - a, z - c); if (q < d) d = q; } return d; };
  const dists = people.map(([x, z]) => near(x, z, stalls)).sort((a, c) => a - c);
  // …and the reverse: how far is each stall from its nearest person?
  const rev = stalls.map(([x, z]) => near(x, z, people)).sort((a, c) => a - c);
  return { stalls: stalls.length, people: people.length,
    peopleWithin3: dists.filter((d) => d < 3).length, peopleWithin6: dists.filter((d) => d < 6).length,
    stallsWithPersonWithin3: rev.filter((d) => d < 3).length, stallMedianToPerson: +rev[Math.floor(rev.length / 2)].toFixed(2) };
});
await b.close();
console.log(`  lantern: ${r.stalls} stalls (qk house r2.4), ${r.people} people`);
console.log(`  people within 3u of a stall: ${r.peopleWithin3}   within 6u: ${r.peopleWithin6}`);
console.log(`  stalls with a person inside 3u: ${r.stallsWithPersonWithin3} of ${r.stalls}   median stall-to-nearest-person ${r.stallMedianToPerson}u`);
console.log(r.stallsWithPersonWithin3 >= r.stalls * 0.6
  ? `PASS — stallfit: the stallholders are at their stalls`
  : `FAIL — stallfit: only ${r.stallsWithPersonWithin3} of ${r.stalls} stalls have anyone within 3 units; the stallholders were re-derived from a stream that had moved on (life.ts:3897)`);
if (r.stallsWithPersonWithin3 < r.stalls * 0.6) process.exitCode = 1;

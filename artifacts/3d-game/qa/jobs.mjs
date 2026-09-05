// JOBS — does everybody on SKYLARK FIELD have one? (brief §3D)
//
// The owner's ask, verbatim: "I want characters in this level to have a job.
// Some guys are cleaning and have bubbles. Some people help tourists." On the
// day this was written the whole crowd was one role ('kid') and zero props:
// 455 people fetching nothing, dressed for Maple's suburb.
//
// Counts every person (a mover with userData.limbs) by userData.role and by
// the district under their feet, and holds three bars:
//   1. >= 90% of people carry a role that is not the bare default ('kid'
//      counts — a child is a child — but an undressed makePerson does not)
//   2. every role in the brief's table is present, and the big ones at scale
//   3. >= 60% of adults carry a hand prop (a job you can see from 46 degrees up)
//
//   node qa/jobs.mjs [port] [world=skylark]
import { chromium } from 'playwright';
import { ALL_WORLDS } from './worlds.mjs';

const A = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const PORT = A[0] || '4177';
const WORLD = A[1] || 'skylark';
// the brief's table, as minimums a build must hold (the table's own numbers
// are targets; these are the floor below which the field stops reading)
const TABLE = {
  // pilots stand only at STANDING envelopes (38 on the field), drivers two to a
  // trailer (5 trailers): the floors follow what the field can seat
  crew: 120, pilot: 30, marshal: 16, cleaner: 10, tealady: 5, vancrew: 4, guide: 6,
  tourist: 40, photographer: 4, ticket: 2, driver: 8, shepherd: 1, spectator: 30, kid: 15, pym: 1, dogwalker: 3,
};

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
p.on('pageerror', (e) => console.log(`  [pageerror] ${e.message.split('\n')[0]}`));
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(({ unlock }) => {
  try { localStorage.clear(); localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1'); localStorage.setItem('voidUnlocked', unlock); } catch { }
  let s = 7; Math.random = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}, { unlock: ALL_WORLDS.join(',') });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 600000 });
await p.evaluate(() => document.getElementById('btnPlay')?.click());
await p.waitForTimeout(1500);
await p.evaluate((w) => document.querySelector(`#worldRow .wCard[data-world="${w}"]`)?.click(), WORLD);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 1, null, { timeout: 600000 });

const c = await p.evaluate(() => {
  const out = { people: 0, roled: 0, adults: 0, adultsWithProp: 0, roles: {}, byDistrict: {}, unroled: {} };
  for (const e of window.__edibles) {
    const u = e.mesh.userData;
    if (!u.limbs) continue;
    out.people++;
    const role = u.role || null;
    const dist = window.__biomeAt?.(e.mesh.position.x, e.mesh.position.z) || '?';
    if (role) { out.roled++; out.roles[role] = (out.roles[role] || 0) + 1; }
    else out.unroled[dist] = (out.unroled[dist] || 0) + 1;
    (out.byDistrict[dist] ||= {})[role || '(none)'] = ((out.byDistrict[dist] ||= {})[role || '(none)'] || 0) + 1;
    if (u.role !== 'kid') { out.adults++; if (u.prop || u.propL) out.adultsWithProp++; }   // nothing stamps userData.kid; the role does
  }
  return out;
});
await b.close();

const fails = [];
const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);
console.log(`  ${c.people} people, ${c.roled} in a role (${pct(c.roled, c.people)}%), ${c.adults} adults of whom ${c.adultsWithProp} carry something (${pct(c.adultsWithProp, c.adults)}%)`);
console.log('  roles: ' + Object.entries(c.roles).sort((x, y) => y[1] - x[1]).map(([r, n]) => `${r} ${n}`).join(', '));
for (const [d, roles] of Object.entries(c.byDistrict)) console.log(`    ${d.padEnd(12)} ${Object.entries(roles).sort((x, y) => y[1] - x[1]).map(([r, n]) => `${r} ${n}`).join(', ')}`);
if (pct(c.roled, c.people) < 90) fails.push(`only ${pct(c.roled, c.people)}% of people have a role (bar 90) — unroled by district: ${JSON.stringify(c.unroled)}`);
for (const [r, min] of Object.entries(TABLE)) if ((c.roles[r] || 0) < min) fails.push(`${r}: ${c.roles[r] || 0} cast against a floor of ${min}`);
if (pct(c.adultsWithProp, c.adults) < 60) fails.push(`only ${pct(c.adultsWithProp, c.adults)}% of adults carry a hand prop (bar 60)`);
console.log('');
for (const f of fails) console.log(`  ✗ ${f}`);
console.log(fails.length ? `FAIL — jobs: ${fails.length} bar(s) short; somebody on ${WORLD} is standing around` : `PASS — jobs: everybody on ${WORLD} has one, and you can see it from the sky`);
process.exit(fails.length ? 1 : 0);

// MATCH 2 MUST NOT BE MATCH 1 — the §4.5 gate (docs/AAA-BRIEF.md).
//
//   node qa/vary.mjs [port] [world ...]
//
// The audit's finding was that a rematch replays the match before it: same
// middle beats in the same slots, same lighting. The matchdeck now deals
// both, deterministically from the world's match count. This boots the same
// world as match 0, 1 and 2 (by seeding the count a real profile would hold)
// and asserts:
//
//   • match 0 IS the shipped baseline — the owner's hand-tuned first
//     impression, and the state every other instrument measures
//   • consecutive matches change BOTH middle slots
//   • the hour changes with the match (on worlds that author >1 hour;
//     Lantern authors exactly one, deliberately — the night IS the world)
//   • the opener and the finale never move
import { chromium } from 'playwright';

const PORT = process.argv[2] || '4177';
const args = process.argv.slice(3);
const WORLDS = args.length ? args : ['maple', 'lantern', 'powder'];

// the shipped middle pair per world — match 0 must deal exactly this
const BASELINE = {
  maple: ['maple.dog', 'maple.parade'],
  pirate: ['pirate.parrot', 'pirate.dance'],
  gameday: ['gameday.bandfield', 'gameday.dogs'],
  lantern: ['lantern.free', 'lantern.drum'],
  powder: ['powder.lake', 'powder.contest'],
};
const HOURS_AUTHORED = { maple: 3, pirate: 3, gameday: 3, lantern: 1, powder: 3 };

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const fails = [];

for (const world of WORLDS) {
  const hands = [];
  for (let k = 0; k <= 2; k++) {
    const p = await b.newPage({ viewport: { width: 430, height: 932 } });
    p.on('pageerror', (e) => { console.log('  PAGEERR ' + String(e).slice(0, 100)); fails.push(`${world}: page error`); });
    await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
    await p.addInitScript((seed) => { try {
      localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
      localStorage.setItem('voidMute', '1');
      localStorage.setItem('voidDailyLast', new Date().toDateString());
      localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder');
      localStorage.setItem('voidMatchN', seed);
    } catch { /* private */ } }, JSON.stringify({ [world]: k }));
    await p.goto(`http://127.0.0.1:${PORT}/?w=${world}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
    await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
    await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
      if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
    await p.evaluate(() => document.getElementById('btnPlay')?.click());
    await p.waitForTimeout(1200);
    await p.evaluate((w) => document.querySelector(`#worldRow .wCard[data-world="${w}"]`)?.click(), world);
    await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
    const snap = await p.evaluate(() => {
      const bs = window.__beats.map((x) => ({ id: x.id ?? null, title: x.title, at: Math.round(x.at) }));
      // the KEY light — the brightest directional. Keying on castShadow was
      // this probe's first bug: under swiftshader the quality ladder has
      // already demoted shadows off by the first match frame, so the traverse
      // found nothing and read 0 on every run — and the FAIL blamed the game.
      // The key is always the brightest directional by construction
      // (RIG.sunI ≥ 2.29 against a fill ≤ 0.69, both riding the same hour).
      let sunI = 0, sunHex = '';
      window.__scene.traverse((o) => {
        if (o.isDirectionalLight && o.intensity > sunI) { sunI = o.intensity; sunHex = o.color.getHexString(); }
      });
      return { deal: window.__deal, beats: bs, sunI: +sunI.toFixed(3), sunHex };
    });
    hands.push(snap);
    await p.close();
  }

  const mids = (h) => [h.beats[1].id, h.beats[2].id];
  const line = (k) => `n=${k} mids=[${mids(hands[k]).join(', ')}] hour=${hands[k].deal.hour} sun=${hands[k].sunI}@${hands[k].sunHex}`;
  console.log(`  ${world}`);
  for (let k = 0; k <= 2; k++) console.log(`    ${line(k)}`);

  // 1. match 0 is the shipped baseline
  if (JSON.stringify(mids(hands[0])) !== JSON.stringify(BASELINE[world]))
    fails.push(`${world}: match 0 dealt [${mids(hands[0])}] — not the shipped baseline`);
  if (hands[0].deal.hour !== 0) fails.push(`${world}: match 0 dealt hour ${hands[0].deal.hour}, not the shipped rig`);
  // 2. consecutive matches change BOTH middle slots
  for (let k = 1; k <= 2; k++) {
    const a = mids(hands[k - 1]), c = mids(hands[k]);
    if (a[0] === c[0] || a[1] === c[1])
      fails.push(`${world}: match ${k} repeats a middle slot of match ${k - 1} ([${a}] -> [${c}])`);
  }
  // 3. the hour moves where more than one is authored — and the LIGHT moves with it
  if (HOURS_AUTHORED[world] > 1) {
    if (hands[1].deal.hour === hands[0].deal.hour) fails.push(`${world}: match 1 kept match 0's hour`);
    if (hands[1].sunI === hands[0].sunI && hands[1].sunHex === hands[0].sunHex)
      fails.push(`${world}: the hour changed but the key light did not`);
  } else if (hands.some((h) => h.deal.hour !== 0)) {
    fails.push(`${world}: single-hour world dealt a variant hour`);
  }
  // 4. the opener and the finale never move
  for (let k = 1; k <= 2; k++) {
    if (hands[k].beats[0].title !== hands[0].beats[0].title) fails.push(`${world}: the opener moved`);
    if (hands[k].beats[3].title !== hands[0].beats[3].title) fails.push(`${world}: the finale moved`);
  }
}

await b.close();
console.log('\n  ' + (fails.length ? 'FAIL — ' + fails.join('; ') : 'PASS — a rematch never replays the match before it, and match 1 is the shipped baseline') + '\n');
process.exit(fails.length ? 1 : 0);

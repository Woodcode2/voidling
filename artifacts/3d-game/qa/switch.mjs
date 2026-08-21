// THE WORLD-SWITCH RELOAD — the owner's exact reported path, end to end.
//
//   node qa/switch.mjs [world] [port]
//
// Picking a different world REBUILDS THE PAGE (location.href = pathname), and
// the page that comes back has no user activation: nothing on it may sound
// until it is touched. Every music bug this project has had was hardest here,
// and four rounds of engine work treated it as an engine problem. It is a
// design problem: the reload path now lands on TAP TO PLAY, the tap is the
// gesture, and the match begins with its score already decoded — the head
// preload fetches the world's track before the bundle is even parsed.
//
// This walks it exactly as a child does: menu → picker → tap the OTHER world
// → reload → gate → match. Asserts the gate is up, the world track was on the
// wire early, the tap starts the match, and the match has a score promptly.
import { chromium } from 'playwright';

const WORLD = process.argv[2] || 'pirate';
const PORT = process.argv[3] || '4177';

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
const fails = [];
p.on('pageerror', (e) => { console.log('  PAGEERROR ' + String(e).slice(0, 140)); fails.push('page error'); });
const hits = [];
p.on('response', (r) => {
  if (/\/assets\/music\/.+\.mp3$/.test(r.url())) hits.push({ name: r.url().split('/').pop(), at: Date.now() });
});
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidMute', '0');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
  localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern');
} catch { /* private mode */ } });

// page A: maple's menu — the world we are switching AWAY from
await p.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show')
  .forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
if (await p.$('#tapGate.show')) await p.click('#tapGate');
await p.waitForTimeout(600);
await p.click('#btnPlay'); await p.waitForTimeout(900);

// tap the OTHER world's card — this is the reload
const tReload = Date.now();
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
console.log(`  reload survived, page B booted (${((Date.now() - tReload) / 1000).toFixed(1)}s)`);

// the new page must put THIS world's track on the wire before anything else
const trackHit = hits.find((h) => h.name === `${WORLD}.mp3` && h.at > tReload);
console.log(`  ${WORLD}.mp3 requested ${trackHit ? ((trackHit.at - tReload) / 1000).toFixed(1) + 's after the card tap' : 'NEVER'}`);
if (!trackHit) fails.push(`${WORLD}.mp3 never requested on the reloaded page`);

// TAP TO PLAY is the contract: the match must NOT be running yet.
// `.armed` — the gate first shows GETTING READY… and only invites the tap
// once the pack has settled; a tap before that is deliberately inert.
const early = await p.evaluate(() => (window.__matchState?.().t ?? 0));
await p.waitForSelector('#tapGate.show.armed', { timeout: 400000 });
console.log(`  gate up (match t=${early.toFixed(1)} — ${early > 0.5 ? 'MATCH STARTED WITHOUT A TOUCH' : 'holding for the touch'})`);
if (early > 0.5) fails.push('the match started before the gate tap');
await p.click('#tapGate');
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 2, null, { timeout: 900000 });

// and the match has a score: the recording, or the bed while it decodes
let scored = null;
for (let i = 0; i < 40; i++) {
  await p.waitForTimeout(250);
  const m = await p.evaluate(() => window.__music());
  if (m.ctx === 'running' && (m.theme.srcs > 0 || m.synth)) { scored = m.theme.srcs > 0 ? 'recording' : 'bed'; break; }
}
console.log(`  match scored by: ${scored ?? 'NOTHING — silent match'}`);
if (!scored) fails.push('the match played with no score');

await b.close();
console.log('\n  ' + (fails.length ? 'FAIL — ' + fails.join('; ') : `PASS — switch to ${WORLD} lands on the gate, and the tap starts a scored match`) + '\n');
process.exit(fails.length ? 1 : 0);

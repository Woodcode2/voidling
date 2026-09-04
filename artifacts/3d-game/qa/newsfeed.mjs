// THE PAPER, AS A CHILD READS IT — the aired sequence, in order, per world.
//
// The newsroom's structure is already checked: qa/newsarc.mjs proves the four
// beats escalate and never reverse, qa/newsstyle.mjs proves the corpus is not a
// metronome. Neither can answer the owner's actual complaint — "the news is so
// bad… sloppy and not fun" — because both read the POOLS. A child reads a
// SEQUENCE: whatever the picker, the anti-repeat memory, the tier weighting and
// the reaction funnel actually put on the ticker, in order, one after another.
//
//   SEED=7 node qa/newsfeed.mjs [port] [worlds...]   (--cards=N, default 26)
//
// It plays a real match, drives the void through the arc with __setVoidR, pulls
// cards with __news(), and records what the ticker says — brand, headline, the
// beat it belongs to, and the wall position in the arc. Output:
//   qa/out/newsfeed/<world>.txt    the feed, readable top to bottom
//   qa/out/newsfeed/<world>.json   the same with metadata for a judge
//
// It applies three machine bars a sequence can fail that a pool cannot:
//   repeats    the same headline twice inside one match — the anti-repeat
//              memory is per-pool, so two pools can still collide
//   openers    how many cards in a row start with the same word
//   tokens     an unresolved {M}/{D}/{P}/{S} reaching the ticker
// Everything else about whether it is FUNNY is for a reader, and the file it
// writes is what that reader reads.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { ALL_WORLDS } from './worlds.mjs';

const A = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const F = process.argv.slice(2).filter((a) => a.startsWith('--'));
const PORT = A[0] || '4177';
const WORLDS = A.slice(1).length ? A.slice(1) : ALL_WORLDS;
const CARDS = Number((F.find((f) => f.startsWith('--cards=')) || '--cards=26').slice(8));
const SEED = process.env.SEED ? Number(process.env.SEED) : null;
const OUT = 'qa/out/newsfeed';
mkdirSync(OUT, { recursive: true });

let fails = 0;
for (const WORLD of WORLDS) {
  console.log(`== ${WORLD} (${CARDS} cards)`);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  p.on('pageerror', (e) => console.log(`  [pageerror] ${e.message.split('\n')[0]}`));
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript((seed) => {
    try { localStorage.clear(); localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1'); localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark'); } catch { }
    if (seed !== null) { let s = seed >>> 0; Math.random = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  }, SEED);
  await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.evaluate(() => document.getElementById('btnPlay')?.click());
  await p.waitForTimeout(1400);
  await p.evaluate((w) => document.querySelector(`#worldRow .wCard[data-world="${w}"]`)?.click(), WORLD);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 600000 });

  // read whatever the ticker is showing, brand and headline apart
  const read = () => p.evaluate(() => {
    const el = document.getElementById('news');
    if (!el) return null;
    const brand = el.querySelector('i')?.textContent?.trim() || '';
    let head = '';
    for (const n of el.childNodes) if (n.nodeType === 3) head += n.textContent;
    return { brand, head: head.replace(/\s+/g, ' ').trim(), cls: el.className };
  });

  const feed = [];
  // the arc is driven by the void's size: walk it up through the four beats
  // across the run so the sequence a child actually meets is the one recorded
  const RUNGS = [0.9, 0.9, 1.4, 2.2, 3.2, 4.4, 6.0, 8.0, 11.0];
  let last = '';
  for (let i = 0; i < CARDS; i++) {
    const r = RUNGS[Math.min(RUNGS.length - 1, Math.floor(i / (CARDS / RUNGS.length)))];
    await p.evaluate((rr) => window.__setVoidR(rr), r);
    await p.evaluate(() => window.__news());
    // wait for the ticker to actually change rather than sleeping a guess
    for (let k = 0; k < 40; k++) {
      const cur = await read();
      if (cur && cur.head && cur.head !== last) { last = cur.head; feed.push({ i, r, ...cur }); break; }
      await p.waitForTimeout(120);
    }
  }
  const st = await p.evaluate(() => ({ t: window.__matchState().t, r: window.__voidState().r }));
  await b.close();

  // ── the three machine bars a SEQUENCE can fail ──────────────────────────
  const heads = feed.map((f) => f.head);
  const seen = new Map(); const repeats = [];
  for (const h of heads) { if (seen.has(h)) repeats.push(h); seen.set(h, (seen.get(h) || 0) + 1); }
  const firstWord = (h) => (h.split(/\s+/)[0] || '').replace(/[^A-Za-z']/g, '').toLowerCase();
  let runBest = 1, runCur = 1, runWord = firstWord(heads[0] || '');
  for (let i = 1; i < heads.length; i++) {
    if (firstWord(heads[i]) && firstWord(heads[i]) === firstWord(heads[i - 1])) { runCur++; if (runCur > runBest) { runBest = runCur; runWord = firstWord(heads[i]); } }
    else runCur = 1;
  }
  const tokens = heads.filter((h) => /\{[A-Z]\}/.test(h));
  const twoSent = heads.filter((h) => (h.match(/[.!?]/g) || []).length === 2).length;
  const qs = heads.filter((h) => h.includes('?')).length;
  const rec = { world: WORLD, seed: SEED, cards: feed.length, matchT: +st.t.toFixed(1),
    repeats: repeats.length, uniqueHeads: seen.size, openerRun: runBest, openerWord: runWord,
    unresolvedTokens: tokens.length, twoSentencePct: +(twoSent / Math.max(1, heads.length)).toFixed(2),
    questionPct: +(qs / Math.max(1, heads.length)).toFixed(2), feed };
  writeFileSync(`${OUT}/${WORLD}.json`, JSON.stringify(rec, null, 1));
  writeFileSync(`${OUT}/${WORLD}.txt`,
    `THE ${WORLD.toUpperCase()} FEED — ${feed.length} cards, SEED=${SEED}, in the order a child meets them\n` +
    `${'='.repeat(78)}\n` +
    feed.map((f) => `[r${String(f.r).padStart(4)}] ${f.brand}\n         ${f.head}`).join('\n') + '\n');
  console.log(`  ${feed.length} cards, ${seen.size} distinct  ·  ${repeats.length} repeat(s)  ·  longest run of the same opening word: ${runBest} ("${runWord}")  ·  ${tokens.length} unresolved token(s)  ·  ${(rec.twoSentencePct * 100).toFixed(0)}% exactly two sentences, ${(rec.questionPct * 100).toFixed(0)}% questions`);
  if (repeats.length || runBest > 3 || tokens.length) {
    fails++;
    console.log(`  FAIL-LINE ${WORLD}: ${repeats.length} repeat(s)${repeats.length ? ` (e.g. "${repeats[0].slice(0, 60)}")` : ''}, opener run ${runBest}, ${tokens.length} unresolved token(s)`);
  }
}
if (fails) process.exitCode = 1;
console.log(fails ? `FAIL — newsfeed: ${fails} world(s) whose aired sequence repeats itself, drones, or leaks a token` : `PASS — newsfeed: every world's aired sequence is distinct, varied at the opening word, and fully resolved`);

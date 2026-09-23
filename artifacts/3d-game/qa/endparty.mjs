// EVERY MATCH ENDS AS A PARTY, WITH ITS OWN WHISTLE
//
//   node qa/endparty.mjs [port] [--only=a,b]
//
// Research governor G4. The end of a match is the moment a child decides
// whether to press PLAY AGAIN, and it was the least authored minute in the
// game: the buzzer and a won goal both played evolve() — the "you grew"
// fanfare, the same sound as a form-up forty times a match — the void's face
// said 'cruise' on a goal won from third place, nothing happened in the world
// before the card slid in, and a match with no level finished below first on
// lose(), the only sad sound the game owns.
//
// PART A — a won goal from third place. Maple dot 1 (?g=1), the family put
//   ahead so she is 3rd, then the dot's own EAT line crossed with __setScore.
//   The end opens through the game's own goal-met door.
// PART B — the buzzer, in third, with no level. A short ?len= match, the
//   family ahead, run to the clock's own zero.
//
// Everything is timed on tClock (the clock the audio call log stamps, and the
// one that keeps running while the outro slows the world to 0.3x). A per-frame
// in-page logger records the goal, the clock, the mood, the confetti and the
// card, so no reading depends on the probe's own round-trip timing.
//
// THE BARS
//   (a) goal won: a 'whistle' within 0.6 s of the end opening, and no 'evolve'
//   (b) goal won at rank 3: the void's mood is 'victory' 0.2 s in
//   (c) goal won: at least 100 in-world confetti nodes (.wConf) alive 0.5 s
//       in, before the card is up
//   (d) goal won at rank 3: at least 24 end-card confetti (.endConf)
//   (e) buzzer: a 'whistle' within 0.6 s of the clock reaching zero, no 'evolve'
//   (f) buzzer at rank 3, no level: no 'lose' once the card is up
//   (g) on both cards: no two celebration sounds (finale, win, evolve) start
//       within 0.5 s of each other — the card used to fire the motif, the
//       rank level-up and the new-world cheer in one millisecond (studio
//       governor, 2026-09-23). Read on the WALL clock, which is the one sounds
//       play on; a build without wall stamps falls back to tClock.
import { chromium } from 'playwright';

const PORT = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : '4177';
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const ONLY = onlyArg ? onlyArg.slice(7).split(',') : ['a', 'b'];

const die = (m) => { console.log(`FAIL — ${m}`); process.exit(1); };
process.on('uncaughtException', (e) => die(`threw: ${(e && e.message) || e}`));
process.on('unhandledRejection', (e) => die(`rejected: ${(e && e.message) || e}`));

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

const LOGGER = () => {
  const L = window.__ep = { fr: [] };
  const tick = () => {
    try {
      const ms = window.__matchState?.();
      if (ms) {
        const g = window.__goalState?.();
        const end = document.getElementById('end');
        L.fr.push({ tc: ms.tClock, clock: ms.clock, t: ms.t, met: !!g?.met, res: g?.result ?? null,
          mood: ms.mood ?? null, rank: ms.rank ?? null,
          wConf: document.querySelectorAll('.wConf').length,
          endConf: end ? end.querySelectorAll('.endConf').length : 0,
          card: !!end?.classList.contains('show') });
      }
    } catch { /* a frame we could not read is a frame we do not report */ }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

async function open(q) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 } });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidFirstNom', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
  } catch {} });
  await p.addInitScript(LOGGER);
  await p.goto(`http://127.0.0.1:${PORT}/${q}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 600000 });
  const hooks = await p.evaluate(() => ({ calls: typeof window.__audioCalls === 'function',
    mood: 'mood' in (window.__matchState?.() ?? {}) }));
  if (!hooks.calls) die('__audioCalls is missing — this build cannot say what it played');
  if (!hooks.mood) die('__matchState().mood is missing — this build cannot say what face it made');
  return p;
}

const endsAt = (fr, pick) => { const i = fr.findIndex(pick); return i < 0 ? null : fr[i].tc; };
const near = (fr, tc) => fr.reduce((a, x) => (Math.abs(x.tc - tc) < Math.abs(a.tc - tc) ? x : a), fr[0]);
const window_ = (calls, t0, t1) => calls.filter((c) => c.t >= t0 && c.t <= t1).map((c) => c.id);
const CHEERS = new Set(['finale', 'win', 'evolve']);
const stacked = (calls, fromT) => {
  const cs = calls.filter((c) => c.t >= fromT - 0.2 && CHEERS.has(c.id)).map((c) => ({ id: c.id, w: c.w ?? c.t }));
  const bad = [];
  for (let i = 1; i < cs.length; i++) if (cs[i].w - cs[i - 1].w < 0.5) bad.push(`${cs[i - 1].id}+${cs[i].id} ${((cs[i].w - cs[i - 1].w) * 1000).toFixed(0)} ms apart`);
  return { cs, bad };
};

let bad = 0, bars = 0;
const bar = (ok, id, msg) => { bars++; console.log(`  ${ok ? 'ok  ' : 'BAD '} (${id}) ${msg}`); if (!ok) bad++; };
console.log(`\n  END PARTY — how a match ends, on :${PORT}\n`);

if (ONLY.includes('a')) {
  const p = await open('?w=maple&g=1&len=60');   // ?len= is what makes a harness match auto-start; ?g= alone waits on the menu
  const setup = await p.evaluate(() => {
    const eat = window.__levelSpec().eat;
    window.__setRivalScores([eat * 6, eat * 5]);
    return { eat, goal: window.__goalState() };
  });
  if (!setup.goal || setup.goal.n !== 1) die(`?g=1 did not make this a dot-1 level match (goal ${JSON.stringify(setup.goal)})`);
  // let the family's scores land in the board before the line is crossed
  const t1 = await p.evaluate(() => window.__matchState().tClock);
  await p.waitForFunction((t) => window.__matchState().tClock > t + 0.5, t1, { timeout: 600000, polling: 200 });
  await p.evaluate((eat) => window.__setScore(eat + 1), setup.eat);
  await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'), null, { timeout: 900000, polling: 250 });
  const cardT = await p.evaluate(() => window.__matchState().tClock);
  await p.waitForFunction((t) => window.__matchState().tClock > t + 1.2, cardT, { timeout: 600000, polling: 250 });
  const { fr } = await p.evaluate(() => window.__ep);
  const calls = await p.evaluate(() => window.__audioCalls());
  await p.close();

  const t0 = endsAt(fr, (x) => x.met);
  if (t0 == null) die('the goal never read as met — the end did not open through the goal door');
  const at = window_(calls, t0 - 0.1, t0 + 0.6);
  console.log(`  ·    A: dot 1 won at tClock ${t0.toFixed(2)}; rank ${near(fr, t0).rank}; calls in the first 0.6 s: ${at.join(' ') || 'none'}`);
  bar(at.includes('whistle') && !at.includes('evolve'), 'a',
    `goal won: ${at.includes('whistle') ? 'a whistle' : 'no whistle'}, ${at.includes('evolve') ? "the 'you grew' fanfare" : 'no evolve()'} as the end opens`);
  const m = near(fr, t0 + 0.2);
  bar(m.mood === 'victory', 'b', `goal won from rank ${m.rank}: the void's face 0.2 s in is '${m.mood}' (want 'victory')`);
  const c = near(fr, t0 + 0.5);
  bar(c.wConf >= 100 && !c.card, 'c', `goal won: ${c.wConf} in-world confetti node(s) 0.5 s in, card ${c.card ? 'already up' : 'not up yet'} (want >= 100, before the card)`);
  const ec = Math.max(0, ...fr.filter((x) => x.card).map((x) => x.endConf));
  bar(ec >= 24, 'd', `goal won at rank ${near(fr, cardT).rank}: ${ec} end-card confetti (want >= 24)`);
  const sa = stacked(calls, cardT - 1.5);
  bar(!sa.bad.length, 'g', sa.bad.length ? `goal won: celebration sounds stacked on the card — ${sa.bad.join('; ')}`
    : `goal won: ${sa.cs.map((c) => c.id).join(' then ') || 'no celebration'}, never two within 0.5 s`);
}

if (ONLY.includes('b')) {
  const p = await open('?w=maple&len=14');
  const g = await p.evaluate(() => window.__goalState());
  if (g) die(`the ?len= harness match carried a level (${JSON.stringify(g)}) — part B needs a match with no goal`);
  await p.evaluate(() => window.__setRivalScores([9e6, 8e6]));
  await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'), null, { timeout: 1500000, polling: 500 });
  const cardT = await p.evaluate(() => window.__matchState().tClock);
  await p.waitForFunction((t) => window.__matchState().tClock > t + 1.5, cardT, { timeout: 600000, polling: 250 });
  const { fr } = await p.evaluate(() => window.__ep);
  const calls = await p.evaluate(() => window.__audioCalls());
  await p.close();

  const t0 = endsAt(fr, (x) => x.clock <= 0);
  if (t0 == null) die('the clock never reached zero');
  const at = window_(calls, t0 - 0.1, t0 + 0.6);
  const after = window_(calls, cardT - 0.1, cardT + 1.5);
  console.log(`  ·    B: buzzer at tClock ${t0.toFixed(2)}; rank ${near(fr, cardT).rank}; at the buzzer: ${at.join(' ') || 'none'}; on the card: ${after.join(' ') || 'none'}`);
  bar(at.includes('whistle') && !at.includes('evolve'), 'e',
    `buzzer: ${at.includes('whistle') ? 'a whistle' : 'no whistle'}, ${at.includes('evolve') ? "the 'you grew' fanfare" : 'no evolve()'} as the clock hits zero`);
  bar(!after.includes('lose'), 'f', after.includes('lose')
    ? 'third place with no level: the card plays lose(), the one sad sound the game owns'
    : 'third place with no level: no lose() on the card');
  const sb = stacked(calls, cardT - 1.5);
  bar(!sb.bad.length, 'g', sb.bad.length ? `buzzer: celebration sounds stacked on the card — ${sb.bad.join('; ')}`
    : `buzzer: ${sb.cs.map((c) => c.id).join(' then ') || 'no celebration'}, never two within 0.5 s`);
}

await b.close();
console.log(bad ? `\nFAIL — ${bad} of ${bars} bar(s)` : `\nPASS — ${bars} bar(s)`);
process.exit(bad ? 1 : 0);

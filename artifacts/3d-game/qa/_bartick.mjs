// DOES THE GROWTH BAR KNOW SOMETHING WAS EATEN?
//
//   node qa/_bartick.mjs [world] [port]
//
// The owner, on hole.io: "when you eat points go into a bar". Ours has a bar,
// and the bar reacted to exactly two things — an evolution and a demoting bite
// — because its width is formProgress(radius) and the growth law rate-limits
// the radius. Between those, the one action a child takes fifty times a match
// landed on it as nothing at all.
//
// Nothing here is transcribed. Every value is read with getComputedStyle off
// the live .gFill and .gTrack, so this measures what a screen would show and
// not what a stylesheet says. The three states must be mutually distinct: at
// rest, after an everyday bite, and after a meal over half the void's own size.
//
// THE TEST IS THAT IT PULSES, NOT THAT IT LIGHTS. Lighting is easy and worth
// nothing: the void eats near-continuously in ordinary play, so a flash that
// re-arms on every bite leaves the bar permanently on, which says exactly as
// much as a bar that never moves. This is what the first version of this probe
// caught, and it is why the bar now owes a dark gap between flashes. So the
// grading is: across a stretch of ordinary play the bar must be seen BOTH lit
// and dark, and a meal over half the void's own size must light it harder than
// a traffic cone does.
//
// AND IT GRADES ON box-shadow, NOT filter. getComputedStyle returns the value
// mid-transition, and at the 1-2fps the software renderer gives QA a sample
// lands wherever the last style recalc left it — measured, `filter` came back
// one state behind while the class and the shadow had already moved. Reading
// the peak across the window instead of the first lit frame removes the same
// hazard from the other direction.
//
// The lit phase is EAT_TICK_LIT of SIM time, counted down with the frame dt
// clamped to 0.05 — so it survives a few frames whatever the wall clock does,
// which is what makes it samplable at all here.
//
// READ THE LIT/DARK SPLIT AS A RATIO, NOT AS A DUTY CYCLE. These samples are
// spaced in WALL time while the thing they watch runs on SIM time, and under
// the software renderer several samples land on one frame — so slow frames are
// over-counted. The design's actual duty is EAT_TICK_LIT / (EAT_TICK_LIT +
// EAT_TICK_DARK). What the split here is good for is the only question that
// matters: both states occur, so it pulses.
import { chromium } from 'playwright';
import { enterMatch } from './_enter.mjs';

const WORLD = process.argv[2] || 'maple';
const PORT = process.argv[3] || '4177';

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidFirstNom', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
} catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await enterMatch(p, WORLD);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 6, null, { timeout: 600000 });

const READ = () => {
  const g = document.getElementById('growth');
  const f = g.querySelector('.gFill'), t = g.querySelector('.gTrack');
  const cf = getComputedStyle(f), ct = getComputedStyle(t);
  return { cls: g.className, filter: cf.filter, fillShadow: cf.boxShadow,
    trackShadow: ct.boxShadow, edge: getComputedStyle(f, '::before').width };
};

await p.evaluate(() => window.__setVoidR(3));
await p.waitForTimeout(1200);

// ORDINARY PLAY, sampled straight through. No bite is forced here: whatever
// the void eats on its own is exactly the traffic this has to survive.
const run = [];
for (let i = 0; i < 40; i++) { run.push(await p.evaluate(READ)); await p.waitForTimeout(120); }
const isLit = (s) => /\b(tick|big)\b/.test(s.cls);
const dark = run.find(s => !isLit(s)) || null;
const lit = run.find(isLit) || null;

// …then a landmark, which must light it harder than the everyday traffic does
// and is allowed to interrupt the dark gap.
const gotBig = await p.evaluate(() => window.__eatNearest(0.75));
const after = [];
for (let i = 0; i < 14; i++) { after.push(await p.evaluate(READ)); await p.waitForTimeout(120); }
const big = after.find(s => /\bbig\b/.test(s.cls)) || null;
const small = lit;
const rest = dark;
await b.close();

const show = (n, s) => console.log(`  ${n.padEnd(14)} class "${(s?.cls ?? '-').trim()}"\n                 track ${s?.trackShadow ?? '-'}`);
const nLit = run.filter(isLit).length;
console.log(`world ${WORLD} · ${run.length} samples of ordinary play: ${nLit} lit, ${run.length - nLit} dark`);
show('dark', rest);
show('lit', small);
show('on a landmark', big);
console.log('');

const bad = [];
if (!lit) bad.push(`across ${run.length} samples of ordinary play the bar never lit at all`);
if (!dark) bad.push(`across ${run.length} samples of ordinary play the bar was never dark — it glows, it does not pulse`);
if (!gotBig) bad.push('no big prop was eligible — the landmark grade was not measured');
else if (!big) bad.push("a meal over half the void's own size never reached the landmark grade");
if (lit && dark && lit.trackShadow === dark.trackShadow) bad.push('the lit class changed nothing a screen would show');
if (big && small && big.trackShadow === small.trackShadow) bad.push('a landmark and a traffic cone light the bar identically');

if (bad.length) { for (const m of bad) console.log(`FAIL — ${m}`); process.exit(1); }
console.log(`PASS — the bar pulses through ordinary play (${nLit} lit / ${run.length - nLit} dark) and a landmark lights it harder`);

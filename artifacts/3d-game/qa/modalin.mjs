// EVERY PANEL ARRIVES; NONE OF THEM JUST APPEARS
//
//   node qa/modalin.mjs [port] [world]
//
// Studio round 4, Job 7: "modalIn on 4 panels, and a 0.28 s fade on #end".
// modalIn was spent on exactly four cards — the calendar, the skin preview,
// settings and the parental gate — so those floated in while the pause card,
// the shop, the world picker and MY VOID replaced the screen between two
// frames, and the results card did the same on every single match.
//
// Each panel is opened through its REAL DOOR — the chevron plaque, the SHOP
// cell, the MY VOID cell, the in-match pause button — and each door has to
// lead to the panel's own .show, or the bar is a FAIL rather than a quiet pass
// (qa/uisystem.mjs certified a picker it never opened; that lesson is why).
// The animation is read from the computed style, which reports the DECLARED
// animation whether or not its 0.24 s has already run — so no reading depends
// on catching a wall-clock animation under a renderer that paints about once a
// second. The results card's fade is checked against its @keyframes rule in
// the CSSOM: opacity from 0 and nothing else, because a slide or a scale on a
// full-screen scrim would drag every staggered child with it.
//
// THE BARS
//   (a) #worlds        (the picker)       runs modalIn
//   (b) #shop          (the shop)         runs modalIn
//   (c) #profile       (MY VOID)          runs modalIn
//   (d) #pause .setCard (the pause card)  runs modalIn
//   (e) #end runs a 0.28 s animation whose keyframes touch opacity only,
//       starting from 0
import { chromium } from 'playwright';
import { enterMatch } from './_enter.mjs';

const POS = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const PORT = POS[0] || '4177';
const WORLD = POS[1] || 'maple';

const die = (m) => { console.log(`FAIL — ${m}`); process.exit(1); };
process.on('uncaughtException', (e) => die(`threw: ${(e && e.message) || e}`));
process.on('unhandledRejection', (e) => die(`rejected: ${(e && e.message) || e}`));

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidFirstNom', '1');
  localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
} catch { /* private mode */ } });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));

let bad = 0, bars = 0;
const bar = (ok, id, msg) => { bars++; console.log(`  ${ok ? 'ok  ' : 'BAD '} (${id}) ${msg}`); if (!ok) bad++; };
console.log(`\n  MODAL IN — ${WORLD} on :${PORT}\n`);

const anim = (sel) => p.evaluate((s) => {
  const e = document.querySelector(s);
  if (!e) return null;
  const cs = getComputedStyle(e);
  return { name: cs.animationName, dur: cs.animationDuration };
}, sel);

/** open a panel through its door, read the animation, close it again */
const PANELS = [
  ['a', 'the world picker', '#worlds', () => document.getElementById('worldSwitch')?.click(), '#worlds .backBtn[data-close="worlds"]'],
  ['b', 'the shop', '#shop', () => document.getElementById('btnShop')?.click(), '#btnBack'],
  ['c', 'MY VOID', '#profile', () => document.getElementById('btnBook')?.click(), '#profile .backBtn[data-close="profile"]'],
];
for (const [id, name, sel, door, close] of PANELS) {
  await p.evaluate(door);
  const opened = await p.waitForFunction((s) => document.querySelector(s)?.classList.contains('show'), sel, { timeout: 120000 })
    .then(() => true, () => false);
  if (!opened) { bar(false, id, `${name}: the door did not open ${sel} — nothing was measured`); continue; }
  const a = await anim(sel);
  bar(a?.name === 'modalIn', id, `${name} (${sel}.show) runs "${a?.name}" over ${a?.dur} (want modalIn)`);
  await p.evaluate((c) => document.querySelector(c)?.click(), close);
  await p.waitForFunction((s) => !document.querySelector(s)?.classList.contains('show'), sel, { timeout: 120000 }).catch(() => { });
}

// ── (d) the pause card, in a live match, through the pause button ─────────
await enterMatch(p, WORLD);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 1, null, { timeout: 600000 });
await p.evaluate(() => document.getElementById('btnQuit')?.click());
const paused = await p.waitForFunction(() => document.getElementById('pause')?.classList.contains('show'), null, { timeout: 120000 })
  .then(() => true, () => false);
if (!paused) bar(false, 'd', 'the pause button did not open #pause — nothing was measured');
else {
  const a = await anim('#pause .setCard');
  bar(a?.name === 'modalIn', 'd', `the pause card (#pause.show .setCard) runs "${a?.name}" over ${a?.dur} (want modalIn)`);
  await p.evaluate(() => document.getElementById('pauseResume')?.click());
  await p.waitForFunction(() => !document.getElementById('pause')?.classList.contains('show'), null, { timeout: 120000 });
}

// ── (e) the results card, at the buzzer ──────────────────────────────────────
await p.evaluate(() => window.__rushClock?.(0.5));
const ended = await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'), null, { timeout: 900000, polling: 250 })
  .then(() => true, () => false);
if (!ended) bar(false, 'e', 'the results card never came up after the clock was rushed — nothing was measured');
else {
  const r = await p.evaluate(() => {
    const cs = getComputedStyle(document.getElementById('end'));
    const name = cs.animationName, dur = cs.animationDuration;
    let frames = null;
    const walk = (rules) => {
      for (let i = 0; i < rules.length; i++) {
        const x = rules[i];
        if (x.type === CSSRule.KEYFRAMES_RULE && x.name === name) {
          frames = [];
          for (let k = 0; k < x.cssRules.length; k++) {
            const f = x.cssRules[k], props = [];
            for (let j = 0; j < f.style.length; j++) props.push(f.style[j]);
            frames.push({ at: f.keyText, props, opacity: f.style.opacity });
          }
        } else if (x.cssRules && x.cssRules.length) walk(x.cssRules);
      }
    };
    for (const sh of document.styleSheets) { try { walk(sh.cssRules); } catch { /* cross-origin sheet */ } }
    return { name, dur, frames };
  });
  const onlyOpacity = !!r.frames && r.frames.length > 0 && r.frames.every((f) => f.props.length && f.props.every((q) => q === 'opacity'));
  const first = r.frames?.find((f) => /^(from|0%)$/.test(f.at));
  const fromZero = !!first && Number(first.opacity) === 0;
  if (r.frames) console.log(`  ·    @keyframes ${r.name}: ${r.frames.map((f) => `${f.at} {${f.props.join(', ')}}`).join('  ')}`);
  bar(r.name !== 'none' && r.dur === '0.28s' && onlyOpacity && fromZero, 'e',
    `the results card (#end.show) runs "${r.name}" over ${r.dur}; `
    + (r.frames ? `${onlyOpacity ? 'opacity only' : 'NOT opacity only'}, ${fromZero ? 'from 0' : 'not from 0'}` : 'no @keyframes found')
    + ' (want a 0.28s opacity fade from 0)');
}

await b.close();
console.log(bad ? `\nFAIL — ${bad} of ${bars} bar(s)` : `\nPASS — ${bars} bar(s)`);
process.exit(bad ? 1 : 0);

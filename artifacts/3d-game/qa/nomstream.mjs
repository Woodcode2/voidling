// ONE NUMBER STREAM A CHILD CAN READ, AND A CHAIN SHE CAN SEE
//
//   node qa/nomstream.mjs [port] [world]
//
// Found by the 2026-09-23 research governor (G6). Three number streams ran at
// once on every bite: a '+N' rising off the prop, the coalesced '+N' flying
// into the bar, and every fifth bite a 'COMBO ×1.5' — a decimal, which a six
// year old does not read. The chain the combo counts was invisible between
// those fifths, it paid out silently when it lapsed, and the flying number was
// the same size for a traffic cone and a town hall.
//
// THE DRIVE. A scripted spree on the game's own clock: __eatNearest every 0.2
// match-seconds for 25 bites (two of them deliberately big meals, so the
// stream has something to size), then the chain is left to lapse. Every
// floater the pool shows is logged by its class, text, computed size and
// colour, at the match time it was raised. Then a beat window is forced
// through the game's own schedule and three more bites are taken inside it.
//
// THE BARS:
//   (a) no per-bite '+N' rises off a non-coin prop — the flight is the stream
//   (b) no decimal combo floater anywhere
//   (c) the largest flying number is at least 1.4x the smallest, by font size
//   (d) a crown at every tenth link the chain reached, and only there
//   (e) exactly one 'N NOMS! +N' cash-in, within 1.8 s of the chain's last
//       bite, naming the chain's own length
//   (f) the NOMS pill is up whenever the chain is 5 or more, says the chain's
//       length, wears the right tier, and never covers his face
//   (g) the crowns and the cash-in are HEARD — the audio engine logged them
//   (h) inside a beat window the flying number wears the beat's colour
//
// Everything is keyed on __matchState().t. The software renderer here manages
// about 0.04 match-seconds per wall-second, and the chain lapses on a 1.6 s
// match timer: a drive paced in wall milliseconds would break the chain it is
// trying to measure.
import { chromium } from 'playwright';
import { enterMatch } from './_enter.mjs';

const PORT = process.argv[2] || '4177';
const WORLD = process.argv[3] || 'maple';
const BITES = 25, GAP = 0.2, BIG_AT = new Set([8, 18]);

const die = (m) => { console.log(`FAIL — ${m}`); process.exit(1); };
process.on('uncaughtException', (e) => die(`threw: ${(e && e.message) || e}`));
process.on('unhandledRejection', (e) => die(`rejected: ${(e && e.message) || e}`));

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
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
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 4, null, { timeout: 600000 });

// ── THE LOG ─────────────────────────────────────────────────────────────────
// Every floater is one of fourteen pooled '.vf' nodes, and each raise writes
// its className after its text. An own-property setter on each node fires
// inline, once per raise, with the real match time; the computed size and
// colour are read in a microtask so whatever inline style the raise sets after
// the class has landed. A per-frame logger records the chain and the pill.
await p.evaluate(() => {
  const L = window.__ns = { f: [], fr: [] };
  const ms = () => window.__matchState?.() ?? {};
  const proto = Element.prototype;
  const d = Object.getOwnPropertyDescriptor(proto, 'className');
  document.querySelectorAll('.vf').forEach((el) => {
    Object.defineProperty(el, 'className', {
      configurable: true,
      get() { return d.get.call(this); },
      set(v) {
        d.set.call(this, v);
        const text = (this.textContent || '').trim();
        if (!text) return;
        const s = ms();
        const rec = { t: s.t ?? 0, fever: s.fever ?? 1, fly: /\bfly\b/.test(v), cls: v, text, fs: 0, col: '', go: false };
        L.f.push(rec);
        queueMicrotask(() => { const cs = getComputedStyle(this);
          rec.fs = parseFloat(cs.fontSize) || 0; rec.col = cs.color; rec.go = this.classList.contains('go'); });
      },
    });
  });
  const tick = () => {
    const s = ms();
    const pill = document.getElementById('noms');
    let pv = false, ptxt = '', ptier = '', hit = false;
    if (pill) {
      const cs = getComputedStyle(pill);
      pv = cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.05;
      ptxt = (pill.textContent || '').trim(); ptier = pill.dataset.tier || '';
      const fb = window.__formBox?.();
      if (pv && fb && fb.on) {
        const r = pill.getBoundingClientRect();
        hit = r.left < fb.right && r.right > fb.left && r.top < fb.bottom && r.bottom > fb.top;
      }
    }
    L.fr.push({ t: s.t ?? 0, eaten: s.eaten ?? 0, combo: s.combo, fever: s.fever ?? 1, pv, ptxt, ptier, hit });
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

const now = () => p.evaluate(() => window.__matchState().t);
const waitT = async (t) => { await p.waitForFunction((x) => window.__matchState().t >= x, t, { timeout: 900000, polling: 100 }); };

// ── THE SPREE ───────────────────────────────────────────────────────────────
const t0 = await now();
const meals = [];
for (let i = 0; i < BITES; i++) {
  await waitT(t0 + i * GAP);
  const got = await p.evaluate((rel) => window.__eatNearest(rel) ?? window.__eatNearest(0.1), BIG_AT.has(i) ? 0.55 : 0.1);
  meals.push(got);
}
const spreeEnd = await now();
const hasCombo = await p.evaluate(() => typeof window.__matchState().combo === 'number');
// …then let the chain lapse on its own. A build that reports the chain waits
// for it to hit zero (the void keeps eating whatever drifts into reach, and
// those bites are links too); one that does not gets the spec's two seconds.
if (hasCombo) {
  await p.waitForFunction(() => window.__matchState().combo === 0, null, { timeout: 900000, polling: 200 });
  await waitT((await now()) + 2.0);
} else {
  await waitT(spreeEnd + 2.0);
}
const chainOver = await now();

// ── THE BEAT ────────────────────────────────────────────────────────────────
// Through the game's own schedule: the next unfired beat's `at` is pulled to
// the present, so the SAME code path that opens a beat in a real match opens
// this one. Its colour is read from the beat itself.
const beat = await p.evaluate(() => {
  const bt = (window.__beats || []).find((x) => !x.fired);
  if (!bt) return null;
  bt.at = 0;
  return { title: bt.title, col: bt.col, mult: bt.mult };
});
let beatFrom = null;
if (beat) {
  await p.waitForFunction(() => window.__matchState().fever > 1, null, { timeout: 900000, polling: 200 });
  beatFrom = await now();
  for (let i = 0; i < 3; i++) {
    await waitT(beatFrom + 0.3 + i * GAP);
    await p.evaluate(() => window.__eatNearest(0.1));
  }
  await waitT(beatFrom + 0.3 + 3 * GAP + 1.2);
}

const L = await p.evaluate(() => window.__ns);
const alog = await p.evaluate(() => (window.__audioLog ? window.__audioLog() : null));
await b.close();

// ── GRADING ─────────────────────────────────────────────────────────────────
const f = L.f, fr = L.fr;
const inChain = (r) => r.t >= t0 - 0.05 && r.t <= chainOver;
const PLUS = /^\+[\d,]+$/;
// A RISING floater is one that wears `go`: float() writes the class and adds
// `go` in the same call. A LANDED flight has its class reset to bare 'vf' with
// its text still on it, and that write passes through the same setter — the
// first run of this probe counted every landing as a per-bite number (10 for
// 10 flights). `go` is read in the microtask, after the raise has finished.
const perBite = f.filter((r) => inChain(r) && !r.fly && r.go && PLUS.test(r.text));
const decimal = f.filter((r) => r.go && /COMBO\s*[×x]\s*\d+\.\d/i.test(r.text));
const flights = f.filter((r) => inChain(r) && r.fly && PLUS.test(r.text) && r.fs > 0);
const crowns = f.filter((r) => inChain(r) && r.go && /^(\d+) NOMS!$/i.test(r.text));
const cashins = f.filter((r) => inChain(r) && r.go && /^(\d+) NOMS! \+[\d,]+$/i.test(r.text));

// the chain, from the game's own count when it reports one
const chainFrames = fr.filter((x) => x.t >= t0 - 0.05 && x.t <= chainOver);
const peak = hasCombo ? Math.max(0, ...chainFrames.map((x) => x.combo || 0)) : BITES;
let lastBite = spreeEnd;
for (let i = 1; i < chainFrames.length; i++) if (chainFrames[i].eaten > chainFrames[i - 1].eaten) lastBite = chainFrames[i].t;
if (hasCombo) {
  // the chain's last link is the last bite before the count fell to zero
  const lapse = chainFrames.findIndex((x, i) => i > 0 && x.combo === 0 && chainFrames[i - 1].combo > 0);
  if (lapse > 0) {
    for (let i = lapse; i > 0; i--) if (chainFrames[i].eaten > chainFrames[i - 1].eaten) { lastBite = chainFrames[i].t; break; }
  }
}

console.log(`\n  NOM STREAM — ${WORLD} on :${PORT}\n`);
console.log(`  ·    spree: ${meals.filter(Boolean).length}/${BITES} bites landed, t ${t0.toFixed(2)} → ${spreeEnd.toFixed(2)}; `
  + `chain ${hasCombo ? `peaked at ${peak}` : 'not reported by this build'}, last bite t=${lastBite.toFixed(2)}`);
console.log(`  ·    floaters raised in the chain window: ${f.filter(inChain).length}  `
  + `(${perBite.length} per-bite '+N', ${flights.length} flights, ${crowns.length} crowns, ${cashins.length} cash-ins, ${decimal.length} decimal)`);

let bad = 0;
const bar = (ok, id, msg) => { console.log(`  ${ok ? 'ok  ' : 'BAD '} (${id}) ${msg}`); if (!ok) bad++; };

bar(perBite.length === 0, 'a', perBite.length === 0
  ? 'no per-bite number rises off a prop — the flight into the bar is the one stream'
  : `${perBite.length} per-bite '+N' floaters rose off props on top of the flights (first: ${perBite.slice(0, 5).map((r) => r.text).join(' ')})`);
bar(decimal.length === 0, 'b', decimal.length === 0
  ? 'no decimal combo floater'
  : `${decimal.length} decimal combo floater(s): ${[...new Set(decimal.map((r) => r.text))].join(', ')}`);

if (flights.length >= 2) {
  const fsz = flights.map((r) => r.fs);
  const lo = Math.min(...fsz), hi = Math.max(...fsz);
  const pts = flights.map((r) => Number(r.text.replace(/[^\d]/g, '')));
  bar(hi / lo >= 1.4, 'c', `flying numbers ${lo.toFixed(1)}px → ${hi.toFixed(1)}px = ${(hi / lo).toFixed(2)}x across banks of `
    + `${Math.min(...pts).toLocaleString()} → ${Math.max(...pts).toLocaleString()} (bar 1.4x)`);
} else bar(false, 'c', `only ${flights.length} flight(s) seen — nothing to size`);

const wantCrowns = [];
for (let k = 10; k <= peak; k += 10) wantCrowns.push(k);
const gotCrowns = crowns.map((r) => Number(r.text.match(/^(\d+)/)[1]));
bar(wantCrowns.length > 0 && JSON.stringify(gotCrowns) === JSON.stringify(wantCrowns), 'd',
  `crowns ${gotCrowns.length ? gotCrowns.join(', ') : 'none'} for a chain that reached ${peak} (want ${wantCrowns.join(', ') || '—'})`);

{
  const ok1 = cashins.length === 1;
  const c = cashins[0];
  const dt = c ? c.t - lastBite : NaN;
  const n = c ? Number(c.text.match(/^(\d+)/)[1]) : NaN;
  const okT = c && dt >= 0 && dt <= 1.8;
  const okN = !hasCombo || n === peak;
  bar(ok1 && okT && okN, 'e', c
    ? `${cashins.length} cash-in(s): "${c.text}" ${dt.toFixed(2)} s after the last bite (bar ≤ 1.8), naming ${n} for a chain of ${peak}`
    : 'no cash-in when the chain lapsed — the chain ended in silence');
}

if (hasCombo) {
  const live = chainFrames.filter((x) => (x.combo || 0) >= 5);
  const off = chainFrames.filter((x, i) => (x.combo || 0) < 5 && i > 0 && (chainFrames[i - 1].combo || 0) < 5);
  const shown = live.filter((x) => x.pv);
  const said = shown.filter((x) => (x.ptxt.match(/(\d+)/) || [])[1] === String(x.combo));
  const tierOf = (n) => (n >= 20 ? '3' : n >= 10 ? '2' : '1');
  const tiered = shown.filter((x) => x.ptier === tierOf(x.combo));
  const stray = off.filter((x) => x.pv);
  const face = chainFrames.filter((x) => x.hit);
  const share = live.length ? shown.length / live.length : 0;
  bar(live.length > 0 && share >= 0.9 && said.length >= shown.length * 0.9 && tiered.length >= shown.length * 0.9
      && stray.length === 0 && face.length === 0, 'f',
    `pill up on ${shown.length}/${live.length} chain-5+ frames (bar 90%), right count on ${said.length}, right tier on ${tiered.length}, `
    + `up below 5 on ${stray.length}, over his face on ${face.length}`);
} else bar(false, 'f', 'this build does not report the chain, so there is no pill to grade');

{
  const lines = alog || [];
  const aCrown = lines.filter((s) => /\bcrown \d+/.test(s)).length;
  const aCash = lines.filter((s) => /\bcashin \d+/.test(s)).length;
  bar(alog !== null && aCrown === gotCrowns.length && aCrown > 0 && aCash === cashins.length && aCash === 1, 'g',
    alog === null ? 'this build has no audio log — the chain makes no sound of its own'
      : `audio logged ${aCrown} crown(s) and ${aCash} cash-in(s) for ${gotCrowns.length} and ${cashins.length} on screen`);
}

if (beat) {
  const want = `rgb(${(beat.col >> 16) & 255}, ${(beat.col >> 8) & 255}, ${beat.col & 255})`;
  const inBeat = f.filter((r) => r.t >= beatFrom && r.fly && r.fever > 1 && PLUS.test(r.text));
  const match = inBeat.filter((r) => r.col === want);
  bar(inBeat.length > 0 && match.length === inBeat.length, 'h', inBeat.length
    ? `${match.length}/${inBeat.length} flights inside "${beat.title}" wore its colour ${want} (saw ${[...new Set(inBeat.map((r) => r.col))].join(', ')})`
    : `no flight landed inside "${beat.title}" — nothing to colour`);
} else bar(false, 'h', 'no unfired beat left to force');

console.log(bad ? `\nFAIL — ${bad} of 8 bar(s)` : '\nPASS — one stream, a chain she can see, and a cash-in when it ends');
process.exit(bad ? 1 : 0);

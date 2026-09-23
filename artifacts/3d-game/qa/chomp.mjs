// DOES THE BIGGEST BITE MAKE THE BIGGEST SOUND?
//
//   node qa/chomp.mjs [port]
//
// A phone speaker rolls off hard below roughly 500 Hz, so the honest measure
// of "can a child hear this on the device it ships on" is the energy that
// survives a high-pass — not the raw peak, which a 52 Hz sub inflates for
// free on a waveform nobody's phone can reproduce.
//
// Every layer of pop() used to darken with depth at once, and past depth 0.5
// there was nothing above ~360 Hz at all: bright tail gated off, body at
// 144 Hz, transient filtered at 360, weight carried by a 52 Hz sub. Swallowing
// a house measured QUIETER than a traffic cone through that filter. This
// renders the real synth offline at each meal size and reports it.
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4188';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const p = await b.newPage();
// A STATIC PAGE, NOT THE GAME. The import below only needs this origin; loading
// `/` booted WebGL and built a whole world under the software renderer for a
// probe that renders audio offline and never draws a frame. privacy.html is in
// public/, so the dev server serves it from the same origin, in milliseconds.
await p.goto(`http://127.0.0.1:${PORT}/privacy.html`, { waitUntil: 'domcontentloaded', timeout: 300000 });

const rows = await p.evaluate(async () => {
  const mod = await import('/src/proto3d/audio3d.ts');
  const out = [];
  // meal radii spanning what the game actually contains: a cone, a car, a
  // house, a tower. voidR tracks roughly what you would be when you ate it.
  for (const [label, mealR, voidR] of [['cone  ', 0.35, 1.0], ['car   ', 1.3, 2.5],
    ['house ', 3.2, 6.0], ['tower ', 6.5, 11.0]]) {
    const ctx = new OfflineAudioContext(1, 44100 * 0.6, 44100);
    // createAudio() builds its own AudioContext through `new
    // window.AudioContext()`, so hand it the offline one by standing in front
    // of the constructor. No production change needed to render the real synth.
    const RealAC = window.AudioContext;
    window.AudioContext = function () { return ctx; };
    let a;
    try { a = mod.createAudio(); a.setMuted?.(false); a.pop(0, mealR, voidR); }
    finally { window.AudioContext = RealAC; }
    const buf = await ctx.startRendering();
    const d = buf.getChannelData(0);
    // one-pole high-pass at 450 Hz, then RMS in dBFS
    const rc = 1 / (2 * Math.PI * 450), dt = 1 / 44100, al = rc / (rc + dt);
    let yPrev = 0, xPrev = 0, sum = 0, peak = 0;
    for (let i = 0; i < d.length; i++) {
      const y = al * (yPrev + d[i] - xPrev);
      xPrev = d[i]; yPrev = y;
      sum += y * y;
      if (Math.abs(d[i]) > peak) peak = Math.abs(d[i]);
    }
    const rms = Math.sqrt(sum / d.length);
    out.push({ label, hp: 20 * Math.log10(rms || 1e-9), peak: 20 * Math.log10(peak || 1e-9) });
  }
  return out;
});

if (rows[0]?.err) { console.error(rows[0].err); await b.close(); process.exit(2); }
console.log('meal     above 450 Hz     raw peak');
for (const r of rows) console.log(`${r.label}  ${r.hp.toFixed(1).padStart(8)} dBFS   ${r.peak.toFixed(1).padStart(7)} dBFS`);
const big = rows[rows.length - 1].hp, small = rows[0].hp;
console.log(big >= small
  ? `\nok: the biggest meal is ${(big - small).toFixed(1)} dB LOUDER than the smallest where a phone can hear it`
  : `\nINVERTED: the biggest meal is ${(small - big).toFixed(1)} dB QUIETER than the smallest`);
let bad = big >= small ? 0 : 1;

// ══ PART 2 — THE HEADLINE BITES: CHOMP, AND EATING A RIVAL ══════════════════
// Part 1 grades pop(). But the two biggest bites in the game never play pop():
// the CHOMP (prototype3d.ts, a meal the size of the player) and a rival
// devoured both call audio.bigEat() INSTEAD — and bigEat() is
// `noise(0.34, 0.14, 480, 120)`, low-passed noise sweeping 480 -> 120 Hz. Its
// energy sits below where a phone speaker works, by construction, and it
// REPLACES the tuned note. So the headline bite is the one a child cannot hear.
// Found by the 2026-09-23 research governor (G3).
//
// This measures "what the CHOMP EVENT plays" — chomp() where it exists, else
// bigEat() — so the same bars run on the build before the fix and after it.
// The owner's veto stands in bar (b): he called the old 160 Hz drop "an 8-bit
// thud" and "those damn drums", so the fix must go UP, never down.
const ev = await p.evaluate(async () => {
  const mod = await import('/src/proto3d/audio3d.ts');
  const band = (d, lo, hi) => {   // one-pole HP at lo, then one-pole LP at hi, RMS dBFS
    const dt = 1 / 44100;
    const aH = lo ? (1 / (2 * Math.PI * lo)) / ((1 / (2 * Math.PI * lo)) + dt) : 0;
    const aL = hi ? dt / ((1 / (2 * Math.PI * hi)) + dt) : 1;
    let hp = 0, xp = 0, lp = 0, sum = 0;
    for (let i = 0; i < d.length; i++) {
      const h = lo ? aH * (hp + d[i] - xp) : d[i]; xp = d[i]; hp = h;
      lp = lp + aL * (h - lp);
      sum += lp * lp;
    }
    return 20 * Math.log10(Math.sqrt(sum / d.length) || 1e-9);
  };
  const render = async (fn, secs = 1.0) => {
    const ctx = new OfflineAudioContext(1, Math.floor(44100 * secs), 44100);
    let buffers = 0;
    const realCB = ctx.createBuffer.bind(ctx);
    ctx.createBuffer = (...a) => { buffers++; return realCB(...a); };
    const RealAC = window.AudioContext;
    window.AudioContext = function () { return ctx; };
    let a;
    try { a = mod.createAudio(); a.setMuted?.(false); fn(a, ctx); }
    finally { window.AudioContext = RealAC; }
    const d = (await ctx.startRendering()).getChannelData(0);
    let peak = 0; for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
    return { hp: band(d, 450, 0), mid: band(d, 500, 4000), low: band(d, 0, 250),
      peak: 20 * Math.log10(peak || 1e-9), buffers, hasChomp: typeof a.chomp === 'function' };
  };
  const chompEv = (kind) => (a) => (a.chomp ? a.chomp(3.2, 3.0, kind) : a.bigEat());
  return {
    tower: await render((a) => a.pop(0, 6.5, 11.0)),
    pop32: await render((a) => a.pop(0, 3.2, 3.0)),
    bigEat: await render((a) => a.bigEat()),
    prop: await render(chompEv('prop')),
    rival: await render(chompEv('rival')),
    // fifty pops, spaced past pop()'s 75 ms re-trigger guard, counting buffers
    fifty: await render((a, ctx) => {
      const real = ctx.currentTime;
      for (let i = 0; i < 50; i++) {
        Object.defineProperty(ctx, 'currentTime', { value: real + i * 0.09, configurable: true });
        a.pop(i % 5, 1.3, 2.5);
      }
    }, 5.0),
  };
});

console.log(`\n  THE HEADLINE BITES — what a CHOMP / a rival eaten plays (${ev.prop.hasChomp ? 'chomp()' : 'bigEat(), no chomp() yet'})`);
console.log('                     >450 Hz   500-4k Hz   <250 Hz    peak');
for (const [k, r] of Object.entries(ev)) if (k !== 'fifty')
  console.log(`    ${k.padEnd(8)}  ${r.hp.toFixed(1).padStart(10)}  ${r.mid.toFixed(1).padStart(10)}  ${r.low.toFixed(1).padStart(8)}  ${r.peak.toFixed(1).padStart(6)}  dBFS`);
const bar = (cond, okMsg, badMsg) => { if (cond) console.log(`  ok   ${okMsg}`); else { bad++; console.log(`  BAD  ${badMsg}`); } };
bar(ev.prop.hp >= ev.tower.hp + 3,
  `(a) the CHOMP is ${(ev.prop.hp - ev.tower.hp).toFixed(1)} dB above the biggest ordinary bite where a phone can hear it`,
  `(a) the CHOMP is ${(ev.tower.hp - ev.prop.hp).toFixed(1)} dB BELOW the biggest ordinary bite above 450 Hz — the headline bite is the quiet one (bar: 3 dB above)`);
bar(ev.prop.low <= ev.pop32.low + 1,
  `(b) no new thud: below 250 Hz the CHOMP is ${ev.prop.low.toFixed(1)} dBFS against the plain bite's ${ev.pop32.low.toFixed(1)} (the owner's veto holds)`,
  `(b) a new thud: below 250 Hz the CHOMP is ${ev.prop.low.toFixed(1)} dBFS against the plain bite's ${ev.pop32.low.toFixed(1)} — the owner vetoed exactly this`);
bar(ev.rival.mid >= ev.bigEat.mid + 6,
  `(c) eating a rival is ${(ev.rival.mid - ev.bigEat.mid).toFixed(1)} dB louder than the old whoosh in 500 Hz-4 kHz`,
  `(c) eating a rival is only ${(ev.rival.mid - ev.bigEat.mid).toFixed(1)} dB over the old whoosh in 500 Hz-4 kHz (bar: 6 dB)`);
bar(ev.fifty.buffers <= 1,
  `(d) fifty bites allocate ${ev.fifty.buffers} audio buffer(s) — noise reads the shared white buffer`,
  `(d) fifty bites allocate ${ev.fifty.buffers} audio buffers — noise() builds a fresh buffer every call, the classic mobile-audio leak (bar: at most 1)`);
bar(Math.max(ev.prop.peak, ev.rival.peak) <= -3,
  `(e) peaks stay at or under -3 dBFS (${Math.max(ev.prop.peak, ev.rival.peak).toFixed(1)})`,
  `(e) a headline bite peaks at ${Math.max(ev.prop.peak, ev.rival.peak).toFixed(1)} dBFS, over the -3 dBFS ceiling`);

// ══ PART 3 — THE CHAIN: A CROWN EVERY TENTH NOM, AND THE CASH-IN ═══════════
// Research governor G6. The eating chain was silent — it paid a multiplier a
// child could not see and lapsed without a sound. It now has two sounds of its
// own, and they have to survive a phone speaker as well as the bites do: same
// band, same veto on anything below 250 Hz, same ceiling.
//
// THE THUD IS READ THROUGH A STEEP FILTER HERE. Parts 1-2 use one pole, which
// falls only 6 dB an octave, and that is fine for comparing a bite with a bite
// at similar levels. It is not fine for a sound twelve dB louder whose lowest
// note is C5: its first run read -46.7 dBFS "below 250 Hz" against the plain
// bite's -49.3 and failed (g) — on a synth whose lowest partial is 523 Hz. That
// was the crown's C5 leaking through one pole, not a thud. Four cascaded poles
// (24 dB an octave) put 523 Hz about 29 dB down and leave what is really below
// 250 Hz — the bite's own 52-150 Hz body — where it is.
const ch = await p.evaluate(async () => {
  const mod = await import('/src/proto3d/audio3d.ts');
  const band = (d, lo, hi) => {
    const dt = 1 / 44100;
    const aH = lo ? (1 / (2 * Math.PI * lo)) / ((1 / (2 * Math.PI * lo)) + dt) : 0;
    const aL = hi ? dt / ((1 / (2 * Math.PI * hi)) + dt) : 1;
    let hp = 0, xp = 0, l1 = 0, l2 = 0, l3 = 0, l4 = 0, sum = 0;
    for (let i = 0; i < d.length; i++) {
      const h = lo ? aH * (hp + d[i] - xp) : d[i]; xp = d[i]; hp = h;
      let y = h;
      if (hi) { l1 += aL * (y - l1); l2 += aL * (l1 - l2); l3 += aL * (l2 - l3); l4 += aL * (l3 - l4); y = l4; }
      sum += y * y;
    }
    return 20 * Math.log10(Math.sqrt(sum / d.length) || 1e-9);
  };
  const render = async (fn) => {
    const ctx = new OfflineAudioContext(1, 44100, 44100);
    const RealAC = window.AudioContext;
    window.AudioContext = function () { return ctx; };
    let a, has = true;
    try { a = mod.createAudio(); a.setMuted?.(false); has = fn(a) !== false; }
    finally { window.AudioContext = RealAC; }
    const d = (await ctx.startRendering()).getChannelData(0);
    let peak = 0; for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
    return { has, hp: band(d, 450, 0), low: band(d, 0, 250), peak: 20 * Math.log10(peak || 1e-9) };
  };
  return {
    pop: await render((a) => a.pop(0, 1.3, 2.5)),
    crown10: await render((a) => (a.nomCrown ? a.nomCrown(10) : false)),
    crown30: await render((a) => (a.nomCrown ? a.nomCrown(30) : false)),
    cash: await render((a) => (a.nomCash ? a.nomCash(14) : false)),
  };
});
console.log('\n  THE CHAIN — the crown every tenth nom, and the cash-in when it ends');
console.log('                     >450 Hz   <250 Hz    peak');
for (const [k, r] of Object.entries(ch))
  console.log(`    ${k.padEnd(8)}  ${r.has ? r.hp.toFixed(1).padStart(10) : '    absent'}  ${r.low.toFixed(1).padStart(8)}  ${r.peak.toFixed(1).padStart(6)}  dBFS`);
const chain = [ch.crown10, ch.crown30, ch.cash];
bar(chain.every((r) => r.has && r.hp >= ch.pop.hp),
  `(f) the crowns and the cash-in are no quieter than a plain bite where a phone can hear them (${chain.map((r) => r.hp.toFixed(1)).join(', ')} vs ${ch.pop.hp.toFixed(1)} dBFS)`,
  chain.some((r) => !r.has) ? '(f) the chain has no sound of its own — nomCrown()/nomCash() do not exist'
    : `(f) a chain sound is quieter than a plain bite above 450 Hz (${chain.map((r) => r.hp.toFixed(1)).join(', ')} vs ${ch.pop.hp.toFixed(1)} dBFS)`);
bar(chain.every((r) => r.has && r.low <= ch.pop.low + 1),
  `(g) no thud: below 250 Hz the chain sounds sit at ${chain.map((r) => r.low.toFixed(1)).join(', ')} against the bite's ${ch.pop.low.toFixed(1)} dBFS`,
  chain.some((r) => !r.has) ? '(g) nothing to check for a thud — the chain sounds do not exist'
    : `(g) a chain sound carries a thud below 250 Hz (${chain.map((r) => r.low.toFixed(1)).join(', ')} vs ${ch.pop.low.toFixed(1)} dBFS) — the owner vetoed exactly this`);
bar(chain.every((r) => r.has && r.peak <= -3),
  `(h) the chain sounds peak at or under -3 dBFS (${Math.max(...chain.map((r) => r.peak)).toFixed(1)})`,
  chain.some((r) => !r.has) ? '(h) nothing to check for a peak — the chain sounds do not exist'
    : `(h) a chain sound peaks at ${Math.max(...chain.map((r) => r.peak)).toFixed(1)} dBFS, over the -3 dBFS ceiling`);

// ══ PART 4 — THE END, IN EACH WORLD'S OWN VOICE ═════════════════════════════
// Research governor G4: the buzzer and a won dot both played evolve(), the
// form-up fanfare. The end now has whistle() — a referee, a ship's bell, the
// temple bell, sleigh bells, a burner and a chime, the town-hall bell — and the
// end card has finale(), one motif on each world's instrument. Same three
// tests as the chain: heard on a phone, no thud, under the ceiling.
const WORLDS6 = ['maple', 'pirate', 'gameday', 'lantern', 'powder', 'skylark'];
const endv = await p.evaluate(async (worlds) => {
  const mod = await import('/src/proto3d/audio3d.ts');
  const isl = await import('/src/proto3d/island.ts');
  const band = (d, lo, hi) => {
    const dt = 1 / 44100;
    const aH = lo ? (1 / (2 * Math.PI * lo)) / ((1 / (2 * Math.PI * lo)) + dt) : 0;
    const aL = hi ? dt / ((1 / (2 * Math.PI * hi)) + dt) : 1;
    let hp = 0, xp = 0, l1 = 0, l2 = 0, l3 = 0, l4 = 0, sum = 0;
    for (let i = 0; i < d.length; i++) {
      const h = lo ? aH * (hp + d[i] - xp) : d[i]; xp = d[i]; hp = h;
      let y = h;
      if (hi) { l1 += aL * (y - l1); l2 += aL * (l1 - l2); l3 += aL * (l2 - l3); l4 += aL * (l3 - l4); y = l4; }
      sum += y * y;
    }
    return 20 * Math.log10(Math.sqrt(sum / d.length) || 1e-9);
  };
  const render = async (w, fn) => {
    isl.setWorld(w);
    const ctx = new OfflineAudioContext(1, 44100 * 2, 44100);
    const RealAC = window.AudioContext;
    window.AudioContext = function () { return ctx; };
    let a, has = true;
    try { a = mod.createAudio(); a.setMuted?.(false); has = fn(a) !== false; }
    finally { window.AudioContext = RealAC; }
    const d = (await ctx.startRendering()).getChannelData(0);
    let peak = 0; for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
    return { has, hp: band(d, 450, 0), low: band(d, 0, 250), peak: 20 * Math.log10(peak || 1e-9) };
  };
  const out = { pop: await render('maple', (a) => a.pop(0, 1.3, 2.5)) };
  for (const w of worlds) {
    out[`${w}:whistle`] = await render(w, (a) => (a.whistle ? a.whistle() : false));
    out[`${w}:finale`] = await render(w, (a) => (a.finale ? a.finale(false) : false));
  }
  return out;
}, WORLDS6);
console.log('\n  THE END — each world\'s whistle and its end-card motif (2 s renders)');
console.log('                         >450 Hz   <250 Hz    peak');
for (const [k, r] of Object.entries(endv))
  console.log(`    ${k.padEnd(16)}  ${r.has ? r.hp.toFixed(1).padStart(8) : '  absent'}  ${r.low.toFixed(1).padStart(8)}  ${r.peak.toFixed(1).padStart(6)}  dBFS`);
const ends = Object.entries(endv).filter(([k]) => k !== 'pop');
const missing = ends.filter(([, r]) => !r.has).map(([k]) => k);
const quiet = ends.filter(([, r]) => r.has && r.hp < endv.pop.hp).map(([k]) => k);
const thud = ends.filter(([, r]) => r.has && r.low > endv.pop.low + 1).map(([k]) => k);
const hot = ends.filter(([, r]) => r.has && r.peak > -3).map(([k]) => k);
bar(!missing.length && !quiet.length,
  `(i) every world's whistle and motif is at least as loud as a plain bite where a phone can hear it`,
  missing.length ? `(i) no end sound of its own in: ${missing.join(', ')}` : `(i) quieter than a plain bite above 450 Hz: ${quiet.join(', ')}`);
bar(!missing.length && !thud.length,
  `(j) no thud: nothing below 250 Hz beyond a plain bite's ${endv.pop.low.toFixed(1)} dBFS`,
  missing.length ? '(j) nothing to check for a thud — the end sounds do not exist' : `(j) a thud below 250 Hz in: ${thud.join(', ')}`);
bar(!missing.length && !hot.length,
  `(k) every end sound peaks at or under -3 dBFS (${Math.max(...ends.map(([, r]) => r.peak)).toFixed(1)})`,
  missing.length ? '(k) nothing to check for a peak — the end sounds do not exist' : `(k) over the -3 dBFS ceiling: ${hot.join(', ')}`);

// ══ PART 5 — THE TICKS GET THEIR OWN VOICE ═════════════════════════════════
// Research governor G4. The countdown, the coin count-up and the drop charge
// all ticked on pop() — the EAT sound — and pop() drops anything inside 75 ms
// of the last one. So a countdown tick swallowed a real bite that landed right
// after it, and the count-up's "rising" ticks walked the eat melody's ladder,
// which turns back down at its top (PENTA = 0 2 4 7 9 12 9 7). Measured on the
// build as shipped: what the count-up call site plays (tick(i, 8) where it
// exists, else the pop(3 + i) it used), and a real bite 30 ms after a tick.
// Math.random is seeded per render so two renders differ only by what was asked.
const tk = await p.evaluate(async () => {
  const mod = await import('/src/proto3d/audio3d.ts');
  const seed = () => { let x = 12345; Math.random = () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648); };
  const realRandom = Math.random;
  const render = async (fn, secs = 1.2) => {
    seed();
    const ctx = new OfflineAudioContext(1, Math.floor(44100 * secs), 44100);
    const RealAC = window.AudioContext;
    window.AudioContext = function () { return ctx; };
    let a;
    try { a = mod.createAudio(); a.setMuted?.(false); fn(a, ctx); }
    finally { window.AudioContext = RealAC; }
    const d = (await ctx.startRendering()).getChannelData(0);
    return Array.from(d);
  };
  const at = (ctx, t) => Object.defineProperty(ctx, 'currentTime', { value: t, configurable: true });
  const tickFn = (a, i, n) => (a.tick ? a.tick(i, n) : a.pop(3 + i));
  // (l) a tick at 0, a bite at 30 ms
  const only = await render((a, ctx) => { at(ctx, 0); tickFn(a, 0, 10); });
  const both = await render((a, ctx) => { at(ctx, 0); tickFn(a, 0, 10); at(ctx, 0.03); a.pop(0, 1.3, 2.5); });
  const biteOnly = await render((a, ctx) => { at(ctx, 0.03); a.pop(0, 1.3, 2.5); });
  // over the sound's OWN 200 ms, not the whole render: a 0.15 s tick averaged
  // across 1.2 s reads ~9 dB quieter than it is, and the first run of this
  // bar put a plain bite, alone, under -40 that way
  const rms = (d, t0 = 0) => { const a = Math.floor(t0 * 44100), n = Math.floor(0.2 * 44100);
    let q = 0; for (let i = a; i < a + n; i++) q += (d[i] || 0) ** 2;
    return 20 * Math.log10(Math.sqrt(q / n) || 1e-9); };
  const diff = both.map((v, i) => v - only[i]);
  // (m) eight count-up ticks, 112 ms apart, as the count-up calls them
  const GAP = 0.1125;
  const run = await render((a, ctx) => { for (let i = 0; i < 8; i++) { at(ctx, i * GAP); tickFn(a, i, 8); } }, 1.4);
  Math.random = realRandom;
  const pitch = (d, t0) => {
    const s0 = Math.floor((t0 + 0.004) * 44100), N = 1764;   // 40 ms from 4 ms after onset
    let best = 0, bestF = 0;
    for (let f = 200; f <= 3000; f += 5) {
      let re = 0, im = 0;
      for (let k = 0; k < N; k++) {
        const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * k) / (N - 1));
        const v = (d[s0 + k] || 0) * w, ph = (2 * Math.PI * f * k) / 44100;
        re += v * Math.cos(ph); im -= v * Math.sin(ph);
      }
      const m = re * re + im * im;
      if (m > best) { best = m; bestF = f; }
    }
    return bestF;
  };
  const pitches = []; for (let i = 0; i < 8; i++) pitches.push(pitch(run, i * GAP));
  return { hasTick: true, tickDb: rms(only), biteDb: rms(diff, 0.03), biteAlone: rms(biteOnly, 0.03), pitches };
});
console.log('\n  THE TICKS — a countdown tick and a bite 30 ms later; eight count-up ticks');
console.log(`    tick alone ${tk.tickDb.toFixed(1)} dBFS, the bite that followed it ${tk.biteDb.toFixed(1)} dBFS (the same bite alone: ${tk.biteAlone.toFixed(1)})`);
console.log(`    count-up pitches: ${tk.pitches.join(' → ')} Hz`);
bar(tk.tickDb > -40 && tk.biteDb > -40,
  `(l) the tick and the bite 30 ms after it both sound (${tk.tickDb.toFixed(1)}, ${tk.biteDb.toFixed(1)} dBFS; bar -40)`,
  `(l) ${tk.biteDb <= -40 ? 'the bite 30 ms after a countdown tick is swallowed' : 'the tick is inaudible'} (${tk.tickDb.toFixed(1)}, ${tk.biteDb.toFixed(1)} dBFS; bar -40)`);
const rising = tk.pitches.every((f, i) => i === 0 || f > tk.pitches[i - 1]);
bar(rising, `(m) the eight count-up ticks rise, every one: ${tk.pitches.join(' → ')} Hz`,
  `(m) the count-up does not rise all the way: ${tk.pitches.join(' → ')} Hz`);

// ══ PART 6 — THE END BEAT'S RIVAL IS HEARD, NOT ANNOUNCED ══════════════════
// Verify pass on the pre-merge fixes: inside the outro a rival kill was moved
// from chomp() to a plain pop() so its fanfare would not talk over the whistle
// — and pop() drops anything inside 75 ms of the last bite, which in a hoover
// is nearly every frame, so the kill went down in silence. The game now plays
// chomp(…, plain = true): the tuned note, let past the gate, and nothing else.
// Rendered here: a bite at 0 and the rival at 20 ms, three ways.
const pl = await p.evaluate(async () => {
  const mod = await import('/src/proto3d/audio3d.ts');
  const seed = () => { let x = 777; Math.random = () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648); };
  const realRandom = Math.random;
  const render = async (fn) => {
    seed();
    const ctx = new OfflineAudioContext(1, Math.floor(44100 * 1.2), 44100);
    const RealAC = window.AudioContext;
    window.AudioContext = function () { return ctx; };
    try { const a = mod.createAudio(); a.setMuted?.(false); fn(a, ctx); }
    finally { window.AudioContext = RealAC; }
    return Array.from((await ctx.startRendering()).getChannelData(0));
  };
  const at = (ctx, t) => Object.defineProperty(ctx, 'currentTime', { value: t, configurable: true });
  const rms = (d, t0, len) => { const a = Math.floor(t0 * 44100), n = Math.floor(len * 44100);
    let q = 0; for (let i = a; i < a + n; i++) q += (d[i] || 0) ** 2; return 20 * Math.log10(Math.sqrt(q / n) || 1e-9); };
  const bite = await render((a, ctx) => { at(ctx, 0); a.pop(0, 1.3, 2.5); });
  const viaPop = await render((a, ctx) => { at(ctx, 0); a.pop(0, 1.3, 2.5); at(ctx, 0.02); a.pop(0, 6, 3); });
  const viaPlain = await render((a, ctx) => { at(ctx, 0); a.pop(0, 1.3, 2.5); at(ctx, 0.02); a.chomp(6, 3, 'rival', 0, true); });
  const full = await render((a, ctx) => { at(ctx, 0); a.pop(0, 1.3, 2.5); at(ctx, 0.02); a.chomp(6, 3, 'rival', 0); });
  const plainAlone = await render((a, ctx) => { at(ctx, 0.02); a.chomp(6, 3, 'rival', 0, true); });
  const popAlone = await render((a, ctx) => { at(ctx, 0.02); a.pop(0, 6, 3); });
  Math.random = realRandom;
  const minus = (x) => x.map((v, i) => v - bite[i]);
  return {
    pop: rms(minus(viaPop), 0.02, 0.2), plain: rms(minus(viaPlain), 0.02, 0.2),
    // the glock arpeggio lives at 0.3-0.73 s: what a plain chomp adds there over a bare pop
    tailPlain: rms(plainAlone, 0.32, 0.45), tailPop: rms(popAlone, 0.32, 0.45), tailFull: rms(minus(full), 0.32, 0.45),
  };
});
console.log(`\n  THE END BEAT'S RIVAL — a bite at 0, the rival at 20 ms`);
console.log(`    as a plain pop() (the outro path the verify pass flagged): ${pl.pop.toFixed(1)} dBFS;  as chomp(plain): ${pl.plain.toFixed(1)} dBFS`);
console.log(`    0.32-0.77 s, where the rival's glock sits: plain ${pl.tailPlain.toFixed(1)}, a bare pop ${pl.tailPop.toFixed(1)}, the full chomp ${pl.tailFull.toFixed(1)} dBFS`);
bar(pl.plain > -40, `(n) the end beat's rival sounds 20 ms after a bite (${pl.plain.toFixed(1)} dBFS; bar -40)`,
  `(n) the end beat's rival is swallowed 20 ms after a bite (${pl.plain.toFixed(1)} dBFS; bar -40)`);
bar(pl.tailPlain <= pl.tailPop + 1 && pl.tailFull > pl.tailPlain + 6,
  `(o) and it carries no fanfare: its tail is a bare pop's (${pl.tailPlain.toFixed(1)} vs ${pl.tailPop.toFixed(1)}), the full chomp's is ${pl.tailFull.toFixed(1)}`,
  `(o) the plain rival still carries more than a pop (${pl.tailPlain.toFixed(1)} vs ${pl.tailPop.toFixed(1)}; full ${pl.tailFull.toFixed(1)})`);

// ══ PART 7 — THE TOP OF THE CROWN LADDER IS NOT A WHISTLE IN HER EAR ═══════
// Verify pass (audio-3): the crown ladder now climbs two octaves and holds, so
// from a chain of 110 the root is 2093 Hz and the sparkle pings (root x 3, 4,
// 5.04) land at 6.3, 8.4 and 10.5 kHz — against 5.3 kHz before the ladder was
// fixed. A child's ears are at their most sensitive up there. Rendered: the
// crown at 10, at 60 (root 1046.5 Hz — the old ladder's ceiling) and at 110,
// and the share of each above 7 kHz — by FFT, not by filter: a cascade of
// one-pole high-passes at 7 kHz (part 3's thud tool) leaks the crown's own
// 2-3 kHz triad into the band at the top of the ladder, where the triad is
// forty times louder than the sparkle, and read that as harshness. BAR: the new top is no harsher up there than the old top was — the
// crown at 110 within 3 dB of the crown at 60.
const cr = await p.evaluate(async () => {
  const mod = await import('/src/proto3d/audio3d.ts');
  const render = async (n) => {
    const ctx = new OfflineAudioContext(1, Math.floor(44100 * 0.8), 44100);
    const RealAC = window.AudioContext;
    window.AudioContext = function () { return ctx; };
    try { const a = mod.createAudio(); a.setMuted?.(false); a.nomCrown(n); }
    finally { window.AudioContext = RealAC; }
    return Array.from((await ctx.startRendering()).getChannelData(0));
  };
  // radix-2 FFT over the first 32768 samples (0.74 s — the whole crown), Hann window
  const band = (d, fc) => {
    const N = 32768, re = new Float64Array(N), im = new Float64Array(N);
    for (let i = 0; i < N; i++) re[i] = (d[i] || 0) * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1)));
    for (let i = 1, j = 0; i < N; i++) { let bit = N >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit;
      if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
    for (let len = 2; len <= N; len <<= 1) {
      const ang = (-2 * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang);
      for (let i = 0; i < N; i += len) {
        let cr = 1, ci = 0;
        for (let k = 0; k < len / 2; k++) {
          const a = i + k, b2 = a + len / 2;
          const tr = re[b2] * cr - im[b2] * ci, ti = re[b2] * ci + im[b2] * cr;
          re[b2] = re[a] - tr; im[b2] = im[a] - ti; re[a] += tr; im[a] += ti;
          const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
        }
      }
    }
    let all = 0, hi = 0; const kc = Math.round((fc * N) / 44100);
    for (let k = 1; k < N / 2; k++) { const m = re[k] * re[k] + im[k] * im[k]; all += m; if (k >= kc) hi += m; }
    return { all: 10 * Math.log10(all || 1e-30), hi: 10 * Math.log10(hi || 1e-30) };
  };
  const out = {};
  for (const n of [10, 60, 110]) out[n] = band(await render(n), 7000);
  return out;
});
const share = (x) => x.hi - x.all;
console.log('\n  THE TOP OF THE CROWN LADDER — energy above 7 kHz, relative to the whole crown');
console.log(`    crown at 10: ${share(cr[10]).toFixed(1)} dB;  at 60 (the old ceiling): ${share(cr[60]).toFixed(1)} dB;  at 110: ${share(cr[110]).toFixed(1)} dB`);
const lim = share(cr[60]) + 3;
bar(share(cr[110]) <= lim, `(p) the top of the ladder is no harsher above 7 kHz than the old top (${share(cr[110]).toFixed(1)} vs ${share(cr[60]).toFixed(1)} dB; bar ${lim.toFixed(1)})`,
  `(p) the crown at 110 puts ${share(cr[110]).toFixed(1)} dB of itself above 7 kHz against the old top's ${share(cr[60]).toFixed(1)} (bar ${lim.toFixed(1)}) — a whistle in a child's ear`);

await b.close();
console.log(`\n${bad ? 'FAIL' : 'PASS'} — ${bad} bad`);
process.exit(bad ? 1 : 0);

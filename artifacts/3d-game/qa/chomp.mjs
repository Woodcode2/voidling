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

await b.close();
console.log(`\n${bad ? 'FAIL' : 'PASS'} — ${bad} bad`);
process.exit(bad ? 1 : 0);

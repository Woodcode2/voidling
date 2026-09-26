// BELLCLOUD HEIGHTS — IS THE GREAT BELL A BELL A CHILD CAN HEAR ON A PHONE?
// (docs/BELLCLOUD.md §5.6, bars S1-S3)
//
//   node qa/bellsound.mjs [port]          (a vite dev server: it imports /src)
//
// Renders the real synth offline, the qa/chomp.mjs way — a static page on the
// dev origin, audio3d.ts imported as the game imports it, createAudio() handed
// an OfflineAudioContext by standing in front of the AudioContext constructor
// — and measures three things on audio3d's own greatBell():
//
//   S1  at least 50% of the first second's energy is above 500 Hz. A phone
//       speaker gives up below about 500 Hz (audio3d.ts's town-bell note on
//       qa/chomp.mjs (j)); the nominal and above carry the BONG on a phone and
//       the hum is for headphones. Energy above 500 Hz is read off the first
//       second's power spectrum (see measure(): a filter first stood here and
//       under-read the nominal itself).
//   S2  no partial below 120 Hz (the burp rule, G9): read off BELL_PARTIALS
//       in the source, ratio x 261.63.
//   S3  its peak within ±3 dB of evolve()'s peak, rendered the same way — the
//       biggest sound in the match, not louder than a fanfare.
//
// And it reports the short strike the skylark whistle() plays, for the ear.
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const PORT = process.argv[2] || '4229';
const src = readFileSync(new URL('../src/proto3d/audio3d.ts', import.meta.url), 'utf8');
const m = /const BELL_PARTIALS[^=]*=\s*\[([\s\S]*?)\];/.exec(src);
if (!m) throw new Error('bellsound: no BELL_PARTIALS in audio3d.ts');
const partials = [...m[1].matchAll(/\[\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\]/g)].map(([, r, v, d]) => [+r, +v, +d]);
if (partials.length < 4) throw new Error(`bellsound: read ${partials.length} partials — the literal moved`);

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
let rows;
try {
  const p = await b.newPage();
  await p.goto(`http://127.0.0.1:${PORT}/privacy.html`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  rows = await p.evaluate(async () => {
    // the world first: whistle() and evolve() speak in the world's own voice
    // (audio3d reads island.ts's worldId()), so this is BELLCLOUD's whistle
    (await import('/src/proto3d/island.ts')).setWorld('skylark');
    const mod = await import('/src/proto3d/audio3d.ts');
    const render = async (secs, fn) => {
      const ctx = new OfflineAudioContext(1, Math.floor(44100 * secs), 44100);
      const RealAC = window.AudioContext;
      window.AudioContext = function () { return ctx; };
      try { const a = mod.createAudio(); a.setMuted?.(false); fn(a); } finally { window.AudioContext = RealAC; }
      const buf = await ctx.startRendering();
      return buf.getChannelData(0);
    };
    // THE SPLIT IS AN FFT, NOT A FILTER. The first version ran the first
    // second through two one-pole high-passes at 500 Hz, which pass a 523 Hz
    // nominal at 27% of its power: it read the bell's own BONG partial as
    // mostly "below 500". Energy above 500 Hz is the power spectrum's bins at
    // or above 500 Hz over all of them, first second, Hann-windowed.
    const measure = (d) => {
      const N = 65536, n = Math.min(d.length, 44100);
      const re = new Float64Array(N), im = new Float64Array(N);
      for (let i = 0; i < n; i++) re[i] = d[i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)));
      for (let i = 1, j = 0; i < N; i++) {
        let bit = N >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit;
        if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
      }
      for (let len = 2; len <= N; len <<= 1) {
        const ang = (-2 * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang);
        for (let i = 0; i < N; i += len) {
          let cr = 1, ci = 0;
          for (let k = 0; k < len / 2; k++) {
            const a = i + k, b2 = a + len / 2;
            const tr = re[b2] * cr - im[b2] * ci, ti = re[b2] * ci + im[b2] * cr;
            re[b2] = re[a] - tr; im[b2] = im[a] - ti; re[a] += tr; im[a] += ti;
            const ncr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = ncr;
          }
        }
      }
      let eAll = 0, eHi = 0;
      for (let k = 1; k < N / 2; k++) { const e = re[k] * re[k] + im[k] * im[k]; eAll += e; if ((k * 44100) / N >= 500) eHi += e; }
      let peak = 0; for (let i = 0; i < d.length; i++) if (Math.abs(d[i]) > peak) peak = Math.abs(d[i]);
      return { hiShare: eHi / (eAll || 1e-12), peakDb: 20 * Math.log10(peak || 1e-9) };
    };
    return {
      bell: measure(await render(3, (a) => a.greatBell())),
      whistle: measure(await render(3, (a) => a.whistle())),
      evolve: measure(await render(3, (a) => a.evolve())),
    };
  });
} finally { await b.close(); }

const fails = [];
const low = partials.filter(([r]) => r * 261.63 < 120);
console.log(`  greatBell    first-second energy above 500 Hz ${(rows.bell.hiShare * 100).toFixed(1)}%   peak ${rows.bell.peakDb.toFixed(1)} dBFS`);
console.log(`  whistle      first-second energy above 500 Hz ${(rows.whistle.hiShare * 100).toFixed(1)}%   peak ${rows.whistle.peakDb.toFixed(1)} dBFS  (skylark)`);
console.log(`  evolve       peak ${rows.evolve.peakDb.toFixed(1)} dBFS  (skylark)`);
console.log(`  partials     ${partials.map(([r]) => (r * 261.63).toFixed(1)).join(' ')} Hz`);
if (rows.bell.hiShare < 0.5) fails.push(`S1 ${(rows.bell.hiShare * 100).toFixed(1)}% of the first second's energy is above 500 Hz (bar 50%)`);
if (low.length) fails.push(`S2 ${low.length} partial(s) below 120 Hz`);
const dd = rows.bell.peakDb - rows.evolve.peakDb;
if (Math.abs(dd) > 3) fails.push(`S3 the bell's peak is ${dd.toFixed(1)} dB from evolve()'s (bar ±3)`);
for (const f of fails) console.log(`  FAIL  ${f}`);
console.log(fails.length ? `FAIL — bellsound: ${fails.length} bar(s)` : `PASS — bellsound: a bell a phone can play, nothing under 120 Hz, as loud as a fanfare (${dd >= 0 ? '+' : ''}${dd.toFixed(1)} dB)`);
process.exit(fails.length ? 1 : 0);

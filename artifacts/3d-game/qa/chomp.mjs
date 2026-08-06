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
await p.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 300000 });

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
await b.close();
process.exit(big >= small ? 0 : 1);

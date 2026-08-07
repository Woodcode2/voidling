// PROGRAM LEVEL AND LIMITER DUCKING AT THE CLIMAX.
//
//   node qa/_mix2.mjs <devPort> <world>
//
// Three renders of the same 10 seconds: the stage-3 bed alone, the eat stream
// alone, and both together. Because everything meets at one
// DynamicsCompressor (audio3d.ts:86, threshold -6, ratio 12, release 0.14),
// "both together" is not the power sum of the two — the difference IS the
// ducking a child hears when the music drops under a hoover spree.
//
// The eat stream is fired at 13.3 calls/s, which is the ceiling the pop()
// rate limiter allows (`now - lastPop < 0.075` at audio3d.ts:3161), with meal
// radii drawn from the distribution qa/_stagetime.mjs measured in a real
// match's last 20 seconds.
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4244';
const WORLD = process.argv[3] || 'maple';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 300000 });
const out = await p.evaluate(async ({ WORLD }) => {
  const isl = await import('/src/proto3d/island.ts');
  const mod = await import('/src/proto3d/audio3d.ts');
  const SR = 48000, DUR = 12;
  const dB = (v) => 20 * Math.log10(v || 1e-12);
  const hp = (d) => { const rc = 1 / (2 * Math.PI * 450), dt = 1 / SR, al = rc / (rc + dt);
    const o = new Float32Array(d.length); let y = 0, xp = 0;
    for (let i = 0; i < d.length; i++) { y = al * (y + d[i] - xp); xp = d[i]; o[i] = y; } return o; };
  const rms = (d, a, n) => { let s = 0; for (let i = a; i < a + n; i++) s += d[i] * d[i]; return Math.sqrt(s / n); };
  const pk = (d) => { let m = 0; for (let i = 0; i < d.length; i++) if (Math.abs(d[i]) > m) m = Math.abs(d[i]); return m; };

  async function render(withBed, withPops) {
    isl.setWorld(WORLD);
    const ctx = new OfflineAudioContext(1, SR * DUR, SR);
    let fake = 0;
    Object.defineProperty(ctx, 'currentTime', { get: () => fake, configurable: true });
    Object.defineProperty(ctx, 'state', { get: () => 'running', configurable: true });
    const pumps = [];
    const RAC = window.AudioContext, RSI = window.setInterval, RCI = window.clearInterval;
    window.AudioContext = function () { return ctx; };
    window.setInterval = (f) => { pumps.push(f); return pumps.length; };
    window.clearInterval = () => {};
    try {
      const a = mod.createAudio(); a.setMuted(false); a.setMusicStage(3);
      if (withBed) { a.startMusic(); for (let i = 0; i < 200 && !pumps.length; i++) await new Promise((r) => setTimeout(r, 25)); }
      // meal sizes as measured in the last 20s of a real match: p50 1.0, p90 2.6, p99 4.4
      const MEALS = [0.9, 1.2, 0.9, 2.6, 1.0, 0.9, 1.4, 4.4, 0.9, 1.1];
      let mi = 0, nextPop = 2.0;
      const STEP = 1 / 48;   // fine enough to place pops on a 75 ms grid
      for (fake = 0; fake < DUR - 0.3; fake += STEP) {
        if (withPops && fake >= nextPop && fake >= 2.0) {
          a.pop(6, MEALS[mi++ % MEALS.length], 9.0);
          nextPop = fake + 0.0755;
        }
        for (const f of pumps) f();
      }
    } finally { window.AudioContext = RAC; window.setInterval = RSI; window.clearInterval = RCI; }
    const d = (await ctx.startRendering()).getChannelData(0);
    return d.subarray(SR * 4, SR * 11);   // steady state, well past the swell
  }

  const bed = await render(true, false);
  const pops = await render(false, true);
  const both = await render(true, true);
  const N = bed.length;
  const r = (d) => dB(rms(d, 0, d.length));
  const rh = (d) => dB(rms(hp(d), 0, d.length));
  const sum = Math.sqrt(Math.pow(10, r(bed) / 10) + Math.pow(10, r(pops) / 10));
  // per-100ms bed-band energy in `both` minus in `bed`: how far the music is
  // pushed down while the eats are running
  return { bed: r(bed), pops: r(pops), both: r(both), expected: dB(sum),
    bedHp: rh(bed), popsHp: rh(pops), bothHp: rh(both),
    peakBed: dB(pk(bed)), peakPops: dB(pk(pops)), peakBoth: dB(pk(both)) };
}, { WORLD });
console.log(`\n${WORLD.toUpperCase()} — 7 s of steady state, stage 3`);
console.log(`  bed alone        RMS ${out.bed.toFixed(1)} dBFS   >450Hz ${out.bedHp.toFixed(1)}   peak ${out.peakBed.toFixed(1)}`);
console.log(`  eats alone       RMS ${out.pops.toFixed(1)} dBFS   >450Hz ${out.popsHp.toFixed(1)}   peak ${out.peakPops.toFixed(1)}`);
console.log(`  both             RMS ${out.both.toFixed(1)} dBFS   >450Hz ${out.bothHp.toFixed(1)}   peak ${out.peakBoth.toFixed(1)}`);
console.log(`  power sum if the limiter did nothing: ${out.expected.toFixed(1)} dBFS`);
console.log(`  LIMITER GAIN REDUCTION at the climax: ${(out.both - out.expected).toFixed(1)} dB`);
await b.close();

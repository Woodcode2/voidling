// THE SCORE, RENDERED OFFLINE, PER WORLD PER STAGE.
//
//   node qa/_scorespec.mjs <devPort>
//
// The four synth scores schedule every note onto ctx.currentTime from a
// setInterval lookahead pump. That makes them renderable EXACTLY, with no
// dependence on wall clock or on the software renderer, if you do two things:
//   1. hand createAudio() an OfflineAudioContext whose `currentTime` is a
//      settable shadow property, so the pump can be walked forward by hand;
//   2. capture the setInterval callback instead of letting it run, so the
//      pump fires when we say and not when the event loop feels like it.
// Then startRendering() gives the real waveform of N seconds of that world's
// band at that stage, sample-accurate.
//
// Reported per (world, stage): full-band RMS, RMS through a 450 Hz one-pole
// high-pass (the phone-speaker measure used by qa/chomp.mjs), true peak, and
// third-octave-ish band levels so masking can be argued with numbers.
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import { ALL_WORLDS } from './worlds.mjs';

const PORT = process.argv[2] || '4244';
const DUR = Number(process.argv[3] || 16);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const p = await b.newPage();
p.on('console', (m) => { if (m.type() === 'error') console.error('  page:', m.text().slice(0, 160)); });
await p.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 300000 });

const out = await p.evaluate(async ({ DUR }) => {
  const isl = await import('/src/proto3d/island.ts');
  const mod = await import('/src/proto3d/audio3d.ts');
  const SR = 48000;

  // 450 Hz one-pole high-pass, identical to qa/chomp.mjs
  const hpRms = (d) => {
    const rc = 1 / (2 * Math.PI * 450), dt = 1 / SR, al = rc / (rc + dt);
    let y = 0, xp = 0, s = 0;
    for (let i = 0; i < d.length; i++) { y = al * (y + d[i] - xp); xp = d[i]; s += y * y; }
    return Math.sqrt(s / d.length);
  };
  const rms = (d) => { let s = 0; for (let i = 0; i < d.length; i++) s += d[i] * d[i]; return Math.sqrt(s / d.length); };
  const peak = (d) => { let m = 0; for (let i = 0; i < d.length; i++) if (Math.abs(d[i]) > m) m = Math.abs(d[i]); return m; };
  const dB = (v) => 20 * Math.log10(v || 1e-12);

  // octave band levels via a naive DFT-free approach: biquad-free, use FFT on
  // hann-windowed 8192 frames and sum power per band.
  const EDGES = [63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
  function bands(d) {
    const N = 8192;
    const acc = new Float64Array(EDGES.length - 1);
    let frames = 0;
    const re = new Float64Array(N), im = new Float64Array(N);
    const win = new Float64Array(N);
    for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
    // radix-2 iterative FFT
    const rev = new Uint32Array(N);
    for (let i = 1, j = 0; i < N; i++) {
      let bit = N >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit; rev[i] = j;
    }
    for (let off = 0; off + N <= d.length; off += N) {
      for (let i = 0; i < N; i++) { re[i] = d[off + i] * win[i]; im[i] = 0; }
      for (let i = 0; i < N; i++) if (i < rev[i]) { const tr = re[i]; re[i] = re[rev[i]]; re[rev[i]] = tr; const ti = im[i]; im[i] = im[rev[i]]; im[rev[i]] = ti; }
      for (let len = 2; len <= N; len <<= 1) {
        const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
        for (let i = 0; i < N; i += len) {
          let cr = 1, ci = 0;
          for (let k = 0; k < len / 2; k++) {
            const ur = re[i + k], ui = im[i + k];
            const vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
            const vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
            re[i + k] = ur + vr; im[i + k] = ui + vi;
            re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
            const ncr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = ncr;
          }
        }
      }
      for (let k = 1; k < N / 2; k++) {
        const f = k * SR / N;
        let bi = -1;
        for (let e = 0; e < EDGES.length - 1; e++) if (f >= EDGES[e] && f < EDGES[e + 1]) { bi = e; break; }
        if (bi < 0) continue;
        acc[bi] += (re[k] * re[k] + im[k] * im[k]) * 2 / (N * N);
      }
      frames++;
    }
    return Array.from(acc).map((v) => 10 * Math.log10((v / Math.max(1, frames)) || 1e-14));
  }

  // render one (world, stage). `sting` optionally fires a one-shot at t=1.0.
  async function render(world, stage, opts = {}) {
    isl.setWorld(world);
    const ctx = new OfflineAudioContext(1, SR * DUR, SR);
    let fake = 0;
    Object.defineProperty(ctx, 'currentTime', { get: () => fake, configurable: true });
    Object.defineProperty(ctx, 'state', { get: () => 'running', configurable: true });
    const pumps = [];
    const RealAC = window.AudioContext, RealSI = window.setInterval, RealCI = window.clearInterval;
    window.AudioContext = function () { return ctx; };
    window.setInterval = (fn) => { pumps.push(fn); return pumps.length; };
    window.clearInterval = () => {};
    let a;
    try {
      a = mod.createAudio();
      a.setMuted(false);
      a.setMusicStage(stage);
      if (opts.zone) a.setZone(opts.zone);
      if (!opts.noMusic) a.startMusic();
      // startMusic fetches /assets/music/<world>.mp3; only when that fails does
      // it fall back to the synth. Wait for the 404 round trip.
      for (let i = 0; i < 40 && pumps.length === 0 && !opts.noMusic; i++) await new Promise((r) => setTimeout(r, 25));
      // walk the pump forward by hand
      const STEP = 0.25;
      for (fake = 0; fake < DUR - 0.5; fake += STEP) {
        if (opts.stingAt != null && fake <= opts.stingAt && fake + STEP > opts.stingAt) opts.fire(a);
        for (const fn of pumps) fn();
      }
      if (opts.stingAt != null && opts.stingAt === 0) { /* already fired */ }
    } finally {
      window.AudioContext = RealAC; window.setInterval = RealSI; window.clearInterval = RealCI;
    }
    const buf = await ctx.startRendering();
    const d = buf.getChannelData(0);
    // skip the opening 2s swell so we measure the steady state
    const s = d.subarray(SR * 2);
    return { rms: dB(rms(s)), hp: dB(hpRms(s)), peak: dB(peak(s)), bands: bands(s), pumped: pumps.length };
  }

  const res = { beds: [], oneShots: [] };
  for (const w of ALL_WORLDS) {
    for (const st of [0, 1, 2, 3, 4]) {
      res.beds.push({ w, st, ...(await render(w, st)) });
    }
  }
  return res;
}, { DUR });

const F = (v) => v.toFixed(1).padStart(6);
console.log(`bed, steady state, ${DUR - 2}s measured (skipping the 2s opening swell)\n`);
console.log('world     st   RMS dBFS   >450Hz    peak    | 63  125  250  500   1k   2k   4k   8k');
let prev = {};
for (const r of out.beds) {
  const bs = r.bands.map((v) => v.toFixed(0).padStart(4)).join(' ');
  const dHP = prev[r.w] === undefined ? '' : `  (${(r.hp - prev[r.w] >= 0 ? '+' : '')}${(r.hp - prev[r.w]).toFixed(1)} dB vs st${r.st - 1})`;
  prev[r.w] = r.hp;
  console.log(`${r.w.padEnd(9)} ${r.st}  ${F(r.rms)}   ${F(r.hp)}  ${F(r.peak)}    |${bs}${dHP}`);
}
console.log();
for (const w of ALL_WORLDS) {
  const rows = out.beds.filter((r) => r.w === w);
  const s0 = rows[0].hp, s3 = rows[3].hp, s4 = rows[4].hp;
  console.log(`${w.padEnd(9)} stage0->3 above 450 Hz: ${(s3 - s0>=0?'+':'')}${(s3 - s0).toFixed(1)} dB   stage3->4: ${(s4 - s3>=0?'+':'')}${(s4 - s3).toFixed(1)} dB`);
}
writeFileSync('/tmp/claude-0/-home-user-voidling/1f93d8f7-3ff2-5559-8b0b-a74b62b39437/scratchpad/scorespec.json', JSON.stringify(out, null, 1));
await b.close();

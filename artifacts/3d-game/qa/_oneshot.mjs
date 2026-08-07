// EVERY ONE-SHOT, RENDERED OFFLINE, AGAINST THE BED IT HAS TO CUT THROUGH.
//
//   node qa/_oneshot.mjs <devPort> [world]
//
// Same offline harness as qa/_scorespec.mjs: createAudio() is handed an
// OfflineAudioContext with a hand-driven `currentTime`, so a one-shot renders
// exactly as it will sound. Each is reported as
//   * peak dBFS
//   * loudest-200ms RMS through the 450 Hz high-pass (the phone-speaker
//     measure — a phone cannot reproduce the sub that flatters a raw peak)
//   * per-octave level, and the same octaves for the world's stage-3 bed, so
//     "does it cut through" is a signal-to-masker ratio and not an adjective.
import { chromium } from 'playwright';

const PORT = process.argv[2] || '4244';
const WORLD = process.argv[3] || 'maple';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const p = await b.newPage();
p.on('console', (m) => { if (m.type() === 'error' && !/403|404/.test(m.text())) console.error('  page:', m.text().slice(0, 200)); });
await p.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 300000 });

const out = await p.evaluate(async ({ WORLD }) => {
  const isl = await import('/src/proto3d/island.ts');
  const mod = await import('/src/proto3d/audio3d.ts');
  const SR = 48000;
  const dB = (v) => 20 * Math.log10(v || 1e-12);
  const hp = (d) => { const rc = 1 / (2 * Math.PI * 450), dt = 1 / SR, al = rc / (rc + dt);
    const o = new Float32Array(d.length); let y = 0, xp = 0;
    for (let i = 0; i < d.length; i++) { y = al * (y + d[i] - xp); xp = d[i]; o[i] = y; } return o; };
  const rms = (d, a, n) => { let s = 0; for (let i = a; i < a + n && i < d.length; i++) s += d[i] * d[i]; return Math.sqrt(s / n); };
  const loudest = (d, win) => { let m = 0; const N = Math.floor(SR * win);
    for (let i = 0; i + N < d.length; i += Math.floor(N / 4)) { const v = rms(d, i, N); if (v > m) m = v; } return m; };
  const peak = (d) => { let m = 0; for (let i = 0; i < d.length; i++) if (Math.abs(d[i]) > m) m = Math.abs(d[i]); return m; };

  const EDGES = [63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
  const N = 8192;
  const win = new Float64Array(N); for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
  const rev = new Uint32Array(N);
  for (let i = 1, j = 0; i < N; i++) { let bit = N >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; rev[i] = j; }
  function fftBands(d, off) {
    const re = new Float64Array(N), im = new Float64Array(N);
    for (let i = 0; i < N; i++) { re[i] = (d[off + i] || 0) * win[i]; im[i] = 0; }
    for (let i = 0; i < N; i++) if (i < rev[i]) { let t = re[i]; re[i] = re[rev[i]]; re[rev[i]] = t; t = im[i]; im[i] = im[rev[i]]; im[rev[i]] = t; }
    for (let len = 2; len <= N; len <<= 1) {
      const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
      for (let i = 0; i < N; i += len) { let cr = 1, ci = 0;
        for (let k = 0; k < len / 2; k++) {
          const ur = re[i + k], ui = im[i + k];
          const vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
          const vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
          re[i + k] = ur + vr; im[i + k] = ui + vi;
          re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
          const n2 = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = n2;
        } }
    }
    const acc = new Float64Array(EDGES.length - 1);
    for (let k = 1; k < N / 2; k++) { const f = k * SR / N;
      for (let e = 0; e < EDGES.length - 1; e++) if (f >= EDGES[e] && f < EDGES[e + 1]) { acc[e] += (re[k] * re[k] + im[k] * im[k]) * 2 / (N * N); break; } }
    return Array.from(acc).map((v) => 10 * Math.log10(v || 1e-14));
  }

  async function render(dur, fn, stage = 3, withBed = false) {
    isl.setWorld(WORLD);
    const ctx = new OfflineAudioContext(1, Math.round(SR * dur), SR);
    let fake = 0;
    Object.defineProperty(ctx, 'currentTime', { get: () => fake, configurable: true });
    Object.defineProperty(ctx, 'state', { get: () => 'running', configurable: true });
    const pumps = [];
    const RAC = window.AudioContext, RSI = window.setInterval, RCI = window.clearInterval;
    window.AudioContext = function () { return ctx; };
    window.setInterval = (f) => { pumps.push(f); return pumps.length; };
    window.clearInterval = () => {};
    let a;
    try {
      a = mod.createAudio(); a.setMuted(false); a.setMusicStage(stage);
      if (withBed) { a.startMusic(); for (let i = 0; i < 40 && !pumps.length; i++) await new Promise((r) => setTimeout(r, 25)); }
      const STEP = 0.25;
      let fired = false;
      for (fake = 0; fake < dur - 0.3; fake += STEP) {
        if (!fired && fake >= (withBed ? 4 : 0.05)) { if (fn) fn(a); fired = true; }
        for (const f of pumps) f();
      }
    } finally { window.AudioContext = RAC; window.setInterval = RSI; window.clearInterval = RCI; }
    const buf = await ctx.startRendering();
    return buf.getChannelData(0);
  }

  const SHOTS = [
    ['pop small', 1.2, (a) => a.pop(0, 0.35, 1.0)],
    ['pop big', 1.2, (a) => a.pop(4, 6.5, 11.0)],
    ['bigEat', 2.0, (a) => a.bigEat()],
    ['gulp', 2.0, (a) => a.gulp()],
    ['collapse', 2.5, (a) => a.collapse()],
    ['rocket', 1.5, (a) => a.rocket()],
    ['ready (news chime)', 2.0, (a) => a.ready()],
    ['alert', 2.5, (a) => a.alert()],
    ['evolve', 3.5, (a) => a.evolve()],
    ['win', 4.0, (a) => a.win()],
    ['hit', 1.5, (a) => a.hit()],
    ['voice happy', 1.5, (a) => a.voice('happy')],
    ['voice scared', 1.5, (a) => a.voice('scared')],
    ['matchBeat', 3.0, (a) => a.matchBeat('ICE CREAM HOUR')],
  ];
  const res = [];
  for (const [name, dur, fn] of SHOTS) {
    const d = await render(dur, fn, 3, false);
    const h = hp(d);
    // band spectrum at the loudest 8192-sample window
    let bo = 0, bv = 0;
    for (let i = 0; i + N < d.length; i += 1024) { const v = rms(d, i, N); if (v > bv) { bv = v; bo = i; } }
    res.push({ name, peak: dB(peak(d)), hp200: dB(loudest(h, 0.2)), rms200: dB(loudest(d, 0.2)), bands: fftBands(d, bo) });
  }
  // the bed it plays over, stage 3, same band analysis on its loudest window
  const bed = await render(14, null, 3, true);
  let bo = 0, bv = 0;
  for (let i = 0; i + N < bed.length; i += 1024) { const v = rms(bed, i, N); if (v > bv) { bv = v; bo = i; } }
  const bedRow = { name: 'BED stage3 (loudest window)', peak: dB(peak(bed)), hp200: dB(loudest(hp(bed), 0.2)), rms200: dB(loudest(bed, 0.2)), bands: fftBands(bed, bo) };
  return { res, bedRow, world: WORLD };
}, { WORLD });

const F = (v) => v.toFixed(1).padStart(7);
console.log(`\n══ ${out.world.toUpperCase()} — one-shots vs the stage-3 bed ══`);
console.log('shot                     peak   loud200ms  >450Hz200ms |  63  125  250  500   1k   2k   4k   8k');
const row = (r) => `${r.name.padEnd(22)}${F(r.peak)}  ${F(r.rms200)}   ${F(r.hp200)}     |${r.bands.map((v) => v.toFixed(0).padStart(4)).join(' ')}`;
console.log(row(out.bedRow));
console.log('-'.repeat(100));
for (const r of out.res) console.log(row(r));
console.log('\ncut-through above 450 Hz (shot loudest-200ms minus bed loudest-200ms, both high-passed):');
for (const r of out.res) {
  const d = r.hp200 - out.bedRow.hp200;
  console.log(`  ${r.name.padEnd(22)} ${(d >= 0 ? '+' : '') + d.toFixed(1)} dB`);
}
await b.close();

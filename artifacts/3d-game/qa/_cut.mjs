// DOES A STING CUT THROUGH THE THING IT HAS TO CUT THROUGH?
//   node qa/_cut.mjs <devPort> <world>
// Not "sting vs bed" — a child at 150 s is hearing bed PLUS a continuous eat
// stream. This renders the climax mix with and without each sting and reports
// the level change in a 400 ms window around it, full band and >450 Hz.
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4244';
const WORLD = process.argv[3] || 'maple';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 300000 });
const out = await p.evaluate(async ({ WORLD }) => {
  const isl = await import('/src/proto3d/island.ts');
  const mod = await import('/src/proto3d/audio3d.ts');
  const SR = 48000, DUR = 10, STING_AT = 6.0;
  const dB = (v) => 20 * Math.log10(v || 1e-12);
  const hp = (d) => { const rc = 1 / (2 * Math.PI * 450), dt = 1 / SR, al = rc / (rc + dt);
    const o = new Float32Array(d.length); let y = 0, xp = 0;
    for (let i = 0; i < d.length; i++) { y = al * (y + d[i] - xp); xp = d[i]; o[i] = y; } return o; };
  const rmsAll = (d) => { let s = 0; for (let i = 0; i < d.length; i++) s += d[i] * d[i]; return Math.sqrt(s / d.length); };

  async function render(fn) {
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
      const a = mod.createAudio(); a.setMuted(false); a.setMusicStage(3); a.startMusic();
      for (let i = 0; i < 200 && !pumps.length; i++) await new Promise((r) => setTimeout(r, 25));
      const MEALS = [0.9, 1.2, 0.9, 2.6, 1.0, 0.9, 1.4, 4.4, 0.9, 1.1];
      let mi = 0, nextPop = 2.0, fired = false;
      for (fake = 0; fake < DUR - 0.3; fake += 1 / 48) {
        if (fake >= nextPop && fake >= 2.0) { a.pop(6, MEALS[mi++ % MEALS.length], 9.0); nextPop = fake + 0.0755; }
        if (fn && !fired && fake >= STING_AT) { fn(a); fired = true; }
        for (const f of pumps) f();
      }
    } finally { window.AudioContext = RAC; window.setInterval = RSI; window.clearInterval = RCI; }
    const d = (await ctx.startRendering()).getChannelData(0);
    return d.subarray(Math.round(SR * STING_AT), Math.round(SR * (STING_AT + 0.4)));
  }
  const base = await render(null);
  const res = [{ name: 'mix, no sting', rms: dB(rmsAll(base)), hpv: dB(rmsAll(hp(base))) }];
  for (const [name, fn] of [['ready (newsroom)', (a) => a.ready()], ['alert', (a) => a.alert()],
    ['hit', (a) => a.hit()], ['voice scared', (a) => a.voice('scared')],
    ['evolve', (a) => a.evolve()], ['matchBeat', (a) => a.matchBeat('ICE CREAM HOUR')]]) {
    const d = await render(fn);
    res.push({ name, rms: dB(rmsAll(d)), hpv: dB(rmsAll(hp(d))) });
  }
  return res;
}, { WORLD });
console.log(`\n${WORLD.toUpperCase()} — 400 ms window at the climax (stage-3 bed + eats at the 13.3/s limiter ceiling)`);
console.log('                     RMS dBFS   >450Hz    lift vs no sting (>450Hz)');
const b0 = out[0];
for (const r of out) console.log(`  ${r.name.padEnd(18)} ${r.rms.toFixed(1).padStart(7)}  ${r.hpv.toFixed(1).padStart(7)}   ${r === b0 ? '—' : ((r.hpv - b0.hpv >= 0 ? '+' : '') + (r.hpv - b0.hpv).toFixed(1) + ' dB')}`);
await b.close();

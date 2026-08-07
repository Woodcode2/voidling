// ARRANGEMENT DENSITY PER STAGE — how many voices the band actually adds.
//   node qa/_notedens.mjs <devPort>
// RMS alone understates escalation (a new layer can add texture without level),
// so this counts oscillators + buffer sources constructed per rendered second
// of bed at each stage, in the same hand-driven OfflineAudioContext harness.
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4244';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 300000 });
const out = await p.evaluate(async () => {
  const isl = await import('/src/proto3d/island.ts');
  const mod = await import('/src/proto3d/audio3d.ts');
  const SR = 48000, DUR = 24;
  const rows = [];
  for (const w of ['maple', 'pirate', 'gameday', 'lantern']) {
    for (const st of [0, 1, 2, 3, 4]) {
      isl.setWorld(w);
      const ctx = new OfflineAudioContext(1, SR * DUR, SR);
      let fake = 0, n = 0;
      Object.defineProperty(ctx, 'currentTime', { get: () => fake, configurable: true });
      Object.defineProperty(ctx, 'state', { get: () => 'running', configurable: true });
      const pumps = [];
      const RAC = window.AudioContext, RSI = window.setInterval, RCI = window.clearInterval;
      const P = Object.getPrototypeOf(OfflineAudioContext.prototype);
      const o0 = P.createOscillator, b0 = P.createBufferSource;
      window.AudioContext = function () { return ctx; };
      window.setInterval = (f) => { pumps.push(f); return pumps.length; };
      window.clearInterval = () => {};
      try {
        const a = mod.createAudio(); a.setMuted(false); a.setMusicStage(st); a.startMusic();
        for (let i = 0; i < 200 && !pumps.length; i++) await new Promise((r) => setTimeout(r, 25));
        P.createOscillator = function () { if (fake >= 2) n++; return o0.call(this); };
        P.createBufferSource = function () { if (fake >= 2) n++; return b0.call(this); };
        for (fake = 0; fake < DUR - 0.4; fake += 0.25) for (const f of pumps) f();
      } finally {
        window.AudioContext = RAC; window.setInterval = RSI; window.clearInterval = RCI;
        P.createOscillator = o0; P.createBufferSource = b0;
      }
      rows.push({ w, st, per: +(n / (DUR - 2.4)).toFixed(1), pumps: pumps.length });
    }
  }
  return rows;
});
console.log('world     st  voices/sec');
let prev = {};
for (const r of out) {
  const d = prev[r.w] === undefined ? '' : `   ${((r.per / prev[r.w] - 1) * 100).toFixed(0)}% vs st${r.st - 1}`;
  prev[r.w] = r.per;
  console.log(`${r.w.padEnd(9)} ${r.st}  ${String(r.per).padStart(6)}${d}`);
}
await b.close();

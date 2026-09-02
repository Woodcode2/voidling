// THE THREE RECORDED ONE-SHOTS THAT ACTUALLY SHIP.
//
//   node qa/_wav.mjs <port>
//
// win() and MAPLE's evolve() try sample() FIRST and return if the buffer is
// resident; bigEat() no longer does (702a3e4 — eaten_deep.wav is a kick drum
// and is unwired; refute-drum measured it at +14 dB over the recording) — so the synth versions
// qa/_oneshot.mjs renders are the FALLBACK, not the shipping sound. This
// decodes the real files, applies the same gain the caller passes and the same
// MASTER_VOL 0.62, and measures them on the phone-speaker basis.
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4243';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 300000 });
const rows = await p.evaluate(async () => {
  const SR = 48000;
  const dB = (v) => 20 * Math.log10(v || 1e-12);
  const out = [];
  for (const [name, vol] of [['eaten_deep.wav', 0.55], ['win_warm.wav', 0.55], ['evolve_epic.wav', 0.5],
    ['gulp_1.wav', 0.5], ['threat_sting.wav', 0.5]]) {
    const ctx = new OfflineAudioContext(1, SR * 6, SR);
    let dur = 0, ok = true;
    try {
      const r = await fetch('/assets/audio/' + name);
      const buf = await ctx.decodeAudioData(await r.arrayBuffer());
      dur = buf.duration;
      const src = ctx.createBufferSource(); src.buffer = buf;
      const g = ctx.createGain(); g.gain.value = vol;
      const m = ctx.createGain(); m.gain.value = 0.62;   // MASTER_VOL
      const lim = ctx.createDynamicsCompressor();
      lim.threshold.value = -6; lim.knee.value = 6; lim.ratio.value = 12;
      lim.attack.value = 0.003; lim.release.value = 0.14;
      src.connect(g); g.connect(m); m.connect(lim); lim.connect(ctx.destination);
      src.start(0);
    } catch (e) { ok = false; }
    if (!ok) { out.push({ name, err: 'no decode' }); continue; }
    const d = (await ctx.startRendering()).getChannelData(0);
    const rc = 1 / (2 * Math.PI * 450), dt = 1 / SR, al = rc / (rc + dt);
    const h = new Float32Array(d.length); let y = 0, xp = 0;
    for (let i = 0; i < d.length; i++) { y = al * (y + d[i] - xp); xp = d[i]; h[i] = y; }
    const loud = (a) => { const N = Math.floor(SR * 0.2); let m = 0;
      for (let i = 0; i + N < a.length; i += N >> 2) { let s = 0; for (let j = i; j < i + N; j++) s += a[j] * a[j]; const v = Math.sqrt(s / N); if (v > m) m = v; } return m; };
    let pk = 0; for (let i = 0; i < d.length; i++) if (Math.abs(d[i]) > pk) pk = Math.abs(d[i]);
    out.push({ name, dur: +dur.toFixed(2), peak: dB(pk), rms200: dB(loud(d)), hp200: dB(loud(h)) });
  }
  return out;
});
console.log('file                  dur    peak   loud200ms   >450Hz200ms');
for (const r of rows) console.log(r.err ? `${r.name.padEnd(20)} ${r.err}`
  : `${r.name.padEnd(20)} ${String(r.dur).padStart(5)} ${r.peak.toFixed(1).padStart(7)} ${r.rms200.toFixed(1).padStart(9)} ${r.hp200.toFixed(1).padStart(12)}`);
await b.close();

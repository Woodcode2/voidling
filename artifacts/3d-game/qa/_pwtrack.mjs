// powder.mp3 vs the mastered five — browser decode, same ruler for all six.
// No ffmpeg in this sandbox, so no true LUFS: RMS dBFS measured identically
// across tracks gives the LEVEL PARITY the phone speaker actually needs, and
// head/tail silence + the opening ramp are exact.
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage();
await p.goto('http://127.0.0.1:4177/', { waitUntil: 'domcontentloaded', timeout: 300000 });
for (const t of ['menu', 'maple', 'pirate', 'gameday', 'lantern', 'powder']) {
  const r = await p.evaluate(async (name) => {
    const buf = await (await fetch(`/assets/music/${name}.mp3`)).arrayBuffer();
    const bytes = buf.byteLength;
    const ctx = new OfflineAudioContext(1, 44100, 44100);
    const ab = await ctx.decodeAudioData(buf.slice(0));
    const ch = ab.getChannelData(0), sr = ab.sampleRate, n = ch.length;
    const db = (x) => x > 0 ? (20 * Math.log10(x)).toFixed(1) : '-inf';
    // head/tail: first/last 20ms window whose RMS crosses -40 dBFS
    const win = Math.floor(sr * 0.02);
    const rmsAt = (i) => { let s = 0; for (let j = i; j < i + win && j < n; j++) s += ch[j] * ch[j]; return Math.sqrt(s / win); };
    let head = -1, tail = -1;
    for (let i = 0; i < n - win; i += win) if (rmsAt(i) > 0.01) { head = i / sr; break; }
    for (let i = n - win; i >= 0; i -= win) if (rmsAt(i) > 0.01) { tail = (n - i) / sr; break; }
    // whole-track RMS + peak, and the 0.5s opening ramp
    let s = 0, pk = 0;
    for (let i = 0; i < n; i++) { s += ch[i] * ch[i]; const a = Math.abs(ch[i]); if (a > pk) pk = a; }
    const ramp = [];
    for (let w = 0; w < 8; w++) {
      let s2 = 0; const a0 = Math.floor(w * 0.5 * sr), a1 = Math.min(n, a0 + Math.floor(0.5 * sr));
      for (let i = a0; i < a1; i++) s2 += ch[i] * ch[i];
      ramp.push(db(Math.sqrt(s2 / Math.max(1, a1 - a0))));
    }
    return { bytes, dur: (n / sr).toFixed(1), chs: ab.numberOfChannels, sr,
      rms: db(Math.sqrt(s / n)), peak: db(pk), head: head.toFixed(3), tailSil: tail.toFixed(2), ramp };
  }, t);
  console.log(`${t.padEnd(8)} ${(r.bytes / 1e6).toFixed(2)}MB ${String(r.dur).padStart(6)}s ${r.chs}ch  RMS ${r.rms}dB  peak ${r.peak}dB  head ${r.head}s  ramp[${r.ramp.join(',')}]`);
}
await b.close();

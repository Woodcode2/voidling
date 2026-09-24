// HOW FAR DOES EACH EAT VOICE'S LEVEL MOVE WITH ITS OWN DICE?
//
//   node qa/_eatspread.mjs [port] [renders]          (default 4177, 30)
//
// The calibration record behind audio3d.ts's EAT_LEVEL table (research
// governor G5). qa/eatvoice.mjs (c) grades each voice on the loudest of five
// renders; this reads thirty, so the table can be set on a voice's LOUDEST take
// and the spec's "6 dB under the pop" holds on every bite rather than on the
// average one. Same measure as (c) and qa/chomp.mjs part 1: energy above
// 450 Hz (one pole) over one second, at a car's meal (mealR 1.3, voidR 2.5),
// Math.random seeded per render. A table, not a verdict — the bar is (c)'s.
import { chromium } from 'playwright';
import { createRequire } from 'node:module';

const die = (m) => { console.log(`FAIL — ${m}`); process.exit(1); };
process.on('uncaughtException', (e) => die(`threw: ${String((e && e.message) || e).split('\n')[0]}`));
process.on('unhandledRejection', (e) => die(`rejected: ${String((e && e.message) || e).split('\n')[0]}`));
const PORT = process.argv[2] || '4177';
const N = +(process.argv[3] || 30);
const req = createRequire(`${process.cwd()}/package.json`);
const esbuild = createRequire(req.resolve('vite'))('esbuild');
const code = (await esbuild.build({
  stdin: { contents: "export { createAudio } from './src/proto3d/audio3d'; export { EAT_VOICES } from './src/proto3d/eatvoice';", resolveDir: process.cwd(), loader: 'ts' },
  bundle: true, format: 'esm', platform: 'browser', write: false, logLevel: 'silent',
})).outputFiles[0].text;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.goto(`http://127.0.0.1:${PORT}/privacy.html`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.evaluate(async (src) => { window.__EV = await import(URL.createObjectURL(new Blob([src], { type: 'text/javascript' }))); }, code);
const r = await p.evaluate(async (n) => {
  const EV = window.__EV, SR = 44100;
  if (typeof EV.createAudio().eatVoice !== 'function') return null;
  const hp = (d) => { const rc = 1 / (2 * Math.PI * 450), dt = 1 / SR, al = rc / (rc + dt); let y = 0, xp = 0, s = 0;
    for (let i = 0; i < d.length; i++) { y = al * (y + d[i] - xp); xp = d[i]; s += y * y; } return 20 * Math.log10(Math.sqrt(s / d.length)); };
  const render = async (fn, seed) => {
    let x = seed; const rr = Math.random; Math.random = () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648);
    const ctx = new OfflineAudioContext(1, SR, SR); const R = window.AudioContext; window.AudioContext = function () { return ctx; };
    try { const a = EV.createAudio(); a.setMuted(false); fn(a); } finally { window.AudioContext = R; }
    const d = (await ctx.startRendering()).getChannelData(0); Math.random = rr; return hp(d);
  };
  const pop = await render((a) => a.pop(0, 1.3, 2.5), 1);
  const out = {};
  for (const v of EV.EAT_VOICES) {
    const xs = []; for (let k = 0; k < n; k++) xs.push(pop - await render((a) => a.eatVoice(v, 1.3, 2.5, 0), 100 + k));
    xs.sort((a, b2) => a - b2);
    out[v] = { min: xs[0], med: xs[Math.floor(n / 2)], max: xs[n - 1] };
  }
  return out;
}, N);
await b.close();
if (!r) die('this build has no eatVoice()');
console.log(`\n  pop minus voice, above 450 Hz, ${N} renders each (a car's meal)\n`);
for (const [v, x] of Object.entries(r)) console.log(`    ${v.padEnd(8)} closest ${x.min.toFixed(2)}  median ${x.med.toFixed(2)}  farthest ${x.max.toFixed(2)} dB`);

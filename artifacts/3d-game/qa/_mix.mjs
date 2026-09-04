// THE WHOLE MIX, IN dBFS.
//
//   node qa/_mix.mjs [maple pirate gameday lantern]
//
// A tap gain is spliced in front of ctx.destination and a ScriptProcessor
// measures TRUE peak and RMS on every sample that reaches the speaker. The
// DynamicsCompressor the master runs through is captured too, so its .reduction
// says how hard the limiter is actually working — that is the clipping answer,
// not a guess.
//
// Measured per world: the bed alone at each stage (nobody eating), then each
// one-shot fired in isolation via window.__audio. Everything post-limiter, i.e.
// what a child's phone speaker gets.
import { chromium } from 'playwright';
import { ALL_WORLDS } from './worlds.mjs';

const ALL = ALL_WORLDS;
const worlds = process.argv.slice(2).filter((w) => ALL.includes(w));
const list = worlds.length ? worlds : ALL;
const dB = (x) => (x <= 0 ? -Infinity : 20 * Math.log10(x));
const f = (x) => (x === -Infinity ? ' -inf' : x.toFixed(1).padStart(6));

const TAP = () => {
  const RealAC = window.AudioContext;
  window.__mix = { peak: 0, sum: 0, n: 0, red: 0, comp: null };
  const C0 = RealAC.prototype.createDynamicsCompressor;
  RealAC.prototype.createDynamicsCompressor = function () {
    const c = C0.call(this); if (!window.__mix.comp) window.__mix.comp = c; return c;
  };
  window.AudioContext = class extends RealAC {
    constructor(...a) {
      super(...a);
      const real = super.destination;
      const tap = this.createGain();
      const sp = this.createScriptProcessor(2048, 1, 1);
      sp.onaudioprocess = (e) => {
        const d = e.inputBuffer.getChannelData(0);
        const m = window.__mix;
        for (let i = 0; i < d.length; i++) {
          const v = Math.abs(d[i]); if (v > m.peak) m.peak = v;
          m.sum += d[i] * d[i]; m.n++;
        }
        if (m.comp) { const r = -m.comp.reduction; if (r > m.red) m.red = r; }
        e.outputBuffer.getChannelData(0).fill(0);
      };
      tap.connect(real);
      tap.connect(sp);
      const mute = this.createGain(); mute.gain.value = 0;
      sp.connect(mute); mute.connect(real);
      Object.defineProperty(this, 'destination', { get: () => tap, configurable: true });
      window.__ac = this;
    }
  };
  window.__mixReset = () => { const m = window.__mix; m.peak = 0; m.sum = 0; m.n = 0; m.red = 0; };
  window.__mixRead = () => {
    const m = window.__mix;
    return { peak: m.peak, rms: m.n ? Math.sqrt(m.sum / m.n) : 0, n: m.n, red: m.red };
  };
};

const b = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox',
    '--autoplay-policy=no-user-gesture-required'],
});

const rows = [];
for (const w of list) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 } });
  await p.addInitScript(TAP);
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => {
    try {
      localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
      localStorage.setItem('voidMute', '0');
      localStorage.setItem('voidDailyLast', new Date().toDateString());
    } catch { /* private */ }
  });
  await p.goto(`http://127.0.0.1:4177/?w=${w}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show')
    .forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1200);
  await p.click(`#worldRow .wCard[data-world="${w}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 6, null, { timeout: 600000 });

  console.log(`\n${w.toUpperCase()}`);
  console.log('  BED ALONE (no eating)          peak dBFS   rms dBFS   limiter GR');
  const bedRms = [];
  for (const [label, r] of [['spawn r=1.2', 1.2], ['mid   r=4', 4], ['full  r=11', 11]]) {
    await p.evaluate((rr) => window.__setVoidR(rr), r);
    await p.waitForTimeout(1500);
    await p.evaluate(() => window.__mixReset());
    await p.waitForTimeout(6000);
    const m = await p.evaluate(() => window.__mixRead());
    bedRms.push(dB(m.rms));
    console.log(`    ${label.padEnd(28)} ${f(dB(m.peak))}     ${f(dB(m.rms))}     ${m.red.toFixed(1)} dB`);
  }

  // one-shots, in isolation, over the bed. Each gets its own window; the bed's
  // contribution is the number just above, so anything much louder is the
  // one-shot and only the one-shot.
  const SHOTS = [
    ['pop small  (r 0.5)', 'a.pop(0, 0.5, 3)'],
    ['pop big    (r 6)', 'a.pop(0, 6, 9)'],
    ['pop combo 12', 'a.pop(12, 2, 6)'],
    ['bigEat', 'a.bigEat()'],
    ['gulp', 'a.gulp()'],
    ['rocket', 'a.rocket()'],
    ['collapse', 'a.collapse()'],
    ['evolve', 'a.evolve()'],
    ['win', 'a.win()'],
    ['hit', 'a.hit()'],
    ['alert', 'a.alert()'],
    ['ready', 'a.ready()'],
    ["voice 'happy'", "a.voice('happy')"],
    ["voice 'scared'", "a.voice('scared')"],
    ["voice 'hurt'", "a.voice('hurt')"],
    ['4 pops in a row', 'for(let i=0;i<4;i++)setTimeout(()=>a.pop(i,1.5,5),i*90)'],
    ['pop+bigEat+voice together', "a.pop(3,4,7);a.bigEat();a.voice('yum')"],
  ];
  console.log('  ONE-SHOT (over the full-size bed, which reads ' + f(bedRms[2]) + ' rms)');
  for (const [name, code] of SHOTS) {
    await p.evaluate(() => window.__mixReset());
    await p.evaluate((c) => { const a = window.__audio; eval(c); }, code);
    await p.waitForTimeout(1600);
    const m = await p.evaluate(() => window.__mixRead());
    console.log(`    ${name.padEnd(28)} ${f(dB(m.peak))}     ${f(dB(m.rms))}     ${m.red.toFixed(1)} dB`);
    rows.push({ w, name, peak: dB(m.peak), red: m.red });
    await p.waitForTimeout(400);
  }
  await p.close();
}
await b.close();

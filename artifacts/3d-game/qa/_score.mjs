// THE SCORES, RENDERED AND MEASURED — without booting the game.
//
//   node qa/_score.mjs            # all four worlds, four stages each
//
// audio3d.ts needs nothing from the 3D world except worldId(), so this loads
// ONLY those two modules into a page. Build the harness first — it is two
// lines and lives outside src/ so nothing ships it:
//
//   cat > /tmp/lab.ts <<'EOF'
//   import { setWorld } from '<repo>/src/proto3d/island';
//   import { createAudio } from '<repo>/src/proto3d/audio3d';
//   (window as any).__lab = { setWorld, createAudio };
//   EOF
//   node_modules/.pnpm/esbuild@*/node_modules/esbuild/bin/esbuild /tmp/lab.ts \
//     --bundle --format=esm --outfile=dist/_lab.js
//   printf '<!doctype html><script type=module src=/_lab.js></script>' > dist/_lab.html
//
// with no WebGL, splices a recorder in front of ctx.destination, and captures
// with no WebGL, splices a recorder in front of ctx.destination, and captures
// the real output of every score at every stage. Cheap enough to run under
// load, and unlike a game probe it measures the AUDIO and nothing else.
//
// Writes raw PCM to the scratchpad for qa/_scoreanalyse.mjs.
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT = process.env.SCRATCH || '/tmp/score';
mkdirSync(OUT, { recursive: true });
const WORLDS = process.argv.slice(2).length ? process.argv.slice(2)
  : ['maple', 'pirate', 'gameday', 'lantern'];
const SECS = 24;

const b = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
});
const p = await b.newPage();
p.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
await p.goto('http://127.0.0.1:4177/_lab.html', { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => !!window.__lab, null, { timeout: 60000 });

await p.evaluate(() => {
  const RealAC = window.AudioContext;
  window.__rec = { on: false, chunks: [], peak: 0, red: 0, comp: null };
  const C0 = RealAC.prototype.createDynamicsCompressor;
  RealAC.prototype.createDynamicsCompressor = function () {
    const c = C0.call(this); window.__rec.comp = c; return c;
  };
  window.AudioContext = class extends RealAC {
    constructor(...a) {
      super(...a);
      const real = super.destination;
      const tap = this.createGain();
      const sp = this.createScriptProcessor(4096, 1, 1);
      sp.onaudioprocess = (e) => {
        const r = window.__rec;
        const d = e.inputBuffer.getChannelData(0);
        for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (v > r.peak) r.peak = v; }
        if (r.comp) { const g = -r.comp.reduction; if (g > r.red) r.red = g; }
        if (r.on) r.chunks.push(new Float32Array(d));
        e.outputBuffer.getChannelData(0).fill(0);
      };
      tap.connect(real); tap.connect(sp);
      const mute = this.createGain(); mute.gain.value = 0;
      sp.connect(mute); mute.connect(real);
      Object.defineProperty(this, 'destination', { get: () => tap, configurable: true });
      window.__ac = this;
    }
  };
  window.__A = window.__lab.createAudio();
  window.__A.setMuted(false);
  window.__recStart = () => { const r = window.__rec; r.on = true; r.chunks = []; r.peak = 0; r.red = 0; };
  window.__recStop = () => {
    const r = window.__rec; r.on = false;
    let n = 0; for (const c of r.chunks) n += c.length;
    const all = new Float32Array(n); let o = 0;
    for (const c of r.chunks) { all.set(c, o); o += c.length; }
    r.chunks = [];
    // int16, clamped — true peak is reported separately so clipping is visible
    const i16 = new Int16Array(n);
    for (let i = 0; i < n; i++) i16[i] = Math.max(-32768, Math.min(32767, Math.round(all[i] * 32767)));
    let s = ''; const u8 = new Uint8Array(i16.buffer);
    const CH = 0x8000;
    for (let i = 0; i < u8.length; i += CH) s += String.fromCharCode.apply(null, u8.subarray(i, i + CH));
    return { b64: btoa(s), rate: window.__ac.sampleRate, peak: r.peak, red: r.red, n };
  };
});
const rate = await p.evaluate(() => window.__ac ? window.__ac.sampleRate : 0);

const grab = async (name) => {
  const r = await p.evaluate(() => window.__recStop());
  writeFileSync(`${OUT}/${name}.pcm`, Buffer.from(r.b64, 'base64'));
  console.log(`  ${name.padEnd(22)} ${(r.n / r.rate).toFixed(1)}s  truepeak ${(20 * Math.log10(r.peak || 1e-9)).toFixed(1)} dBFS  limiterGR ${r.red.toFixed(1)} dB`);
  return r;
};

for (const w of WORLDS) {
  console.log(`\n══ ${w.toUpperCase()} ══`);
  await p.evaluate((ww) => {
    window.__lab.setWorld(ww);
    window.__A.stopMusic();
  }, w);
  await p.waitForTimeout(1500);
  await p.evaluate(() => { window.__A.setMusicStage(0); window.__A.startMusic(); });
  for (const st of [0, 1, 2, 3]) {
    await p.evaluate((s) => window.__A.setMusicStage(s), st);
    await p.waitForTimeout(3000);
    await p.evaluate(() => window.__recStart());
    await p.waitForTimeout(SECS * 1000);
    await grab(`${w}-bed${st}`);
  }
  // and the bed at stage 3 with the district layer the player spawns in
  await p.evaluate(() => window.__A.stopMusic());
  await p.waitForTimeout(1600);
}

// ── one-shots, dry (no bed) ─────────────────────────────────────────────────
const SHOTS = {
  'pop-small': 'a.pop(0,0.5,3)',
  'pop-big': 'a.pop(0,6,9)',
  'pop-combo': 'a.pop(12,2,6)',
  bigEat: 'a.bigEat()',
  gulp: 'a.gulp()',
  rocket: 'a.rocket()',
  collapse: 'a.collapse()',
  evolve: 'a.evolve()',
  win: 'a.win()',
  hit: 'a.hit()',
  alert: 'a.alert()',
  ready: 'a.ready()',
  'voice-happy': "a.voice('happy')",
  'voice-scared': "a.voice('scared')",
  'pop-x4': 'for(let i=0;i<4;i++)setTimeout(()=>a.pop(i,1.5,5),i*90)',
};
for (const w of WORLDS) {
  console.log(`\n══ ${w.toUpperCase()} one-shots (dry) ══`);
  await p.evaluate((ww) => window.__lab.setWorld(ww), w);
  for (const [name, code] of Object.entries(SHOTS)) {
    await p.evaluate(() => window.__recStart());
    await p.evaluate((c) => { new Function('a', c)(window.__A); }, code);
    await p.waitForTimeout(2200);
    await grab(`${w}-shot-${name}`);
    await p.waitForTimeout(300);
  }
}
console.log(`\nrate ${rate} Hz -> ${OUT}`);
await b.close();

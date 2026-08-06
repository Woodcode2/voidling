// What the captures from qa/_score.mjs actually contain.
//
//   node qa/_scoreanalyse.mjs
//
// Per file: level (peak / RMS / crest), spectral balance in six bands, the
// share of energy a PHONE SPEAKER can reproduce (everything under ~400 Hz is
// gone on an iPhone 15 speaker, so a score that lives there is a score nobody
// hears), and the loop period found by autocorrelating the amplitude envelope.
import { readFileSync, readdirSync } from 'node:fs';

const DIR = process.env.SCRATCH || '/tmp/score';
const RATE = 48000;
const dB = (x) => (x <= 0 ? -Infinity : 20 * Math.log10(x));
const f1 = (x) => (x === -Infinity ? '  -inf' : x.toFixed(1).padStart(6));

function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ur = re[i + k], ui = im[i + k];
        const vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
        const vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ur + vr; im[i + k] = ui + vi;
        re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
}

const BANDS = [[20, 120], [120, 400], [400, 1000], [1000, 3000], [3000, 8000], [8000, 20000]];
const LBL = ['sub', 'low', 'lomid', 'pres', 'top', 'air'];

function analyse(x) {
  const n = x.length;
  let peak = 0, sum = 0;
  for (let i = 0; i < n; i++) { const a = Math.abs(x[i]); if (a > peak) peak = a; sum += x[i] * x[i]; }
  const rms = Math.sqrt(sum / n);

  // spectrum, averaged over hanning windows
  const N = 4096, hop = N;
  const mag = new Float64Array(N / 2);
  let frames = 0;
  const re = new Float64Array(N), im = new Float64Array(N);
  for (let o = 0; o + N <= n; o += hop) {
    for (let i = 0; i < N; i++) { re[i] = x[o + i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / N)); im[i] = 0; }
    fft(re, im);
    for (let k = 0; k < N / 2; k++) mag[k] += re[k] * re[k] + im[k] * im[k];
    frames++;
  }
  for (let k = 0; k < N / 2; k++) mag[k] /= Math.max(1, frames);
  const bandE = BANDS.map(([lo, hi]) => {
    let e = 0;
    for (let k = Math.round(lo * N / RATE); k < Math.round(hi * N / RATE) && k < N / 2; k++) e += mag[k];
    return e;
  });
  const tot = bandE.reduce((a, b) => a + b, 0) || 1e-30;
  // a phone speaker: nothing under 300 Hz, -6dB/oct 300..600, flat above
  let phone = 0;
  for (let k = 1; k < N / 2; k++) {
    const fq = k * RATE / N;
    const w = fq < 250 ? 0 : fq < 600 ? (fq - 250) / 350 : 1;
    phone += mag[k] * w * w;
  }

  // amplitude envelope at 100 Hz for loop hunting
  const H = Math.round(RATE / 100);
  const env = new Float64Array(Math.floor(n / H));
  for (let i = 0; i < env.length; i++) {
    let s = 0;
    for (let j = 0; j < H; j++) s += Math.abs(x[i * H + j]);
    env[i] = s / H;
  }
  const m = env.reduce((a, b) => a + b, 0) / env.length;
  for (let i = 0; i < env.length; i++) env[i] -= m;
  let e0 = 0; for (let i = 0; i < env.length; i++) e0 += env[i] * env[i];
  const ac = [];
  for (let lagS = 0.3; lagS <= 12; lagS += 0.01) {
    const lag = Math.round(lagS * 100);
    if (lag >= env.length - 200) break;
    let c = 0, a = 0, bb = 0;
    for (let i = 0; i + lag < env.length; i++) { c += env[i] * env[i + lag]; a += env[i] * env[i]; bb += env[i + lag] * env[i + lag]; }
    ac.push([lagS, c / Math.sqrt(a * bb || 1e-30)]);
  }
  // local maxima, strongest first
  const peaks = [];
  for (let i = 2; i < ac.length - 2; i++) {
    if (ac[i][1] > ac[i - 1][1] && ac[i][1] > ac[i + 1][1] && ac[i][1] > 0.12) peaks.push(ac[i]);
  }
  peaks.sort((a, b) => b[1] - a[1]);
  const seen = [];
  for (const pk of peaks) { if (!seen.some((s) => Math.abs(s[0] - pk[0]) < 0.25)) seen.push(pk); if (seen.length >= 3) break; }

  return { peak, rms, bandE: bandE.map((e) => e / tot), phone: Math.sqrt(phone / (N / 2)), loops: seen };
}

const files = readdirSync(DIR).filter((f) => f.endsWith('.pcm')).sort();
console.log('file                    peak    rms  crest | sub  low  lomid pres  top  air | phone-audible | loop (s, r)');
for (const f of files) {
  const buf = readFileSync(`${DIR}/${f}`);
  const i16 = new Int16Array(buf.buffer, buf.byteOffset, buf.length / 2);
  const x = new Float64Array(i16.length);
  for (let i = 0; i < i16.length; i++) x[i] = i16[i] / 32767;
  if (x.length < RATE * 0.5) { console.log(`${f}  (too short)`); continue; }
  const a = analyse(x);
  const bands = a.bandE.map((v) => (v * 100).toFixed(0).padStart(4)).join(' ');
  const lp = a.loops.map(([s, r]) => `${s.toFixed(2)}s ${r.toFixed(2)}`).join('  ');
  console.log(`${f.replace('.pcm', '').padEnd(22)} ${f1(dB(a.peak))} ${f1(dB(a.rms))} ${(dB(a.peak) - dB(a.rms)).toFixed(1).padStart(5)} |${bands} | ${f1(dB(a.phone))} dB | ${lp}`);
}
console.log('\nbands are % of total energy: ' + LBL.map((l, i) => `${l} ${BANDS[i][0]}-${BANDS[i][1]}Hz`).join(', '));

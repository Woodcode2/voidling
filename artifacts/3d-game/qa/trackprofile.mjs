// WHAT DOES THIS TRACK SOUND LIKE AT THE MOMENTS THAT DECIDE EVERYTHING?
//
//   FFMPEG_BIN=/path/to/ffmpeg node qa/trackprofile.mjs [file.mp3 ...]
//   node qa/trackprofile.mjs                # every track in public/assets/music
//   node qa/trackprofile.mjs --gate         # exit 1 unless every track passes spec
//
// The music got here through ears alone, and ears in a quiet room lie about a
// phone speaker in a kitchen. Measured, the shipped set had three defects
// nobody had heard: the menu theme opened with a full second of nothing, Game
// Day opened 20 dB above its own body, and the five tracks were spread across
// 7.4 LU — with the QUIETEST being the world every child plays first.
//
// This reports, for any audio file:
//   • head silence   — time to the first sustained crossing of -40 dBFS
//   • tail silence   — dead air at the end (a crossfade loop turns tail
//                      silence into a hole in the middle of the music)
//   • the ramp       — RMS in 0.5s windows over the first 6 seconds
//   • integrated LUFS and true peak (EBU R128, via ffmpeg ebur128/loudnorm)
//   • a proposed manifest row: trimStart / loopStart / loopEnd
//
// THE SPEC (docs/MUSIC-BRIEF.md, task 5): head silence < 60 ms, integrated
// loudness within ±1.0 LU of -16 LUFS, true peak ≤ -1.0 dBTP. --gate enforces
// it, so the next track the owner drops in gets judged by the same ruler.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

// ffmpeg is NOT a package dependency: this repo is on pnpm catalogs and npm
// cannot add to it, and an 80 MB binary is a poor tax on every install for a
// probe run occasionally. Resolve it from wherever it actually is.
function findFfmpeg() {
  if (process.env.FFMPEG_BIN && existsSync(process.env.FFMPEG_BIN)) return process.env.FFMPEG_BIN;
  for (const c of ['ffmpeg', '/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg']) {
    try { execFileSync(c, ['-version'], { stdio: 'ignore' }); return c; } catch { /* next */ }
  }
  try { return (await_import => await_import)(require('ffmpeg-static')); } catch { /* absent */ }
  console.error('no ffmpeg: set FFMPEG_BIN, or put ffmpeg on PATH');
  process.exit(2);
}
const FF = findFfmpeg();

const TARGET_LUFS = -16, TOL_LU = 1.0, MAX_TP = -1.0, MAX_HEAD_MS = 60;

function run(args) {
  return execFileSync(FF, ['-hide_banner', '-nostats', ...args], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 28,
  });
}
function runErr(args) {
  try { execFileSync(FF, ['-hide_banner', '-nostats', ...args], { stdio: ['ignore', 'ignore', 'pipe'], maxBuffer: 1 << 28 }); return ''; }
  catch (e) { return e.stderr?.toString() ?? ''; }
  // ffmpeg prints filter reports on stderr and exits 0; -f null keeps it happy
}
function ffStderr(args) {
  const r = execFileSync(FF, ['-hide_banner', '-nostats', ...args, '-f', 'null', '-'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return r; // unused; real capture below
}

/** stderr of an ffmpeg analysis pass (filters log there) */
function analyse(file, af) {
  let out = '';
  try {
    execFileSync(FF, ['-hide_banner', '-nostats', '-i', file, '-af', af, '-f', 'null', '-'], {
      stdio: ['ignore', 'ignore', 'pipe'], maxBuffer: 1 << 28,
      env: process.env,
    });
  } catch (e) { out = e.stderr?.toString() ?? ''; }
  // ffmpeg exits 0 here; capture via a second run that tees stderr
  const r = execFileSync('sh', ['-c',
    `"${FF}" -hide_banner -nostats -i "${file}" -af "${af}" -f null - 2>&1`],
    { encoding: 'utf8', maxBuffer: 1 << 28 });
  return r;
}

function duration(file) {
  const t = analyse(file, 'anull');
  const m = t.match(/Duration: (\d+):(\d+):([\d.]+)/);
  return m ? (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) : NaN;
}

/** first time the signal SUSTAINS above `db` for 150ms — silencedetect's
 *  silence_end is exactly that boundary when the file opens silent; if the
 *  file opens loud there is no leading silence interval and the answer is 0 */
function headSilence(file, db) {
  const t = analyse(file, `silencedetect=noise=${db}dB:d=0.15`);
  const first = t.match(/silence_start: ([-\d.]+)[\s\S]*?silence_end: ([\d.]+)/);
  if (!first) return 0;
  return (+first[1]) <= 0.02 ? +first[2] : 0;   // only a silence that starts at t=0 is head silence
}
function tailSilence(file, db, dur) {
  const t = analyse(file, `silencedetect=noise=${db}dB:d=0.15`);
  const starts = [...t.matchAll(/silence_start: ([\d.-]+)/g)].map((m) => +m[1]);
  const ends = [...t.matchAll(/silence_end: ([\d.]+)/g)].map((m) => +m[1]);
  if (!starts.length) return 0;
  const last = starts[starts.length - 1];
  // a final silence interval with no matching end runs to EOF
  return ends.length < starts.length ? Math.max(0, dur - last) : 0;
}

function loudness(file) {
  // loudnorm print_format=json in analyse mode is the two-pass first pass —
  // the same numbers a later correction pass would consume
  const t = analyse(file, 'loudnorm=I=-16:TP=-1.0:LRA=20:print_format=json');
  const j = t.slice(t.lastIndexOf('{'), t.lastIndexOf('}') + 1);
  try { const d = JSON.parse(j); return { i: +d.input_i, tp: +d.input_tp, lra: +d.input_lra, thresh: +d.input_thresh }; }
  catch { return { i: NaN, tp: NaN, lra: NaN, thresh: NaN }; }
}

function ramp(file) {
  // RMS per 0.5s over the first 6s, straight from PCM: astats-per-frame is
  // noisier to parse than it is to recompute
  const raw = execFileSync('sh', ['-c',
    `"${FF}" -hide_banner -loglevel error -t 6 -i "${file}" -ac 1 -ar 16000 -f s16le -`],
    { maxBuffer: 1 << 28 });
  const N = 8000; const out = [];
  for (let w = 0; w < 12; w++) {
    let s = 0, c = 0;
    for (let i = w * N; i < (w + 1) * N && i * 2 + 1 < raw.length; i++) {
      const v = raw.readInt16LE(i * 2) / 32768; s += v * v; c++;
    }
    out.push(c ? 20 * Math.log10(Math.sqrt(s / c) + 1e-9) : -99);
  }
  return out;
}

const args = process.argv.slice(2).filter((a) => a !== '--gate');
const GATE = process.argv.includes('--gate');
const files = args.length ? args
  : readdirSync('public/assets/music').filter((f) => /\.(mp3|ogg|wav)$/.test(f))
    .map((f) => resolve('public/assets/music', f));

let bad = 0;
for (const f of files) {
  const name = f.split('/').pop();
  const dur = duration(f);
  const h40 = headSilence(f, -40), h30 = headSilence(f, -30);
  const tail = tailSilence(f, -40, dur);
  const { i, tp, lra } = loudness(f);
  const r = ramp(f);
  const fails = [];
  if (h40 * 1000 > MAX_HEAD_MS) fails.push(`head silence ${(h40 * 1000).toFixed(0)}ms > ${MAX_HEAD_MS}ms`);
  if (Math.abs(i - TARGET_LUFS) > TOL_LU) fails.push(`loudness ${i.toFixed(1)} LUFS off target ${TARGET_LUFS}±${TOL_LU}`);
  if (tp > MAX_TP) fails.push(`true peak ${tp.toFixed(1)} > ${MAX_TP} dBTP`);
  if (tail > 0.2) fails.push(`tail silence ${tail.toFixed(2)}s — a hole at every loop seam`);
  if (fails.length) bad++;

  console.log(`\n${name}  ${dur.toFixed(2)}s`);
  console.log(`  head silence  -40dB ${(h40 * 1000).toFixed(0)}ms   -30dB ${(h30 * 1000).toFixed(0)}ms   tail ${(tail * 1000).toFixed(0)}ms`);
  console.log(`  loudness      ${i.toFixed(1)} LUFS (target ${TARGET_LUFS}±${TOL_LU})   true peak ${tp.toFixed(1)} dBTP   LRA ${lra.toFixed(1)}`);
  console.log(`  ramp 0.5s     ${r.map((d) => (d < -60 ? ' -inf' : d.toFixed(0).padStart(5))).join('')}`);
  // proposed manifest row: trim the head; loop past any opening bar that is
  // >6 dB hotter than the 2-6s body (an entry stinger); end at the last sound
  const body = r.slice(4, 12).reduce((a, b) => a + b, 0) / 8;
  const stinger = r[1] > body + 6 || r[2] > body + 6;
  const loopStart = stinger ? 4.0 : 0;
  console.log(`  proposal      trimStart ${h40.toFixed(2)}  loopStart ${loopStart.toFixed(2)}${stinger ? '  (opening stinger: play once, never loop it)' : ''}  loopEnd ${(dur - tail).toFixed(2)}`);
  for (const x of fails) console.log(`  FAIL  ${x}`);
}
console.log(GATE ? (bad ? `\n${bad} track(s) out of spec` : '\nevery track in spec') : '');
process.exit(GATE && bad ? 1 : 0);

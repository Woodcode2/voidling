// DOES LANTERN'S WARNING ARRIVE BEFORE THE THING IT WARNS ABOUT? — the late-alarm probe.
//
//   node qa/lnalert.mjs
//
// Studio round 4, Job 10 (AUDIO). On Lantern Night alert() is the drum tower
// speeding up — lnLastSting: twelve taiko strokes from t, then the gong at
// t + 2.0 and the clappers at t + 2.1. Under a recording the drum gate
// (recordingLive(), the owner's "not synced" rule) silences all twelve taiko,
// correctly, and leaves only the gong and the clappers — two seconds late.
// A charge winds up for 0.85 s (rivals.ts, `rv.ctim = 0.85`), so the warning
// landed after the lunge it was warning about, and a tapped padlock on the
// Lantern menu shook, then rang two seconds later (a padlock plays bonk()
// now, qa/padlock.mjs). Lantern ships a recording
// (public/assets/music/lantern.mp3), so the late alarm is the one a child
// hears; the drum tower only plays on the missing-file fallback. (Five of the
// six worlds ship one; Skylark has no skylark.mp3 and plays its fallback
// score.)
//
// ── WHAT IT DOES ───────────────────────────────────────────────────────────
// Runs the REAL createAudio() on Lantern (qa/_synthgraph.mjs: audio3d.ts
// bundled into node, on a context that records every node and every start()
// and renders nothing). The recording is started through the real
// startMusic() and confirmed through musicState() — theme.srcs >= 1, the state
// recordingLive() reads — before alert() is called.
//
//   (a) ON TIME. With the recording playing, the earliest voice alert() puts
//       on master starts within 0.05 s of the call. The bar is the governor's.
//   (b) NO DRUM UNDER A RECORDING. Nothing alert() starts under the recording
//       is pitched below 150 Hz at any point — the taiko's 128 -> 52 Hz body,
//       which recordingLive() exists to keep off a recording.
//   (c) THE FALLBACK KEEPS ITS DRUM TOWER. With no recording, alert() still
//       starts on time (the first taiko is at t), so the fix cannot have
//       been bought by silencing the fallback score's version.
import { loadSynth, rig } from './_synthgraph.mjs';

const WORLD = 'lantern';
const mod = await loadSynth();

const read = async (recording) => {
  const r = await rig(mod, WORLD, { recording });
  const vs = r.run(() => r.a.alert()).filter((v) => v.toMaster && v.start !== null);
  const first = vs.length ? Math.min(...vs.map((v) => v.start)) : null;
  return { vs, first, srcs: r.state().theme.srcs };
};
const rec = await read(true);
const bare = await read(false);

const fmt = (x) => (x === null ? 'never' : `${x.toFixed(3)} s`);
const kinds = (vs) => {
  const m = new Map();
  for (const v of vs) {
    const k = v.kind === 'osc' ? `${v.type}@${v.start.toFixed(2)}` : `noise@${v.start.toFixed(2)}`;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m].map(([k, n]) => (n > 1 ? `${n}x ${k}` : k)).join(' ');
};
console.log(`  ${WORLD}, recording playing (theme.srcs ${rec.srcs}): ${rec.vs.length} voice(s) on master, first at ${fmt(rec.first)}`);
console.log(`    ${kinds(rec.vs) || '(none)'}`);
console.log(`  ${WORLD}, fallback score (theme.srcs ${bare.srcs}): ${bare.vs.length} voice(s) on master, first at ${fmt(bare.first)}`);

const fails = [];
if (!(rec.srcs >= 1)) fails.push(`the recording never registered as playing (theme.srcs ${rec.srcs}) — (a) and (b) would describe the fallback`);
if (bare.srcs !== 0) fails.push(`the fallback read has a recording playing (theme.srcs ${bare.srcs}) — (c) would describe the recording`);
// (a)
if (rec.first === null) fails.push('(a) alert() puts nothing on master under a recording — the warning is silent');
else if (rec.first > 0.05) fails.push(`(a) under a recording the first voice of alert() starts ${rec.first.toFixed(3)} s after the call (bar 0.05 s) `
  + '— the warning lands after the charge it warns about');
else console.log(`  ok   (a) under a recording alert() is heard at ${rec.first.toFixed(3)} s (bar 0.05 s)`);
// (b)
const drum = rec.vs.filter((v) => v.kind === 'osc' && v.fMin < 150);
if (drum.length) fails.push(`(b) under a recording alert() starts ${drum.length} voice(s) pitched below 150 Hz `
  + `(lowest ${Math.min(...drum.map((v) => v.fMin)).toFixed(0)} Hz) — a drum on a recording`);
else console.log('  ok   (b) nothing under the recording is pitched below 150 Hz — no drum joins it');
// (c)
if (bare.first === null || bare.first > 0.05) fails.push(`(c) with no recording alert() is first heard at ${fmt(bare.first)} (bar 0.05 s) — the fallback's drum tower lost its start`);
else console.log(`  ok   (c) with no recording the drum tower still starts at ${bare.first.toFixed(3)} s`);

if (fails.length) {
  for (const f of fails) console.log(`  · ${f}`);
  console.log(`\nFAIL — Lantern's alarm is late under a recording (${fails.length} finding(s))`);
  process.exit(1);
}
console.log(`\nPASS — on Lantern the alarm is heard at ${rec.first.toFixed(3)} s under a recording and at ${bare.first.toFixed(3)} s on the fallback score, with no drum on the recording`);
process.exit(0);

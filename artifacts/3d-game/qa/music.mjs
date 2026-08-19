// WHICH SCORE IS EACH WORLD ACTUALLY PLAYING?
//
//   node qa/music.mjs               # all four worlds
//   node qa/music.mjs maple pirate  # just these
//
// Every world has two possible scores: a recording in public/assets/music/<slot>.mp3
// if one exists, and a hand-written synth bed if it does not. Presence of the
// file is the entire switch — which is convenient right up until you want to
// know which one a player is hearing, because BOTH failure modes are silent:
//
//   • the file 404s   → the synth comes up and nobody notices the slot is empty
//   • the file lands and does NOT DECODE (an .m4a renamed .mp3 is the classic;
//     open-source Chromium cannot decode AAC) → startMusic gives up, sets
//     themeBad, and the synth comes up. Identical from the outside.
//
// So this asks the two questions separately. Did the network request for the
// slot succeed? And is the synth scheduler running? A recording that is really
// playing means one 200 for the slot and a bed that has gone quiet; a synth
// means a 404 (or a decode failure) and a bed constructing voices every second.
import { chromium } from 'playwright';

const ALL = ['maple', 'pirate', 'gameday', 'lantern'];
const worlds = process.argv.slice(2).filter((w) => ALL.includes(w));
const list = worlds.length ? worlds : ALL;

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox',
    '--autoplay-policy=no-user-gesture-required'] });

let bad = 0;
for (const w of list) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 } });
  const hits = [];
  // ── ONE WORLD FAILING MUST NOT TAKE THE OTHERS DOWN ──────────────────────
  // This loop used to let an exception escape, so a single world that never
  // reached a live match killed the process and the worlds queued behind it
  // were never measured at all. That is how a run reported one line and a
  // stack trace, which reads like "three worlds are broken" when in fact three
  // worlds were never asked. A probe that cannot finish cannot be trusted to
  // have covered anything.
  try {
  // A 200 IS NOT A FILE. The preview server — and most static hosts — answer an
  // unknown path with the SPA's index.html at 200, so a missing maple.mp3 comes
  // back "successful" as 25 KB of HTML. It only counts as a track if the server
  // says it is audio and it is big enough to be one.
  p.on('response', (r) => {
    if (!/\/assets\/music\/.+\.(mp3|ogg|wav|m4a)$/.test(r.url())) return;
    const ct = (r.headers()['content-type'] || '').split(';')[0];
    const len = Number(r.headers()['content-length'] || 0);
    hits.push({ url: r.url(), status: r.status(), ct, len,
      real: r.status() === 200 && ct.startsWith('audio/') && len > 20000 });
  });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidMute', '0');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
    // EVERY WORLD OPEN. Worlds now unlock by finishing the one before
    // (src/game/unlocks.ts), so on a fresh profile only Maple is playable and
    // a tap on any other card is REFUSED BY DESIGN — the match never starts and
    // this probe waits out its whole timeout on a game that is working
    // perfectly. That is what made Pirate look like a 15-minute hang, and it is
    // why raising the timeout to 900s changed nothing: the wait was never going
    // to end. Maple passed throughout only because world 1 is never locked.
    localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern');
  } catch { /* private mode */ } });
  await p.goto(`http://127.0.0.1:4177/?w=${w}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show')
    .forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  // the tap gate is the first thing a human touches now — the probe is a human
  const gate = await p.$('#tapGate.show');
  if (gate) { await p.click('#tapGate'); await p.waitForTimeout(350); }
  await p.click('#btnPlay'); await p.waitForTimeout(1200);
  await p.click(`#worldRow .wCard[data-world="${w}"]`);
  // RETRACTED, and worth keeping so nobody re-learns it: this comment used to
  // blame the Pirate Bay timeout on swiftshader being slow, and raising the
  // limit from 600s to 900s changed nothing — because the wait was never going
  // to end. The card was LOCKED (see voidUnlocked above) and a locked card
  // refuses the tap by design. The generous timeout stays for the genuinely
  // slow worlds; it was simply never the cause.
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 6, null, { timeout: 900000 });

  // Count what the synth builds, at four sizes. One number at the start of a
  // match is not enough: every score is written to open sparse and fill out as
  // the player grows, so a world can be perfectly healthy at full size and a
  // hole at the size everybody actually starts at. That is exactly how GAME
  // DAY hid — 31 voices a second grown, 4 at spawn.
  const rates = [];
  for (const r of [1.2, 4, 11]) {
    await p.evaluate((rr) => window.__setVoidR(rr), r);
    await p.waitForTimeout(1200);
    const n = await p.evaluate(async () => {
      let k = 0;
      const P = AudioContext.prototype;
      const o0 = P.createOscillator, b0 = P.createBufferSource;
      P.createOscillator = function () { k++; return o0.call(this); };
      P.createBufferSource = function () { k++; return b0.call(this); };
      await new Promise((z) => setTimeout(z, 3000));
      P.createOscillator = o0; P.createBufferSource = b0;
      return k;
    });
    rates.push(Math.round(n / 3));
  }
  const bed = rates[0] * 3;

  // THE WORLD'S OWN SLOT, NOT WHATEVER LOADED FIRST. This probe reaches a world
  // by walking the menu, and the menu now has a theme of its own
  // (/assets/music/menu.mp3, added when the splash finally got music). So the
  // first real audio hit is the MENU track, and reporting that made a healthy
  // Maple print "RECORDING (menu.mp3)" — which reads like the wrong track is
  // playing in the match when nothing of the sort is happening.
  //
  // Verified with a timestamped request log either side of match start:
  //     menu.mp3   200 audio/mpeg 4526592  (menu phase)
  //     maple.mp3  200 audio/mpeg 2647353  (match phase)
  // Right file, right phase. The instrument was the only thing that was wrong.
  const isMenu = (h) => /\/menu\.mp3$/.test(h.url);
  const ok = hits.filter((h) => h.real && !isMenu(h));
  const miss = hits.filter((h) => !h.real && !isMenu(h));
  const menuHit = hits.find((h) => h.real && isMenu(h));
  const rate = Math.round(bed / 3);
  const slot = ok.length ? ok[0].url.split('/').pop() : null;
  // the synth also builds voices for crunches and stings, so this is a rate
  // question, not a presence one: a running bed is dozens a second.
  const curve = rates.map((n, i) => `${['spawn', 'mid', 'full'][i]} ${String(n).padStart(3)}/s`).join('  ');
  const verdict = slot && rate < 4 ? `RECORDING (${slot})`
    : slot ? `BOTH — ${slot} loaded AND the bed is running (${curve})`
      : `synth   ${curve}`;
  if (slot && rate >= 4) bad++;
  if (!slot && rate < 4) bad++;
  // A score that only arrives once the player is big is a score nobody hears
  // at the moment they are deciding whether this world sounds good.
  if (!slot && rates[0] < 8) { bad++; console.log(`${w.padEnd(8)} ${verdict}\n         ← ${rates[0]}/s at spawn is a hole; the other worlds run 15 to 44`); }
  else console.log(`${w.padEnd(8)} ${verdict}`);
  // …and say so when the menu theme was picked up on the way in, so its absence
  // is visible too — a silent splash is a regression nobody would otherwise see.
  if (menuHit) console.log(`         menu theme loaded on the way in (${menuHit.len} bytes)`);
  for (const h of miss) {
    console.log(`         no track at ${h.url.split('/').pop()} — ${h.status} ${h.ct || '?'} ${h.len} bytes`);
  }
  } catch (e) {
    bad++;
    console.log(`${w.padEnd(8)} COULD NOT MEASURE — ${String(e).split('\n')[0].slice(0, 120)}`);
  } finally {
    await p.close().catch(() => {});
  }
}
await b.close();

console.log(bad ? `\n${bad} world(s) in an unexpected state` : '\nevery world has a score');
process.exit(bad ? 1 : 0);

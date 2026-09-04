// WHAT PLAYS WHEN THE RECORDING CANNOT? — the layered-fallback contract.
//
//   node qa/fallback.mjs [port]
//
// docs/MUSIC-BRIEF.md task 4: at every instant the order is the recording,
// else the synth bed, else nothing is acceptable. The bed's reachability has
// already been lost ONCE without any probe noticing — it was conditioned on
// the fetch FAILING, and the day real files shipped the fetch started
// succeeding slowly instead, which silenced every match for the length of its
// download (see the retractions in the brief). This pins both remaining ways
// a recording can fail to arrive:
//
//   404     — the slot is empty (a world with no track: the shipped state of
//             this game for months, and the state a future world starts in)
//   garbage — the file exists and does not decode (an .m4a renamed .mp3 is
//             the classic; open-source Chromium cannot decode AAC)
//
// In both cases the world's hand-written bed must be the score — audible,
// promptly, without anyone touching a pause button.
import { chromium } from 'playwright';

const PORT = process.argv[2] || '4177';
let bad = 0;
for (const mode of ['404', 'garbage']) {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
  const p = await b.newPage({ viewport: { width: 430, height: 932 } });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.route('**/assets/music/maple.mp3', (r) => (mode === '404'
    ? r.fulfill({ status: 404, body: 'gone' })
    : r.fulfill({ status: 200, contentType: 'audio/mpeg', body: Buffer.from('this is not an mp3 and will not decode') })));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidMute', '0');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
    localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
  } catch { /* private mode */ } });
  await p.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show')
    .forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  if (await p.$('#tapGate.show')) await p.click('#tapGate');
  await p.waitForTimeout(600);
  await p.click('#btnPlay'); await p.waitForTimeout(1000);
  await p.click('#worldRow .wCard[data-world="maple"]');
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 900000 });
  await p.waitForTimeout(1500);
  // the bed builds voices continuously; a dozen oscillators over 3s is a
  // playing score, a handful is the SFX floor
  const n = await p.evaluate(async () => {
    let k = 0;
    const o0 = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function (...a) { k++; return o0.apply(this, a); };
    await new Promise((z) => setTimeout(z, 3000));
    AudioContext.prototype.createOscillator = o0;
    return k;
  });
  const m = await p.evaluate(() => window.__music());
  const ok = m.synth && n / 3 >= 6 && m.theme.srcs === 0;
  console.log(`  ${mode.padEnd(8)} bed=${m.synth} voices=${Math.round(n / 3)}/s theme.srcs=${m.theme.srcs} bad=${m.theme.bad}  ${ok ? 'covered' : 'NOT COVERED'}`);
  if (!ok) bad++;
  await b.close();
}
console.log('\n  ' + (bad ? 'FAIL — a world with no playable recording went silent' : 'PASS — the bed is the score whenever the recording cannot be') + '\n');
process.exit(bad ? 1 : 0);

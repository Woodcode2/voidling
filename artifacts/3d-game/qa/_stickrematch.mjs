// Does a joystick that was live when the match ended survive into the NEXT
// match? The results sheet is a full-screen overlay, so PLAY AGAIN is tapped
// with a different finger — the driving thumb can still be on the glass.
// Nothing in endMatch/resetMatch touches `joy` (prototype3d.ts:1088-1153).
//
//   node qa/_stickrematch.mjs [port]
import { chromium } from 'playwright';
import { bootMatch, VCLOCK, PTR } from './_boot.mjs';

const PORT = process.argv[2] || '4267';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await bootMatch(b, PORT, 'maple');
await p.evaluate(() => { for (const e of window.__edibles) e.eaten = true; });
await p.evaluate(VCLOCK);
await p.evaluate(PTR);
await p.waitForFunction(() => window.__F > 30, null, { timeout: 300000 });

const R = await p.evaluate(async () => {
  const CX = Math.round(innerWidth / 2), CY = Math.round(innerHeight * 0.62);
  const F = () => window.__F;
  const waitF = (n) => new Promise(res => window.__at(F() + n, res));
  const sp = (n = 25) => { const a = window.__L.slice(-n); return a.reduce((s, r) => s + r.sp, 0) / a.length; };
  // drive
  window.down(CX, CY);
  let f0 = F(); for (let k = 1; k <= 20; k++) window.__at(f0 + k, () => window.move(CX, CY - 90));
  await waitF(90);
  const driving = sp();
  // run the clock out with the thumb still down
  window.__rushClock(0.4);
  await waitF(600);
  const endShown = document.getElementById('end').classList.contains('show');
  const atEnd = sp();
  const ringAtEnd = document.getElementById('joy').style.display !== 'none';
  // PLAY AGAIN, tapped with the OTHER hand — the driving thumb never lifted
  const again = document.getElementById('btnAgain');
  again.click();
  await waitF(400);
  const started2 = (window.__matchState().t ?? 0);
  const driftNewMatch = sp(120);
  const ringNow = document.getElementById('joy').style.display !== 'none';
  const vs = window.__voidState();
  window.up(CX, CY - 90);
  await waitF(120);
  return { driving, endShown, atEnd, ringAtEnd, started2, driftNewMatch, ringNow, r: vs.r };
});

console.log('\n=== A LIVE JOYSTICK ACROSS THE END OF A MATCH ===');
console.log(`  driving before the buzzer          : ${R.driving.toFixed(2)} u/s`);
console.log(`  results sheet shown                : ${R.endShown}`);
console.log(`  void speed with the results sheet up: ${R.atEnd.toFixed(2)} u/s (ring still drawn=${R.ringAtEnd})`);
console.log(`  PLAY AGAIN tapped, thumb never lifted:`);
console.log(`     new match clock ${R.started2.toFixed(2)} s, ring drawn=${R.ringNow}`);
console.log(`     void speed with NO deliberate input: ${R.driftNewMatch.toFixed(2)} u/s`);
console.log(R.driftNewMatch > 0.5 ? '  >>> THE NEW MATCH STARTS WITH THE VOID ALREADY DRIVING ITSELF' : '  ok: the new match starts still');
await b.close();

// CAN A STRANGER ON THE LIVE URL GET EVERY PAID SKIN FOR FREE?
//
//   node qa/iapmockhost.mjs [port]
//
// src/proto3d/store3d.ts keeps a testing escape hatch: `?iapmock=1` switches the
// web build's purchase path to a mock that grants the item after a beat, so QA
// can exercise the shop without StoreKit. Its own header explains why the web
// build must not grant anything — "voidling is playable on the open web, so the
// mock would have given away every paid skin to anyone who found the page" —
// and then the hatch reopened exactly that door for anyone who types nine
// characters. The readiness audit found it on 2026-09-22.
//
// So the question this answers is the player's, not the code's: load the REAL
// page from a hostname that is not this machine, open the REAL shop, and read
// what a child would read on a paid card. `BUY · $x` means the mock is live and
// the item will be handed over. `$x · ON THE APP STORE` means it will not.
//
// Chromium's host-resolver maps a made-up public-looking name onto the local
// preview server, so `location.hostname` is exactly what it would be on a
// deployed site. vite.config.ts sets preview.allowedHosts: true, which is what
// makes the foreign Host header get a page at all.
//
// TWO BARS, and the second is not optional. The hatch has a legitimate job:
// qa/_shopshot.mjs and friends open the shop at 127.0.0.1 with ?iapmock=1 to
// test purchases. A fix that simply deleted the hatch would pass bar 1 and
// quietly blind them, so bar 2 proves the local path still works.
import { chromium } from 'playwright';

const PORT = process.argv[2] || '4177';
const FOREIGN = 'voidling-live.example';   // stands in for the deployed hostname
let bad = 0, bars = 0;
const ok = (m) => { bars++; console.log(`  ok   ${m}`); };
const no = (m) => { bars++; bad++; console.log(`  BAD  ${m}`); };

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader',
    `--host-resolver-rules=MAP ${FOREIGN} 127.0.0.1`] });

/** Open the shop at `host` with ?iapmock=1, TAP a legendary card the way a
 *  child does, and return what the preview's action button says.
 *
 *  THE FIRST VERSION OF THIS READ THE GRID AND FOUND NOTHING. It looked for
 *  "BUY" / "ON THE APP STORE" among the shop's buttons and came back 0 and 0 on
 *  both hosts — because the grid never says either. A paid card on the grid
 *  shows only its dollar price (`.pr`); the line that decides whether money
 *  changes hands is #spAct, the button on the PREVIEW, which only exists after
 *  a tap. The probe failed loudly on "no paid card was found at all" rather
 *  than passing on silence, which is the whole reason that branch is there.
 *  Two readings now, both player-facing:
 *    heading — `.shopTier.gold span`: "A WHOLE NEW CHARACTER" when a purchase
 *              path exists, "COMING SOON ON iPHONE" when it does not
 *    action  — #spAct after tapping `.skCard.legend`: "BUY · $x" hands it over,
 *              "$x · ON THE APP STORE" does not */
async function paidCards(host) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 } });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
  } catch { } });
  await p.goto(`http://${host}:${PORT}/?iapmock=1`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.waitForSelector('#btnShop', { state: 'visible', timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.evaluate(() => document.getElementById('btnShop')?.click());
  await p.waitForSelector('#shop.show', { timeout: 60000 }).catch(() => { });
  await p.waitForSelector('#shopGrid .skCard.legend', { timeout: 60000 }).catch(() => { });
  const heading = await p.evaluate(() =>
    (document.querySelector('#shopGrid .shopTier.gold span')?.textContent || '').trim());
  const legends = await p.evaluate(() => document.querySelectorAll('#shopGrid .skCard.legend').length);
  await p.evaluate(() => document.querySelector('#shopGrid .skCard.legend')?.click());
  await p.waitForFunction(() => (document.getElementById('spAct')?.textContent || '').trim().length > 1,
    null, { timeout: 30000 }).catch(() => { });
  const r = await p.evaluate(() => ({
    hostname: location.hostname,
    open: !!document.querySelector('#shop.show'),
    action: (document.getElementById('spAct')?.textContent || '').replace(/\s+/g, ' ').trim(),
  }));
  await p.close();
  return { ...r, heading, legends };
}

console.log(`\n  IAP MOCK BY HOST — can ?iapmock=1 give paid items away on a deployed URL?\n`);
const live = await paidCards(FOREIGN);
console.log(`  ·    ${live.hostname}: shop open=${live.open}  legendary cards=${live.legends}  heading="${live.heading}"  action="${live.action}"`);
if (!live.open || !live.legends || !live.action) no(`on ${FOREIGN} the shop, a legendary card or its action button could not be read — cannot answer, and silence is a FAIL`);
else if (/^BUY\b/i.test(live.action)) no(`on ${FOREIGN} a legendary card's button reads "${live.action}" — the mock is live on a public hostname and hands every paid item over for free`);
else if (!/ON THE APP STORE/i.test(live.action)) no(`on ${FOREIGN} the button reads "${live.action}" — neither a purchase nor a pointer to the App Store; the probe does not recognise the state`);
else ok(`on ${FOREIGN}, ?iapmock=1 is refused: a tapped legendary card says "${live.action}", and the tier reads "${live.heading}"`);

const local = await paidCards('127.0.0.1');
console.log(`  ·    ${local.hostname}: shop open=${local.open}  legendary cards=${local.legends}  heading="${local.heading}"  action="${local.action}"`);
if (!local.open || !local.legends || !local.action) no('on 127.0.0.1 the shop, a legendary card or its action button could not be read — cannot answer, and silence is a FAIL');
else if (!/^BUY\b/i.test(local.action)) no(`on 127.0.0.1 ?iapmock=1 no longer works ("${local.action}") — the fix blinded the QA probes that test purchases`);
else ok(`on 127.0.0.1, ?iapmock=1 still works for QA: "${local.action}"`);

await b.close();
// two literal verdicts, not one templated one: qa/idiomguard.mjs (#2a) reads
// the source for both tokens, and a ternary hides them from it
if (bad) console.log(`\nFAIL — ${bad} of ${bars} bar(s)`);
else console.log(`\nPASS — ${bars} bar(s)`);
process.exit(bad ? 1 : 0);

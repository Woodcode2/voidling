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

/** Open the shop at `host` with ?iapmock=1 and return the paid cards' button text. */
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
  const r = await p.evaluate(() => {
    const txt = [...document.querySelectorAll('#shop button, #shop .shopBuy, #shop [data-price]')]
      .map((e) => (e.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
    return {
      hostname: location.hostname,
      open: !!document.querySelector('#shop.show'),
      buy: txt.filter((t) => /^BUY\s*·/i.test(t)).length,
      store: txt.filter((t) => /ON THE APP STORE/i.test(t)).length,
      sample: txt.filter((t) => /BUY|APP STORE/i.test(t)).slice(0, 3),
    };
  });
  await p.close();
  return r;
}

console.log(`\n  IAP MOCK BY HOST — can ?iapmock=1 give paid items away on a deployed URL?\n`);
const live = await paidCards(FOREIGN);
console.log(`  ·    ${live.hostname}: shop open=${live.open}  BUY=${live.buy}  APP STORE=${live.store}  e.g. ${JSON.stringify(live.sample)}`);
if (!live.open) no(`the shop did not open on ${FOREIGN} — cannot answer, and silence is a FAIL`);
else if (live.buy > 0) no(`on ${FOREIGN} the paid cards read "BUY" — the mock is live on a public hostname and hands every paid item over for free`);
else if (live.store === 0) no(`on ${FOREIGN} no paid card was found at all — the probe cannot see the thing it measures`);
else ok(`on ${FOREIGN}, ?iapmock=1 is refused: ${live.store} paid card(s) read "ON THE APP STORE", none read "BUY"`);

const local = await paidCards('127.0.0.1');
console.log(`  ·    ${local.hostname}: shop open=${local.open}  BUY=${local.buy}  APP STORE=${local.store}`);
if (!local.open) no('the shop did not open on 127.0.0.1 — cannot answer, and silence is a FAIL');
else if (local.buy === 0) no('on 127.0.0.1 ?iapmock=1 no longer works — the fix blinded the QA probes that test purchases');
else ok(`on 127.0.0.1, ?iapmock=1 still works for QA: ${local.buy} paid card(s) read "BUY"`);

await b.close();
console.log(`\n${bad ? 'FAIL' : 'PASS'} — ${bad ? `${bad} of ${bars}` : bars} bar(s)`);
process.exit(bad ? 1 : 0);

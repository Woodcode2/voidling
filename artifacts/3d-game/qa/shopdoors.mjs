// THE SHOP HAS TWO DOORS, AND ONLY ONE OF THEM WORKED PROPERLY.
//
// 1. THE END SCREEN. Finish a match with enough coins and the results screen
//    offers "OPEN SHOP →". That handler showed the overlay and stopped — it
//    never called __shopTab(), which is what starts the card renders. #btnShop
//    has called it since the day the note beside it was written: "without this
//    the first thing a child sees is thirteen empty gradients until they touch
//    something." The fix went on the menu button only. The end-screen door is
//    the one a child arrives at holding coins the game has just told them they
//    can spend, so it opened on a grid of blanks at exactly the moment the shop
//    had earned their attention.
//
// 2. RESTORE PURCHASES. It went straight to the parental gate on every
//    platform. With no StoreKit, a parent solved a two-digit multiplication and
//    the reward was "NOTHING TO RESTORE". The skin path has checked the
//    platform before the gate since it shipped and the hat path was fixed with
//    exactly that reasoning; restore was the third instance and the worst,
//    because it is the button a parent presses believing they ALREADY paid.
//
// EACH DOOR GETS ITS OWN PAGE. The first version of this probe tested restore
// first — which opens the shop through the WORKING door, painting every card —
// and then walked through the end-screen door to find them already painted. It
// passed on the broken build. paintVoids() is `if (voidsDone) return;`, so one
// visit through the good door hides the bad one for the rest of the session.
//
//   node qa/shopdoors.mjs [port]
import { chromium } from 'playwright';

const PORT = process.argv[2] || '4173';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const errs = [];
const fail = [];
const ok = (cond, label, detail = '') => {
  console.log(`${cond ? '  ok  ' : ' FAIL '} ${label}${detail ? `   ${detail}` : ''}`);
  if (!cond) fail.push(label);
};

const fresh = async () => {
  const pg = await b.newPage({ viewport: { width: 420, height: 860 } });
  pg.on('pageerror', (e) => errs.push(String(e.message).slice(0, 200)));
  await pg.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await pg.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('voidPlayed', '1');
    localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
    localStorage.setItem('voidCoins', '900');      // enough to afford something
  });
  await pg.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await pg.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  return pg;
};

/** PLAY -> pick a world -> wind the clock down -> results screen. */
const playToResults = async (pg) => {
  await pg.evaluate(() => document.getElementById('btnPlay')?.click());
  await pg.waitForTimeout(1200);
  await pg.evaluate(() => {
    const c = document.querySelector('#worldRow .wCard[data-world="maple"]')
      || document.querySelector('#worldRow .wCard[data-world]');
    c?.click();
  });
  await pg.waitForFunction(() => (window.__matchState?.().clock ?? 999) < 179, null, { timeout: 300000 })
    .catch(() => { });
  await pg.evaluate(() => window.__rushClock?.(0.3));
  await pg.waitForFunction(() => document.getElementById('end')?.classList.contains('show'),
    null, { timeout: 300000 }).catch(() => { });
  await pg.waitForTimeout(2500);
};

// ── DOOR 1 · the end screen, on a page that has never opened the shop ──────
{
  const p = await fresh();
  await playToResults(p);
  const hasDoor = await p.evaluate(() => !!document.getElementById('endShop'));
  ok(hasDoor, 'the results screen offers OPEN SHOP when a skin is affordable');
  if (!hasDoor) {
    const nx = await p.evaluate(() => document.querySelector('#end .nx')?.textContent || '(none)');
    console.log(`   results footer read: ${nx.trim().slice(0, 90)}`);
  } else {
    await p.evaluate(() => document.getElementById('endShop')?.click());
    // the cards paint across frames; give them the chance the menu door gets
    await p.waitForFunction(() => {
      const cvs = [...document.querySelectorAll('#shopGrid .skCard canvas')];
      return cvs.length > 0 && cvs.every((c) => c.width > 0 && c.width === c.height);
    }, null, { timeout: 60000 }).catch(() => { });
    await p.waitForTimeout(1500);
    const painted = await p.evaluate(() => {
      const cvs = [...document.querySelectorAll('#shopGrid .skCard canvas')];
      let blank = 0;
      for (const cv of cvs) {
        // an untouched canvas is 300x150; a painted one is square
        if (!cv.width || cv.width !== cv.height) { blank++; continue; }
        const c2 = document.createElement('canvas');
        c2.width = cv.width; c2.height = cv.height;
        const x = c2.getContext('2d'); x.drawImage(cv, 0, 0);
        const d = x.getImageData(0, 0, cv.width, cv.height).data;
        let any = false;
        for (let i = 3; i < d.length; i += 4 * 97) if (d[i] > 24) { any = true; break; }
        if (!any) blank++;
      }
      return { total: cvs.length, blank, open: !!document.getElementById('shop')?.classList.contains('show') };
    });
    console.log(`through the end-screen door: ${painted.total} cards, ${painted.blank} blank`);
    ok(painted.open, 'the shop actually opened');
    ok(painted.total > 0 && painted.blank === 0,
      'and every card arrived painted, not as an empty gradient',
      `${painted.blank} of ${painted.total} blank`);
    await p.screenshot({ path: 'qa-out/shopdoor-end.png' });
  }
  await p.close();
}

// ── DOOR 2 · restore, on its own page ──────────────────────────────────────
{
  const p = await fresh();
  await p.evaluate(() => document.getElementById('btnShop')?.click());
  await p.waitForTimeout(1500);
  await p.evaluate(() => document.getElementById('btnRestore')?.click());
  await p.waitForTimeout(900);
  const restore = await p.evaluate(() => ({
    label: document.getElementById('btnRestore')?.textContent || '',
    gate: !!document.getElementById('gate')?.classList.contains('show'),
  }));
  console.log(`restore with no StoreKit: "${restore.label.trim()}" (gate shown: ${restore.gate})`);
  ok(!restore.gate, 'no maths puzzle for a parent the store cannot serve');
  ok(/APP STORE/i.test(restore.label), 'and it says where the purchase actually lives',
    restore.label.trim());
  await p.close();
}

if (errs.length) console.log('\nPAGE ERRORS:', errs.slice(0, 4));
await b.close();
console.log(fail.length ? `\nFAIL (${fail.length}): ${fail.join(' | ')}` : '\nboth doors open onto the same shop');
process.exit(fail.length ? 1 : 0);

// THE ECONOMY'S PROMISES, MEASURED — the AAA-BRIEF §4.4/§4.5 gate.
//
//   node qa/econ.mjs [port]
//
// Three promises this round made, each of which could regress silently:
//
//   1. THE CLIFF IS DEAD. A week-4 player who missed two days used to come
//      back to 90✦ where yesterday paid 570✦ — a 6.3× loss-aversion penalty
//      pointed at a six-year-old. Missing now steps the week ladder down ONE
//      rung. Seeds that exact player and reads the claim button.
//      Also: the day number NEVER goes backwards (voidDailyLife is monotone).
//
//   2. THE LADDER PAYS. Trophies carry bounties and pay exactly once, at the
//      end of a match; level-ups pay too. Seeds a profile that has earned all
//      seventeen trophies but been paid for none (every pre-this-build
//      profile), runs one match to TIME!, and asserts the wallet moved by at
//      least the full back catalogue and the results lead says 🏆.
//
//   3. THE BUNDLE CARD EXISTS. One SKU, whole wardrobe, one parental gate —
//      the banner must render in the shop and carry a price (web build shows
//      the USD fallback; StoreKit repaints it on device).
import { chromium } from 'playwright';

const PORT = process.argv[2] || '4177';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const fails = [];

// ── 1. the cliff ────────────────────────────────────────────────────────────
{
  const p = await b.newPage({ viewport: { width: 430, height: 932 } });
  p.on('pageerror', (e) => fails.push('PAGEERR ' + String(e).slice(0, 120)));
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toDateString();
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidMute', '1');
    localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder');
    // a week-4 day-7 player, three days silent — the exact child the old
    // code punished hardest
    localStorage.setItem('voidDailyLast', threeDaysAgo);
    localStorage.setItem('voidDailyDay', '6');
    localStorage.setItem('voidDailyWeek', '4');
    localStorage.setItem('voidDailyLife', '27');
    localStorage.setItem('voidDailyStreak', '27');
    localStorage.setItem('voidStreakDay', threeDaysAgo);
  } catch { /* private */ } });
  await p.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForSelector('#daily.show', { timeout: 400000 });
  const claim = await p.evaluate(() => ({
    btn: document.getElementById('dailyClaim')?.textContent ?? '',
    today: document.querySelector('#dailyGrid .dCell.now b')?.textContent ?? '',
  }));
  const amt = Number((claim.btn.match(/(\d+)/) ?? [])[1] ?? 0);
  const dayNo = Number((claim.today.match(/(\d+)/) ?? [])[1] ?? 0);
  console.log(`  missed-2-days, week 4: claim=${amt}✦ (old cliff paid 90)  cell="${claim.today}"`);
  if (amt < 140) fails.push(`cliff not dead — returning claim is ${amt}✦, the week ladder reset`);
  if (dayNo < 28) fails.push(`day number went backwards — cell says ${dayNo}, lifetime is 27 claims`);
  await p.close();
}

// ── 2. the ladder pays ──────────────────────────────────────────────────────
{
  const p = await b.newPage({ viewport: { width: 430, height: 932 } });
  p.on('pageerror', (e) => fails.push('PAGEERR ' + String(e).slice(0, 120)));
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidMute', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
    localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder');
    localStorage.setItem('voidCoins', '1000');
    // every trophy earned, none paid: the state every profile that predates
    // the bounty system is in on its first match after the update
    localStorage.setItem('voidStats',
      JSON.stringify({ matches: 30, wins: 12, best: 20000, bestForm: 6, eaten: 6000, rivals: 12, combo: 30 }));
  } catch { /* private */ } });
  await p.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show')
    .forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(900);
  await p.click('#worldRow .wCard[data-world="maple"]');
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 900000 });
  await p.evaluate(() => window.__rushClock(0.05));
  await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'), null, { timeout: 120000 });
  const r = await p.evaluate(() => ({
    paid: JSON.parse(localStorage.getItem('voidTrophyPaid') || '[]'),
    coins: Number(localStorage.getItem('voidCoins') || 0),
    lead: document.getElementById('endSub')?.textContent ?? '',
  }));
  // the full back catalogue at seeded stats: all 17 bounties = 810✦
  console.log(`  trophies paid: ${r.paid.length}/17  wallet 1000 → ${r.coins}  lead="${r.lead.slice(0, 60)}"`);
  if (r.paid.length !== 17) fails.push(`expected all 17 trophies paid, got ${r.paid.length}`);
  if (r.coins < 1810) fails.push(`wallet ${r.coins} — the 810✦ back catalogue did not land`);
  if (!r.lead.includes('🏆')) fails.push('results lead does not name the trophy');

  // a SECOND match must pay the catalogue exactly once — nothing new due
  await p.click('#btnAgain');
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 900000 });
  const before2 = await p.evaluate(() => Number(localStorage.getItem('voidCoins') || 0));
  await p.evaluate(() => window.__rushClock(0.05));
  await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'), null, { timeout: 120000 });
  const after2 = await p.evaluate(() => ({
    coins: Number(localStorage.getItem('voidCoins') || 0),
    paid: JSON.parse(localStorage.getItem('voidTrophyPaid') || '[]').length,
  }));
  console.log(`  rematch: paid stays ${after2.paid}/17, wallet +${after2.coins - before2} (match reward only)`);
  if (after2.paid !== 17) fails.push('voidTrophyPaid changed size on a rematch');
  if (after2.coins - before2 > 600) fails.push(`rematch paid ${after2.coins - before2}✦ — bounties double-paid`);

  // ── 3. the bundle banner ─────────────────────────────────────────────────
  await p.click('#btnHome'); await p.waitForTimeout(800);
  await p.click('#btnShop'); await p.waitForTimeout(600);
  const bundle = await p.evaluate(() => {
    const c = document.querySelector('#shopGrid .skCard.bundle');
    return c ? { pr: c.querySelector('.pr')?.textContent ?? '' } : null;
  });
  console.log(`  bundle card: ${bundle ? `present, pr="${bundle.pr}"` : 'MISSING'}`);
  if (!bundle) fails.push('bundle banner missing from the shop');
  else if (!/\$9\.99|COMING/.test(bundle.pr)) fails.push(`bundle price reads "${bundle.pr}"`);
  await p.close();
}

await b.close();
console.log('\n  ' + (fails.length ? 'FAIL — ' + fails.join('; ') : 'PASS — the cliff is dead, the ladder pays once, and the bundle is on the shelf') + '\n');
process.exit(fails.length ? 1 : 0);

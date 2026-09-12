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
//   3. GEMS ARE REAL AND RARE. The owner's two-currency design: deep
//      trophies pay 💎 alongside ✦ (18 gems across the full back catalogue),
//      the gem colourways render priced in their own shop tier, and the gem
//      chip appears once a balance exists. (The everything-bundle this
//      section used to check was REMOVED by the owner's decision — its
//      absence is now part of the contract.)
import { chromium } from 'playwright';
import { enterMatch } from './_enter.mjs';

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
    localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
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
  // THE ARITHMETIC, ASKED DIRECTLY. This used to wait for `#daily.show` and read
  // the amount off the CLAIM button's text — which worked only while the card
  // rose full-screen on its own, over PLAY, on a child's second morning. It no
  // longer does (the day is claimed silently on the first finish; the card lives
  // in the scrapbook), so that wait sat for its full 400 s and then threw, and
  // the gate step this probe IS went red.
  //
  // Reading __dailyDue() is the better test anyway: what this section is about
  // is the money a returning player is owed, and that was being inferred from a
  // rendering of a button. Now it asks the function the claim itself uses, and
  // then checks the card still AGREES with it — which is one more thing covered,
  // not one fewer.
  await p.waitForFunction(() => typeof window.__dailyDue === 'function', null, { timeout: 400000 });
  const due = await p.evaluate(() => window.__dailyDue());
  if (!due) {
    fails.push('nothing owing on a profile three days stale — the calendar is not counting at all');
  }
  const amt = due ? due.coins : 0;
  const dayNo = due ? due.life + 1 : 0;
  // …and the CARD still renders what the arithmetic says. #btnDaily lives inside
  // #book; click() fires its handler whether or not the book is open.
  const card = await p.evaluate(() => {
    document.getElementById('btnDaily')?.click();
    return {
      shown: !!document.getElementById('daily')?.classList.contains('show'),
      today: document.querySelector('#dailyGrid .dCell.now b')?.textContent ?? '',
      btn: document.getElementById('dailyClaim')?.textContent ?? '',
    };
  });
  const cardDay = Number((card.today.match(/(\d+)/) ?? [])[1] ?? 0);
  console.log(`  missed-2-days, week 4: owed=${amt}✦ (old cliff paid 90)  day=${dayNo}  `
    + `card="${card.today}" btn="${card.btn}" shown=${card.shown}`);
  if (amt < 140) fails.push(`cliff not dead — returning claim is ${amt}✦, the week ladder reset`);
  if (dayNo < 28) fails.push(`day number went backwards — arithmetic says ${dayNo}, lifetime is 27 claims`);
  if (!card.shown) fails.push('the calendar cannot be opened from the scrapbook — it is now unreachable');
  if (cardDay !== dayNo) fails.push(`the card and the arithmetic disagree — card says day ${cardDay}, owed says ${dayNo}`);
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
    localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
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
  await enterMatch(p, 'maple');
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 900000 });
  await p.evaluate(() => window.__rushClock(0.05));
  await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'), null, { timeout: 120000 });
  const r = await p.evaluate(() => ({
    paid: JSON.parse(localStorage.getItem('voidTrophyPaid') || '[]'),
    coins: Number(localStorage.getItem('voidCoins') || 0),
    gems: Number(localStorage.getItem('voidGems') || 0),
    lead: document.getElementById('endSub')?.textContent ?? '',
  }));
  // the full back catalogue at seeded stats: all 17 bounties = 810✦ + 10💎
  // (+1💎 more if this run happened to be the day's first win). The lump was
  // 18 for one commit; the owner's pacing call ("too easy") cut it to 10.
  console.log(`  trophies paid: ${r.paid.length}/17  wallet 1000 → ${r.coins}  gems 0 → ${r.gems}  lead="${r.lead.slice(0, 60)}"`);
  if (r.paid.length !== 17) fails.push(`expected all 17 trophies paid, got ${r.paid.length}`);
  if (r.coins < 1810) fails.push(`wallet ${r.coins} — the 810✦ back catalogue did not land`);
  if (r.gems < 10 || r.gems > 11) fails.push(`gems ${r.gems} — the 10💎 back catalogue did not land (or double-paid)`);
  if (!r.lead.includes('🏆')) fails.push('results lead does not name the trophy');

  // a SECOND match must pay the catalogue exactly once — nothing new due
  await p.click('#btnAgain');
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 900000 });
  const before2 = await p.evaluate(() => ({
    coins: Number(localStorage.getItem('voidCoins') || 0),
    gems: Number(localStorage.getItem('voidGems') || 0),
  }));
  await p.evaluate(() => window.__rushClock(0.05));
  await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'), null, { timeout: 120000 });
  const after2 = await p.evaluate(() => ({
    coins: Number(localStorage.getItem('voidCoins') || 0),
    gems: Number(localStorage.getItem('voidGems') || 0),
    paid: JSON.parse(localStorage.getItem('voidTrophyPaid') || '[]').length,
  }));
  console.log(`  rematch: paid stays ${after2.paid}/17, wallet +${after2.coins - before2.coins}, gems +${after2.gems - before2.gems}`);
  if (after2.paid !== 17) fails.push('voidTrophyPaid changed size on a rematch');
  if (after2.coins - before2.coins > 600) fails.push(`rematch paid ${after2.coins - before2.coins}✦ — bounties double-paid`);
  if (after2.gems - before2.gems > 1) fails.push(`rematch paid ${after2.gems - before2.gems}💎 — gem bounties double-paid`);

  // ── 3. the gem shelf ─────────────────────────────────────────────────────
  await p.click('#btnHome'); await p.waitForTimeout(800);
  await p.click('#btnShop'); await p.waitForTimeout(600);
  const shelf = await p.evaluate(() => {
    const tiers = [...document.querySelectorAll('#shopGrid .shopTier')].map((t) => t.textContent ?? '');
    const aurora = [...document.querySelectorAll('#shopGrid .skCard')]
      .find((c) => c.querySelector('.nm')?.textContent === 'Aurora');
    const chip = document.getElementById('shopGems');
    return {
      gemTier: tiers.some((t) => t.includes('GEMS')),
      bundleGone: !document.querySelector('#shopGrid .skCard.bundle'),
      auroraPr: aurora?.querySelector('.pr')?.textContent ?? 'CARD MISSING',
      chipShown: !!chip && chip.style.display !== 'none',
      chipN: document.getElementById('shopGemsN')?.textContent ?? '',
    };
  });
  console.log(`  gem shelf: tier=${shelf.gemTier} aurora="${shelf.auroraPr}" chip=${shelf.chipShown} (${shelf.chipN}💎) bundleGone=${shelf.bundleGone}`);
  if (!shelf.gemTier) fails.push('no GEMS tier header in the shop');
  if (!shelf.bundleGone) fails.push('the vetoed bundle banner still renders');
  if (!/💎 25/.test(shelf.auroraPr)) fails.push(`Aurora price reads "${shelf.auroraPr}"`);
  if (!shelf.chipShown || Number(shelf.chipN) < 10) fails.push(`gem chip hidden or empty (${shelf.chipN})`);

  // ── 4. a gem hat is buyable from play money, with no gate in the way ─────
  // Seed a rich gem wallet, open HATS, tap the chef card: it must grant,
  // deduct exactly its price, and never open the parental gate (the gate
  // pauses everything on a maths question — a soft-currency spend that hits
  // it would time out right here).
  await p.evaluate(() => { localStorage.setItem('voidGems', '100'); });
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show')
    .forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnShop'); await p.waitForTimeout(500);
  await p.click('.shopTab[data-tab="hats"]'); await p.waitForTimeout(500);
  const hat = await p.evaluate(() => {
    const card = document.querySelector('#hatGrid canvas[id="hatcv_chef"]')?.closest('.hatCard');
    if (!card) return { found: false };
    const before = Number(localStorage.getItem('voidGems') || 0);
    card.click();
    return {
      found: true, before,
      after: Number(localStorage.getItem('voidGems') || 0),
      owned: (JSON.parse(localStorage.getItem('voidHatsOwned') || '[]')).includes('chef'),
      gateUp: !!document.querySelector('#gate.show'),
    };
  });
  console.log(`  gem hat: found=${hat.found} owned=${hat.owned} gems ${hat.before}→${hat.after} gate=${hat.gateUp}`);
  if (!hat.found) fails.push('chef hat card missing from the hats tab');
  else {
    if (!hat.owned) fails.push('gem hat tap did not grant');
    if (hat.before - hat.after !== 35) fails.push(`gem hat deducted ${hat.before - hat.after}, price is 35`);
    if (hat.gateUp) fails.push('a SOFT-currency spend opened the parental gate');
  }
  await p.close();
}

await b.close();
console.log('\n  ' + (fails.length ? 'FAIL — ' + fails.join('; ') : 'PASS — the cliff is dead, the ladder pays once, and gems are real, rare, and spendable') + '\n');
process.exit(fails.length ? 1 : 0);

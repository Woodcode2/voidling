// TWO WRITERS FOR ONE STREAK, SO THE SEVEN-DAY PRIZE ARRIVES ON DAY SIX.
//
// The comment above the daily calendar says "ONE STREAK, NOT TWO" and explains
// that the calendar is now the single writer of the shared counter. It is not:
// bumpStreak() still writes it too, at the end of every match, off its OWN day
// gate (voidLastDay) and its OWN arithmetic (streak + 1).
//
// So on any day the child both opens the menu and finishes a match — which is
// every ordinary day, since the daily card covers the screen on menu load and
// PLAY sits behind it — the counter advances TWICE:
//
//   claim  -> setStreak(voidDailyStreak + 1)      the honest one
//   match  -> setStreak(streak + 1)               the second one, uninvited
//
// Two things break. The rank chip reads one higher than the daily card for the
// rest of the day, every day. And unlockStreakSkins() runs from setStreak, so
// Prism — the SEVEN-day reward, sold in the shop as "🔥 PLAY 7 DAYS IN A ROW" —
// unlocks at the end of day six, announcing "7 DAYS IN A ROW" to a child who
// has played six.
//
// This drives the real path: seed the state of a child on their sixth
// consecutive day, claim the card, finish a match, and read the counter.
//
//   node qa/streakdrift.mjs [port]
import { chromium } from 'playwright';

const PORT = process.argv[2] || '4173';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 420, height: 860 } });
const errs = [];
p.on('pageerror', (e) => errs.push(String(e.message).slice(0, 200)));
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));

// Five days done, coming back for the sixth. Both day-gates say "yesterday",
// which is what an ordinary run of consecutive days leaves behind.
await p.addInitScript(() => {
  const yd = new Date(Date.now() - 86400000).toDateString();
  localStorage.clear();
  localStorage.setItem('voidPlayed', '1');
  localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', yd);
  localStorage.setItem('voidDailyDay', '4');       // day 5 of the week just done
  localStorage.setItem('voidDailyWeek', '1');
  localStorage.setItem('voidDailyStreak', '5');
  localStorage.setItem('voidLastDay', yd);         // bumpStreak's separate gate
  localStorage.setItem('voidStreak', '5');
  localStorage.setItem('voidSkinsOwned', JSON.stringify(['classic', 'ember']));
});
await p.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });

const fail = [];
const ok = (cond, label, detail = '') => {
  console.log(`${cond ? '  ok  ' : ' FAIL '} ${label}${detail ? `   ${detail}` : ''}`);
  if (!cond) fail.push(label);
};
const read = () => p.evaluate(() => ({
  streak: Number(localStorage.getItem('voidStreak')),
  daily: Number(localStorage.getItem('voidDailyStreak')),
  owned: JSON.parse(localStorage.getItem('voidSkinsOwned') || '[]'),
  chip: document.getElementById('rankChip')?.textContent || '',
}));

// ── the claim: this is day SIX ─────────────────────────────────────────────
await p.waitForSelector('#daily.show', { timeout: 30000 }).catch(() => { });
const card = await p.evaluate(() => document.getElementById('dailyStreak')?.textContent || '');
await p.evaluate(() => document.getElementById('dailyClaim')?.click());
await p.waitForTimeout(1500);
const afterClaim = await read();
console.log(`daily card said "${card.trim()}"`);
console.log(`after claiming: voidStreak=${afterClaim.streak} voidDailyStreak=${afterClaim.daily}`);
ok(afterClaim.streak === 6, 'claiming day six sets the streak to 6', String(afterClaim.streak));
ok(!afterClaim.owned.includes('prism'), 'and the SEVEN-day prize is not given out on day six',
  afterClaim.owned.join(','));

// ── then a match ends, the way one does ────────────────────────────────────
await p.evaluate(() => {
  document.getElementById('daily')?.classList.remove('show');
  document.getElementById('btnPlay')?.click();
});
await p.waitForTimeout(1200);
await p.evaluate(() => {
  const c = document.querySelector('#worldRow .wCard[data-world="maple"]')
    || document.querySelector('#worldRow .wCard[data-world]');
  c?.click();
});
await p.waitForFunction(() => (window.__matchState?.().clock ?? 999) < 179, null, { timeout: 300000 })
  .catch(() => { });
await p.evaluate(() => window.__rushClock?.(0.3));
await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'),
  null, { timeout: 300000 }).catch(() => { });
await p.waitForTimeout(2000);

const afterMatch = await read();
console.log(`after the match ended: voidStreak=${afterMatch.streak} voidDailyStreak=${afterMatch.daily}`);
console.log(`rank chip reads: ${afterMatch.chip.trim().slice(0, 60)}`);
ok(afterMatch.streak === 6, 'finishing a match on the SAME day does not advance it again',
  `${afterClaim.streak} -> ${afterMatch.streak}`);
ok(afterMatch.streak === afterMatch.daily,
  'and the two counters agree', `voidStreak=${afterMatch.streak} voidDailyStreak=${afterMatch.daily}`);
ok(!afterMatch.owned.includes('prism'),
  'so the 7-day skin is still locked at the end of day six', afterMatch.owned.join(','));

// ── AND THE OTHER ORDER ────────────────────────────────────────────────────
// First launch skips the menu, so a child's very first match ends before they
// have ever seen the daily card. bumpStreak counts that day; the card must then
// AGREE rather than counting it a second time.
const p2 = await b.newPage({ viewport: { width: 420, height: 860 } });
await p2.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p2.addInitScript(() => {
  const yd = new Date(Date.now() - 86400000).toDateString();
  localStorage.clear();
  localStorage.setItem('voidPlayed', '1');
  localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', yd);
  localStorage.setItem('voidDailyDay', '4');
  localStorage.setItem('voidDailyWeek', '1');
  localStorage.setItem('voidDailyStreak', '5');
  localStorage.setItem('voidStreakDay', yd);
  localStorage.setItem('voidStreak', '5');
  localStorage.setItem('voidSkinsOwned', JSON.stringify(['classic', 'ember']));
});
await p2.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p2.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
// dismiss the card WITHOUT claiming, play, then come back to it
await p2.evaluate(() => {
  document.getElementById('daily')?.classList.remove('show');
  document.getElementById('btnPlay')?.click();
});
await p2.waitForTimeout(1200);
await p2.evaluate(() => {
  const c = document.querySelector('#worldRow .wCard[data-world="maple"]')
    || document.querySelector('#worldRow .wCard[data-world]');
  c?.click();
});
await p2.waitForFunction(() => (window.__matchState?.().clock ?? 999) < 179, null, { timeout: 300000 })
  .catch(() => { });
await p2.evaluate(() => window.__rushClock?.(0.3));
await p2.waitForFunction(() => document.getElementById('end')?.classList.contains('show'),
  null, { timeout: 300000 }).catch(() => { });
await p2.waitForTimeout(2000);
const m1 = await p2.evaluate(() => ({
  streak: Number(localStorage.getItem('voidStreak')),
  daily: Number(localStorage.getItem('voidDailyStreak')),
}));
console.log(`\nmatch first, no claim yet: voidStreak=${m1.streak} voidDailyStreak=${m1.daily}`);
ok(m1.streak === 6, 'a match on a fresh day counts the day', String(m1.streak));

// now reload so the daily card rebuilds against the state the match left
await p2.reload({ waitUntil: 'domcontentloaded', timeout: 300000 });
await p2.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p2.waitForSelector('#daily.show', { timeout: 30000 }).catch(() => { });
const card2 = await p2.evaluate(() => document.getElementById('dailyStreak')?.textContent || '');
await p2.evaluate(() => document.getElementById('dailyClaim')?.click());
await p2.waitForTimeout(1500);
const m2 = await p2.evaluate(() => ({
  streak: Number(localStorage.getItem('voidStreak')),
  daily: Number(localStorage.getItem('voidDailyStreak')),
  owned: JSON.parse(localStorage.getItem('voidSkinsOwned') || '[]'),
}));
console.log(`then the card said "${card2.trim()}" and claiming left ${m2.streak}`);
ok(/6 DAY STREAK/i.test(card2), 'the card agrees with the match rather than adding one', card2.trim());
ok(m2.streak === 6 && m2.daily === 6, 'claiming after a match does not count the day twice',
  `voidStreak=${m2.streak} voidDailyStreak=${m2.daily}`);
ok(!m2.owned.includes('prism'), 'and day six still owes nothing', m2.owned.join(','));

if (errs.length) console.log('\nPAGE ERRORS:', errs.slice(0, 4));
await b.close();
console.log(fail.length ? `\nFAIL (${fail.length}): ${fail.join(' | ')}` : '\none streak, counted once');
process.exit(fail.length ? 1 : 0);

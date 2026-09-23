// THE TYPE SYSTEM'S CONTRACT — weights that exist, sizes a child can read.
//
//   node qa/uisystem.mjs [port]                      the four screens
//   node qa/uisystem.mjs [port] [world] --targets    #soloTog + the scrapbook tabs
//   node qa/uisystem.mjs [port] [world] --match      the live-match walk (below)
//
// Fredoka ships 300/400/500/600/700. The CSS used to demand 800 (26x) and
// 900 (83x), and the browser synthesised fake bold from the 700 face —
// differently on every OS, which is part of "not crisp". And 40 declarations
// rendered under 12px, including all four primary nav labels and the shop's
// only call-to-action at 9px. This walks the COMPUTED styles of every visible
// element across the front-of-house screens and fails on:
//   • any font-weight the loaded faces cannot serve (only 400/500/600/700)
//   • any text under 11px (the 12px reading floor allows 11px only for
//     decorative micro-marks; below 11 nothing is defensible)
//
// ── AND THE CHROME SYSTEM, WALKED THROUGH A LIVE MATCH ───────────────────────
// Studio round 4, Job 7 ("One HUD"). index.html writes down a chrome system —
// one .clay class: SOLID fill, a lit top rim, tight shadows, ONE radius scale
// of 12/18/26/999 — and the four chips on screen for every second of every
// match used none of it: four hand-rolled translucent fills, radii of 22, 11,
// 15 and 11px, a live backdrop blur on three of them, and a goal label in the
// body weight beside a 700 value. This probe had walked four screens and none
// of them was a match, so it could not see any of that. Now it also:
//   • opens a LEVEL match (?g=1, so the goal chip exists) and grades #goal,
//     #coins, #growth and #btnQuit: carries .clay, no backdrop-filter, an
//     opaque fill, a radius on the scale, and #goal's label at 600
//   • sweeps every visible element of that match frame for a backdrop-filter,
//     with a banner staged up (the fourth blur was the banner's card, which
//     is only on screen for 2.4 s at a time)
//   • reads the three buttons the job gave a 44px floor — the scrapbook's
//     world tabs, #soloTog on the picker, MY NUMBERS on a level's results
//     card — for rendered height and for a Fredoka family, because a <button>
//     that forgets `font-family: inherit` draws in the platform's face
//
// ── THREE PARTS, AND ONLY ONE OF THEM HAS EVER RUN ───────────────────────────
// With no flag this walks the four screens and nothing else: the probe as it
// stood from aadebff to ea6b384, which the push gate has run (32 s in its run
// of 2026-09-23 10:54). That walk reads computed font-weight and font-size of
// every element that carries text, and skips one only on a zero-sized rect,
// display:none or visibility:hidden — never on opacity — so modalIn's
// opacity-0 first keyframe does not hide the three sheets that now arrive on
// it from this walk.
//
// --targets reads #soloTog on the picker and the scrapbook's world tabs, each
// in its own page opened from the same front door. --match walks the live
// match: the four chips, the blur sweep and MY NUMBERS on the results card.
// Both were written while a browser gate held this machine and NEITHER HAS
// BEEN RUN — not the targets, not the match walk, not the arrival-finishing
// that both depend on (qa/_atrest.mjs). So qa/gate.mjs registers each as its
// own step (`uisystem-targets`, `uisystem-match`) in live and quality only,
// and the push step `uisystem` runs this file with no flag.
import { chromium } from 'playwright';
import { settle, describeRest } from './_atrest.mjs';

process.on('uncaughtException', (e) => {
  console.log(`\nFAIL — uisystem threw: ${String(e && e.message || e).split('\n')[0]}`); process.exit(1); });
process.on('unhandledRejection', (e) => {
  console.log(`\nFAIL — uisystem rejected: ${String(e && e.message || e).split('\n')[0]}`); process.exit(1); });

const POS = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const PORT = POS[0] || '4177';
const WORLD = POS[1] || 'maple';
const MATCH = process.argv.includes('--match');
const TARGETS = process.argv.includes('--targets');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const fails = [];

// ── A BUTTON IS A TARGET, AND IT IS SET IN OUR FACE ─────────────────────────
// Rendered height (44 is Apple's floor, and the one this sheet already holds
// #btnHome, .goShop, #btnRestore, #pauseQuit and .gateCancel to) and computed
// family. A door that does not lead to its screen is a FAIL, and so is a
// selector that matches nothing once the door is open — both would otherwise
// pass on absence.
//
// FINISH THE ARRIVAL, DO NOT MEASURE IT. #worlds and #profile arrive on
// modalIn, whose first keyframe is scale(0.94), and a rect includes every
// ancestor's transform: a 44px button read on that frame would come out at
// 44 x 0.94 = 41.4px. CSS animation time only advances on a rendered frame,
// and qa/navtap.mjs traced this box drawing the island about once every 2.5 s,
// with its pips still at t=0 1.2 s after they started — so a 600 ms wait is no
// promise of getting past the first keyframe. settle() (qa/_atrest.mjs)
// finishes every finite animation on the target, its subtree and its
// ancestors first, the way navtap does it, and says how many it finished.
// Rendered height is still the reading, so a transform in the resting state
// still counts.
const targets = async (pg, where, sel) => {
  const rest = await settle(pg, sel);
  console.log(`  ${where.padEnd(9)} arrival: ${describeRest(rest)}`);
  // a finite animation still running after settle() means the height below
  // would be read mid-flight, so it is not read
  if (rest.left) {
    console.log(`  ${where.padEnd(9)} BAD: ${sel} still animating after its arrival was finished — nothing was measured`);
    fails.push(`${where}: ${sel} not at rest`);
    return;
  }
  const got = await pg.evaluate((s) => [...document.querySelectorAll(s)]
    .filter((e) => e.getClientRects().length)
    .map((e) => ({ h: e.getBoundingClientRect().height, fam: getComputedStyle(e).fontFamily,
      t: (e.textContent || '').trim().slice(0, 18) })), sel);
  if (!got.length) {
    console.log(`  ${where.padEnd(9)} BAD: ${sel} is not on screen — nothing was measured`);
    fails.push(`${where}: ${sel} absent`);
    return;
  }
  const bad = [];
  for (const g of got) {
    if (g.h < 43.5) bad.push(`${sel} "${g.t}" ${g.h.toFixed(1)}px tall`);
    if (!/^\s*"?Fredoka/i.test(g.fam)) bad.push(`${sel} "${g.t}" set in ${g.fam.split(',')[0]}`);
  }
  console.log(`  ${where.padEnd(9)} ${bad.length ? 'BAD: ' + [...new Set(bad)].slice(0, 6).join(', ')
    : `ok (${got.length}× ${sel}, ${Math.min(...got.map((g) => g.h)).toFixed(1)}px or taller, Fredoka)`}`);
  [...new Set(bad)].forEach((x) => fails.push(`${where}: ${x}`));
};

if (!MATCH && !TARGETS) {
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidMute', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
  localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
} catch { /* private mode */ } });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show')
  .forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));

// ── THE DOOR HAS TO STILL BE THERE ─────────────────────────────────────────
// 'picker' opened with `#btnPlay.click()`, and #btnPlay stopped opening the
// picker when it became startFresh(false) — it launches the dot the ring is on.
// So this walked no picker at all, found nothing wrong with it, and printed
// "picker ok" on every run. Worse, the click STARTS A MATCH, so 'shop' and
// 'settings' were then measured over a live match rather than over the menu:
// three of four screens in the wrong state, all four reported clean.
//
// The same dead door timed out qa/personsheet.mjs at 77s and cost the studio
// its entire character sheet. That one failed loudly. This one did not, which
// is the more expensive way to be wrong.
//
// So each screen now names the element that PROVES it is open, and a door that
// does not lead there is a FAIL rather than a quiet pass.
const SCREENS = [
  ['menu', null, '#menuLadder'],
  ['picker', () => document.getElementById('worldSwitch')?.click(), '#worlds.show'],
  ['shop', () => { document.getElementById('worlds')?.classList.remove('show'); document.getElementById('btnShop')?.click(); }, '#shop.show'],
  ['settings', () => { document.getElementById('shop')?.classList.remove('show'); document.getElementById('btnSettings')?.click(); }, '#settings.show'],
];
for (const [name, open, proof] of SCREENS) {
  if (open) { await p.evaluate(open); await p.waitForTimeout(600); }
  const there = await p.evaluate((sel) => !!document.querySelector(sel), proof);
  if (!there) {
    console.log(`  ${name.padEnd(9)} BAD: the door did not open — ${proof} is not in the document, so nothing on this screen was measured`);
    fails.push(`${name}: door`);
    continue;
  }
  const bad = await p.evaluate(() => {
    const out = [];
    const ok = new Set(['400', '500', '600', '700']);
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!hasText) continue;
      const w = cs.fontWeight, fs = parseFloat(cs.fontSize);
      const id = el.id ? '#' + el.id : el.className && typeof el.className === 'string'
        ? '.' + el.className.split(' ')[0] : el.tagName.toLowerCase();
      if (!ok.has(w)) out.push(`${id} weight ${w}`);
      if (fs < 11) out.push(`${id} ${fs}px`);
    }
    return [...new Set(out)].slice(0, 12);
  });
  console.log(`  ${name.padEnd(9)} ${bad.length ? 'BAD: ' + bad.join(', ') : 'ok'}`);
  bad.forEach((x) => fails.push(`${name}: ${x}`));
}
} // end of the four-screen walk (no flag); b.close() below closes its page, as it did at ea6b384

// ── THE FRONT DOOR'S TWO 44px TARGETS (--targets, NOT YET RUN) ──────────────
// Own page, same seed as the four-screen walk, so a failure here cannot be an
// artefact of whatever that walk left open.
if (TARGETS) {
  const t = await b.newPage({ viewport: { width: 430, height: 932 } });
  await t.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await t.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidMute', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
    localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
  } catch { /* private mode */ } });
  await t.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await t.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await t.evaluate(() => document.querySelectorAll('.show')
    .forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await t.evaluate(() => document.getElementById('worldSwitch')?.click());
  await t.waitForTimeout(600);
  if (await t.evaluate(() => !!document.querySelector('#worlds.show'))) await targets(t, 'picker', '#soloTog');
  else { console.log('  picker    BAD: the door did not open #worlds'); fails.push('picker: door (targets)'); }
  await t.evaluate(() => { document.getElementById('worlds')?.classList.remove('show');
    document.getElementById('btnBook')?.click(); });
  await t.waitForTimeout(600);
  if (await t.evaluate(() => !!document.querySelector('#profile.show #book.show'))) await targets(t, 'scrapbook', '.bkTabs button');
  else { console.log('  scrapbook BAD: the door did not open MY VOID on its stickers pane'); fails.push('scrapbook: door'); }
  await t.close();
}

// ── THE FOUR CHIPS, IN A LIVE MATCH ──────────────────────────────────────────
// A LEVEL match, because the goal chip is hidden on every match nobody chose a
// dot for (index.html #goal[hidden]) and a probe that grades an absent chip
// passes it. `?len=` makes a harness match start on its own.
if (MATCH) {
  const m = await b.newPage({ viewport: { width: 430, height: 932 } });
  await m.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await m.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidMute', '1'); localStorage.setItem('voidFirstNom', '1');
    // addCoins() hides a ZERO wallet on purpose; a chip that is not drawn cannot be graded
    localStorage.setItem('voidCoins', '500');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
  } catch { /* private mode */ } });
  await m.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}&g=1&len=60`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await m.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await m.evaluate(() => document.querySelectorAll('.show')
    .forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await m.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3
    && !document.getElementById('goal')?.hidden, null, { timeout: 600000 });
  // the banner's card carried the fourth blur, and it is only up for 2.4 s at a
  // time — stage one, held still, so the sweep below can see whether it blurs
  await m.evaluate(() => {
    const ban = document.getElementById('banner');
    if (!ban) return;
    ban.innerHTML = '<div class="bCard"><span class="bTx">KICKOFF!</span></div>';
    ban.classList.add('show'); ban.style.animation = 'none'; ban.style.opacity = '1';
  });
  const chips = await m.evaluate(() => {
    const SCALE = [12, 18, 26];
    const out = {};
    for (const id of ['goal', 'coins', 'growth', 'btnQuit']) {
      const e = document.getElementById(id);
      if (!e || !e.getClientRects().length) { out[id] = ['not on screen — nothing to grade']; continue; }
      const cs = getComputedStyle(e);
      const probs = [];
      if (!e.classList.contains('clay')) probs.push('not .clay');
      if (cs.backdropFilter && cs.backdropFilter !== 'none') probs.push(`backdrop-filter ${cs.backdropFilter}`);
      const a = /rgba\([^)]*,\s*([\d.]+)\)/.exec(cs.backgroundColor);
      const alpha = cs.backgroundColor === 'transparent' ? 0 : a ? +a[1] : 1;
      if (cs.backgroundImage !== 'none') probs.push('a gradient fill');
      else if (alpha < 1) probs.push(`a ${Math.round(alpha * 100)}% fill`);
      const rad = parseFloat(cs.borderTopLeftRadius);
      if (!SCALE.includes(rad) && rad < 999) probs.push(`radius ${rad}px (scale is 12/18/26/999)`);
      if (id === 'goal') {
        const w = getComputedStyle(e.querySelector('.gLabel') || e).fontWeight;
        if (w !== '600') probs.push(`label weight ${w}`);
      }
      out[id] = probs;
    }
    return out;
  });
  const failing = Object.entries(chips).filter(([, v]) => v.length);
  for (const [id, v] of Object.entries(chips)) console.log(`  #${id.padEnd(8)} ${v.length ? 'BAD: ' + v.join(', ') : 'ok — .clay, solid, no blur, radius on the scale'}`);
  console.log(`  chips     ${failing.length ? `BAD: ${failing.length} of 4 HUD chips off the chrome system` : 'ok — all 4 HUD chips on the chrome system'}`);
  failing.forEach(([id, v]) => fails.push(`#${id}: ${v.join(', ')}`));

  const blurs = await m.evaluate(() => {
    const out = [];
    for (const e of document.querySelectorAll('body *')) {
      if (!e.getClientRects().length) continue;
      const cs = getComputedStyle(e);
      if (!cs.backdropFilter || cs.backdropFilter === 'none' || cs.visibility !== 'visible') continue;
      let op = 1;
      for (let a2 = e; a2 && a2 !== document.documentElement; a2 = a2.parentElement) op *= +getComputedStyle(a2).opacity;
      if (op < 0.02) continue;
      out.push(`${e.id ? '#' + e.id : '.' + String(e.className).split(' ')[0]} ${cs.backdropFilter}`);
    }
    return out;
  });
  console.log(`  blur      ${blurs.length ? `BAD: ${blurs.length} backdrop blur(s) over the match frame — ${blurs.join(', ')}` : 'ok — no backdrop blur over the match frame (banner staged)'}`);
  blurs.forEach((x) => fails.push(`match: ${x}`));

  // ── and MY NUMBERS, on this level's results card ──────────────────────────
  const eat = await m.evaluate(() => window.__levelSpec?.().eat);
  if (!eat) { console.log('  endcard   BAD: this build has no __levelSpec — cannot open the card'); fails.push('endcard: door'); }
  else {
    await m.evaluate((e) => window.__setScore(e + 1), eat);
    await m.waitForFunction(() => document.getElementById('end')?.classList.contains('show'), null, { timeout: 900000, polling: 250 });
    const t0 = await m.evaluate(() => window.__matchState().tClock);
    await m.waitForFunction((t) => window.__matchState().tClock > t + 1, t0, { timeout: 600000, polling: 250 });
    await targets(m, 'endcard', '#endMore');
  }
  await m.close();
}
await b.close();
// the no-flag verdict is ea6b384's line, word for word
if (!MATCH && !TARGETS) console.log('\n  ' + (fails.length ? `FAIL — ${fails.length} violations` : 'PASS — every weight is a real face, every size is readable') + '\n');
else console.log('\n  ' + (fails.length ? `FAIL — ${fails.length} violations (${[TARGETS && 'front-door targets', MATCH && 'live match'].filter(Boolean).join(' + ')})`
  : 'PASS — ' + [TARGETS && '#soloTog and the scrapbook tabs are 44px targets set in our face',
    MATCH && 'the four HUD chips are one system, no backdrop blur over the match, MY NUMBERS is a 44px target in our face']
    .filter(Boolean).join('; ')) + '\n');
process.exit(fails.length ? 1 : 0);

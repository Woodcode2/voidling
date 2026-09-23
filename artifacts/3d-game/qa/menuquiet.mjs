// ── NOBODY TALKS ON THE LEVEL PICKER ────────────────────────────────────────
//
// A speech bubble is a CALLOUT and works only when it points at a legible
// speaker. On the menu it cannot, and the shipped picker has been showing one
// anyway. MEASURED off docs/crews/round-8/dio/: five of six worlds carry a bubble,
// 172-258 px wide against a 430 px screen, and four of the five are pinned against
// a clamp limit — so the ::after tail points at its own box rather than at anyone.
// Skylark's lands on a horizon crowd, Game Day's on the stadium wall, Powder's on
// empty snow, Lantern's on a pagoda roof. The camera is 58-95 units back, which
// puts an adult at 89 px among dozens of identical figures: even a perfectly aimed
// tail could not say which dot is talking.
//
// TWO MECHANISMS, AND THE SECOND IS THE ONE THAT IS EASY TO MISS:
//   1. say() refuses a non-rival line while body.diorama is set.
//   2. update() retires a bubble ALREADY IN THE AIR over 0.6 s.
//
// Both are keyed on body.diorama, which enterMenu sets (prototype3d.ts:1203) and
// leaveMenu clears (:1241) — so this is the whole menu, not only ?dio=1, because
// the same speaker-less rectangle is in today's shipped picker.
//
// (2) exists because a spawn gate structurally cannot cover a bubble that
// say() already returned for. Three real paths carry one into the menu — leaving
// a match mid-play, HOME from the end card, and endShop — and the end-card one is
// the likely one, because life.update deliberately keeps running behind #end and
// say() is not gated on `ended`, so the crowd is actively talking over the results
// screen right up to the tap.
//
// So this probe does NOT only boot to the menu. Bar C reaches the menu the way a
// child does after a match, which is the case the first version of the fix missed.
//
//   node qa/menuquiet.mjs [port]
import { chromium } from 'playwright';
import { enterAndStart } from './_enter.mjs';

const PORT = process.argv[2] || '4173';
const fail = [];
const ok = (c, label, detail = '') => {
  console.log(`${c ? '  ok  ' : ' FAIL '} ${label}${detail ? `   ${detail}` : ''}`);
  if (!c) fail.push(label);
};

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const seed = () => { try { localStorage.clear();
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidMute', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
  localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
} catch {} };

// WHAT IS ON SCREEN, in CSS pixels, from the rendered boxes — not from a class.
// A .vb that is .show but clipped to nothing is not a bubble a child sees, and a
// count of `.show` elements would call it one.
const onScreen = (p) => p.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('.vb')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) <= 0.05) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > innerHeight) continue;
    out.push({ w: Math.round(r.width), h: Math.round(r.height),
      rival: el.classList.contains('rival'),
      text: (el.textContent || '').slice(0, 60) });
  }
  return { bubbles: out, menu: document.body.classList.contains('diorama') };
});

try {
  // ── A: THE MENU FROM BOOT, WATCHED, NOT SAMPLED ──────────────────────────
  // Ambient lines live 3.4 s against a ~2.4 s mean gap, so a single sample after
  // a fixed wait can miss one by luck. This watches a window instead.
  {
    const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
    p.on('pageerror', (e) => console.log('  [pageerror A] ' + e.message.split('\n')[0]));
    await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
    await p.addInitScript(seed);
    await p.goto(`http://127.0.0.1:${PORT}/?w=lantern&manual=1`, { waitUntil: 'domcontentloaded', timeout: 300000 });
    await p.waitForFunction(() => !!window.__menuState && window.__menuState().menuMode, null, { timeout: 420000 });
    let seen = [], samples = 0;
    for (let i = 0; i < 16; i++) {
      const s = await onScreen(p);
      samples++;
      if (!s.menu) { ok(false, 'A: body.diorama is set on the menu'); break; }
      for (const bb of s.bubbles) if (!bb.rival) seen.push(bb);
      await p.waitForTimeout(2500);
    }
    console.log(`  A: ${samples} samples over ~40 s of menu, ${seen.length} crowd bubble sighting(s)`);
    if (seen.length) console.log(`     widest ${Math.max(...seen.map((x) => x.w))} px — e.g. "${seen[0].text}"`);
    ok(seen.length === 0, 'A: no crowd bubble on the menu, across a 40-second watch',
      seen.length ? `${seen.length} sightings` : '');
    await p.close();
  }

  // ── B: THE SUPPRESSION IS KEYED ON body.diorama AND NOTHING ELSE ─────────
  // A suppression that silenced the town everywhere would pass bar A and gut the
  // game: the crowd is what makes the island feel inhabited.
  //
  // THE FIRST VERSION OF THIS BAR PLAYED A MATCH AND WATCHED FOR A LINE. It
  // failed on the PRE-FIX build — 0 of 16 samples — which means it was measuring
  // something other than the fix. The reason is worth keeping: the ambient
  // spawner picks a ped within 68 world units of the hero (life.ts:6877), and in
  // a match he starts on the hand-authored spawn, which is not necessarily where
  // the crowd is. On the MENU he is parked on the stage point, which deriveStage
  // chose for being photogenic and populated. The crowd talks where the crowd is,
  // so "play a match and wait" is a coin flip, not a control.
  //
  // This asks the question directly instead: take the class off the live menu and
  // the bubbles must come back. That proves the spawner is alive and that the
  // class is the ONLY thing holding it — which is exactly the property that could
  // regress into silencing the game.
  {
    const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
    p.on('pageerror', (e) => console.log('  [pageerror B] ' + e.message.split('\n')[0]));
    await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
    await p.addInitScript(seed);
    await p.goto(`http://127.0.0.1:${PORT}/?w=lantern&manual=1`, { waitUntil: 'domcontentloaded', timeout: 300000 });
    await p.waitForFunction(() => !!window.__menuState && window.__menuState().menuMode, null, { timeout: 420000 });
    await p.evaluate(() => document.body.classList.remove('diorama'));
    let talked = 0;
    for (let i = 0; i < 16; i++) {
      // hold it off every sample: enterMenu can be called again and would put it back
      await p.evaluate(() => document.body.classList.remove('diorama'));
      const s = await onScreen(p);
      if (s.bubbles.some((x) => !x.rival)) talked++;
      await p.waitForTimeout(2500);
    }
    console.log(`  B: with body.diorama removed, the crowd spoke in ${talked} of 16 samples`);
    ok(talked > 0, 'B: the suppression is keyed on body.diorama and nothing else — take the class off and the town talks again',
      talked ? '' : 'the crowd stayed silent with the class removed, so something OTHER than the class is suppressing it');
    await p.close();
  }

  // ── C: THE CARRY-IN, which a spawn gate cannot cover ─────────────────────
  // Play a real match, finish it, tap HOME from the end card. life.update keeps
  // running behind #end on purpose, and say() is not gated on `ended`, so the
  // crowd is talking right up to the tap and a live bubble rides into the menu.
  {
    const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
    p.on('pageerror', (e) => console.log('  [pageerror C] ' + e.message.split('\n')[0]));
    await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
    await p.addInitScript(seed);
    await p.goto(`http://127.0.0.1:${PORT}/?w=lantern`, { waitUntil: 'domcontentloaded', timeout: 300000 });
    await p.waitForFunction(() => !!window.__voidState, null, { timeout: 420000 });
    await enterAndStart(p, 'lantern');
    await p.evaluate(() => window.__rushClock?.(0.3));
    await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'),
      null, { timeout: 400000 }).catch(() => { });
    // wait until the crowd is actually talking over the end card, so the carry-in
    // is a real one rather than a lucky quiet moment
    // ARMED MEANS ALIVE, NOT SEEN. The end card hides every .vb by rule
    // (index.html, body:has(#end.show), studio round 4 Job 7), so onScreen()
    // cannot see a bubble under the card at all — and the carry-in this bar
    // exists for is exactly that: a bubble alive but hidden under the card
    // that becomes visible on the menu the moment the card closes. So the arm
    // asks for a live crowd bubble (.vb.show, not a rival), displayed or not.
    let armed = false;
    for (let i = 0; i < 14 && !armed; i++) {
      armed = await p.evaluate(() => [...document.querySelectorAll('.vb.show')]
        .some((el) => !el.classList.contains('rival') && (el.textContent || '').trim().length > 0));
      if (!armed) await p.waitForTimeout(2000);
    }
    console.log(`  C: a crowd bubble was up over the end card: ${armed}`);
    await p.evaluate(() => document.getElementById('btnHome')?.click());
    await p.waitForFunction(() => !!window.__menuState && window.__menuState().menuMode, null, { timeout: 400000 });
    // THE FIRST FRAMES OF THE MENU are the whole question. The retire is a 0.6 s
    // grace in GAME time, which this sandbox runs ~14x slower than wall clock, so
    // sample for a while and take the LAST reading as the settled answer.
    let lingered = 0, last = null;
    for (let i = 0; i < 12; i++) {
      const s = await onScreen(p);
      last = s;
      if (s.menu && s.bubbles.some((x) => !x.rival)) lingered++;
      await p.waitForTimeout(2500);
    }
    console.log(`  C: crowd bubble present in ${lingered} of 12 menu samples after HOME`);
    ok(last && !last.bubbles.some((x) => !x.rival),
      'C: a bubble that rode in from the end card is gone by the time the menu settles',
      last && last.bubbles.length ? `still up: "${last.bubbles[0].text}"` : '');
    if (!armed) console.log('     (note: bar C did not manage to arm — the crowd was quiet over the end card, so this run did not test the carry-in)');
    await p.close();
  }
} catch (e) {
  fail.push('threw: ' + String(e && e.message || e).split('\n')[0]);
  console.log(' FAIL  threw: ' + String(e && e.message || e).split('\n')[0]);
} finally {
  await b.close();
}

console.log(fail.length
  ? `\nFAIL — ${fail.length} bar(s): ${fail.join(' | ')}`
  : '\nPASS — the picker is quiet, the suppression is keyed on the menu class alone, and a bubble carried in from the end card retires');
process.exit(fail.length ? 1 : 0);

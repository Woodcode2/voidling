// HOW A PROBE GETS INTO A MATCH. One place, because there are 339 of them.
//
// THE OLD RITUAL, written into every probe in this directory by hand:
//
//     await p.click('#btnPlay'); await p.waitForTimeout(1400);
//     await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
//
// PLAY opened the world picker; the card started the match. From day 7 PLAY
// PLAYS — it launches the dot the ring is on, on the world already built,
// because a child who taps PLAY has asked to play and being handed another
// screen to choose on is the seam the owner asked us to close. The picker is
// still there, behind the world's name.
//
// That makes the second click land on a card inside a closed overlay, and
// Playwright waits thirty seconds for something invisible and then throws. The
// gate caught it exactly as MENU-BRIEF §6 day 11 predicted it would: "sed
// migration of the ~110 two-click probes" (there are 339).
//
// So: one helper, and it handles BOTH cases, because the two are genuinely
// different intentions that the old ritual happened to spell the same way.
//
//   SAME WORLD   — the overwhelming majority. The probe passes ?w=<world> and
//                  then picks that same world out of the picker, which was
//                  always a no-op dressed as a choice. One tap on PLAY.
//   OTHER WORLD  — a real world switch, which reloads the page. Those probes
//                  are testing the switch, so they keep the picker; it is
//                  opened directly rather than through a button that no longer
//                  opens it.
//
// Nothing here knows about levels. PLAY launches current(world), which on a
// fresh profile is dot 1 — the same match every one of these probes has always
// measured.
//
//   import { enterMatch } from './_enter.mjs';
//   await enterMatch(p, WORLD);

/** Dismiss the two cards that can sit over the menu and eat the tap. Every
 *  probe that ever got this wrong lost its first click to the daily card. */
const clearOverlays = async (p) => {
  await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show');
  })).catch(() => { });
};

/**
 * Start a match from the menu.
 *
 * @param p      the Playwright page, already booted (`__voidState` present)
 * @param world  the world the probe wants; omit for "whatever is built"
 */
export async function enterMatch(p, world) {
  await clearOverlays(p);
  // which world is actually built? __menuState is day 8's; the fallbacks keep
  // this working on an older build and on a page that never reached the menu.
  const built = await p.evaluate(() => {
    try {
      if (window.__menuState) return window.__menuState().world;
      return new URLSearchParams(location.search).get('w') || null;
    } catch { return null; }
  }).catch(() => null);

  if (world && built && world !== built) {
    // A REAL SWITCH. The card reloads the page with voidWorld + voidAutoPlay,
    // so the caller's next wait is on the NEW document — same as it always was.
    await p.evaluate(() => document.getElementById('worlds')?.classList.add('show'));
    await p.click(`#worldRow .wCard[data-world="${world}"]`);
    return 'switch';
  }
  await p.click('#btnPlay');
  return 'play';
}

/** The same thing, plus the wait every caller did next anyway: match time has
 *  started moving. Kept separate so a probe that wants the ARMED idle (the goal
 *  card, the ghost hand, ?manual=1) can still have it. */
export async function enterAndStart(p, world, timeout = 400000) {
  const how = await enterMatch(p, world);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout })
    .catch(() => { });
  return how;
}

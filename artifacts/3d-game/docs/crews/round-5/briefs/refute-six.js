export const meta = {
  name: 'refute-six',
  description: 'Six independent skeptics attack the six landings the governor verified alone on 2026-09-01',
  phases: [{ title: 'Refute', detail: 'one adversary per landing, in parallel' }],
}

const DIR = '/home/user/voidling/artifacts/3d-game'

const FACTS = `
ENVIRONMENT — read before touching anything:
- Repo: ${DIR}. Build ONLY with: cd ${DIR} && npm run build (never from the
  repo root). Typecheck: npx tsc --noEmit. A preview serves dist/ on :4177 —
  do not start another, do not kill it; npm run build refreshes what it serves.
- THE MEASUREMENT TRAP: three@0.185.1 forces NoToneMapping into a
  WebGLRenderTarget. A probe that renders its own frame sees NO ACES, NO
  exposure, no sRGB encode. For anything about how it LOOKS, screenshot the
  canvas.
- The match clock under swiftshader runs 14-40x slower than wall. Sample on
  window.__matchState().t, never wall time.
- mrnd/mr/mpick/mchance are ONE mulberry32 stream, Maple only.
- Never run a probe while another heavy browser job is running on this box —
  the GPU process fails to launch under contention and reports failures that
  are not real. Check \`cat /proc/loadavg\` and \`pgrep -c chromium\` first; if
  load is above 4, wait.
- qa/lookpair.mjs takes SEED=<n> so two builds of a Math.random world compare.
- READ FIRST: docs/GOVERNOR.md (standing rules, ledger, retractions, HANDS OFF)
  and docs/OWNER-2026-08-29.md (his words). Rule 3: every number you write is
  one you ran. Rule 2: a fix without a probe that FAILS before it is unproven.

YOUR POSTURE: you are the SKEPTIC. The governor landed this change alone
because the agent limit closed, and wrote in the commit that your refutation is
owed. Your job is to KILL it if it deserves to die. Read the commit's diff
(git show <sha>) and the real files on disk, not the commit message's account
of them. A verdict that trusts the message is not a verdict.

INCREMENTAL RECORD — the previous launch of this round lost fifteen agents to
the account session limit with NOTHING on disk, because every crew planned to
write its file at the end. So: create your output file in MAIN (the path
above) within your first ten minutes, headed "# DRAFT — in progress (<key>)"
with the required sections as empty headings, and APPEND to it every time you
finish a measurement, a shot or a finding — numbers and commands as you get
them, not at the end. Replace the DRAFT header with the final one only when
you are done. If you are cut off, what is on disk is the record; a plan in
your head is not.

Verdicts: SOUND (you tried to kill it and failed — say what you tried),
SOUND WITH CORRECTIONS (each correction verbatim and mechanically applicable),
or KILLED (the specific fact, with the command or file:line that proves it).
Do NOT edit tracked files. You may build, run probes, and shoot frames.
Write exactly one file, named in your task.`

const VERDICT = {
  type: 'object',
  properties: {
    verdict: { type: 'string' },
    killShots: { type: 'array', items: { type: 'string' } },
    corrections: { type: 'array', items: { type: 'string' } },
    ranProbes: { type: 'string', description: 'which probes you actually ran and what they printed' },
    summary: { type: 'string' },
  },
  required: ['verdict', 'killShots', 'corrections', 'ranProbes', 'summary'],
}

phase('Refute')

// family: verdict complete on disk (SOUND WITH CORRECTIONS, 04:15 UTC) — its agent died at the
// session limit AFTER writing, so it is dropped here rather than re-run.
const jobs = [
  {
    key: 'drum', sha: '702a3e4',
    brief: `THE LANDING: src/proto3d/audio3d.ts — the owner's "drum that was fixed
is back" on Lantern. The commit claims it was NEVER fixed: every big swallow
ran \`if (sample('eaten_deep.wav', 0.55)) return;\` — a 79KB recorded thud —
and returned before the whoosh could play, while the comment above it claimed
the file was "absent". Fix: the sample call removed, prewarm lists trimmed, and
a recordingLive() predicate (themeCh.srcs.length > 0 || menuCh.srcs.length > 0)
that makes taiko() and bDrum() return early when dest === master and a
recording is playing. pwDrum was deliberately NOT gated (it routes only to
pwBus, a fallback-score bus).

KILL IT ON:
1. IS recordingLive() EVER TRUE ON THE REAL PATH? Instrument a live Lantern
   match: does themeCh.srcs actually hold a source while the recording plays,
   and is it emptied when it stops? If srcs is managed differently than the
   predicate assumes, the gate never fires and the stings still play — or
   worse, fires when it should not and silences a sting during the 404
   fallback score. Read mkChan, playTrack, releaseBuf and the era guards.
2. THE WHOOSH. With the sample gone, does the noise() whoosh at the swallow
   site actually SOUND — is it audible, is it the right thing, or is a big
   swallow now silent? Instrument the audio graph: count nodes created on a
   big eat before and after.
3. WHAT ELSE USED eaten_deep.wav. The commit trimmed two prewarm lists. Is
   there a third reader (a sample() call by a different name, a preload
   manifest, a service-worker cache list)?
4. THE OWNER SAID "DRUM OVERLAPPING WITH THE MUSIC". Was the swallow sample
   actually the drum he heard, or was it the taiko stings, or the 404 fallback
   score? The commit asserts the sample; the crew's proposal
   (docs/crews/round-4/lantern-drum.proposal.md) measured it — verify their
   measurement rather than inheriting it, and say which of the three sources
   you can prove was audible on a Lantern match with the recording playing.
5. The probe the crew specified, qa/drumover.mjs, was NOT written. Write it
   (as a proposal in your verdict, not a landed file) so the third return of
   this drum would be caught.`,
  },
  {
    key: 'popup', sha: 'e39e3e0',
    brief: `THE LANDING: the "DRAG TO MOVE" #tut modal deleted — markup, every #tut
and #btnGotIt style, the launchWorld() branch that showed it, the button
handler, the tutEl binding, 'tut' from OVERLAYS, the voidTut write in the
debug bypass. The commit claims the modal fired for EVERY child at session two
because only its own button ever wrote voidTut, and that its early return was
the second door into the unexitable-app bug (it skipped withWorldReady(), the
only thing that releases a 'pack' cover hold).

KILL IT ON:
1. THE COVER HOLD. The deleted branch contained coverRelease('pack') — a patch
   with a twenty-line comment explaining a frozen-at-100% loading screen. With
   the branch gone, launchWorld() falls straight to
   withWorldReady(() => startFresh(soloOn())). Trace the world-switch path
   (the voidAutoPlay block at the bottom of prototype3d.ts) and PROVE the
   'pack' hold is still released on every path. qa/tutstrand.mjs exists for
   exactly this journey — RUN IT. If it fails or hangs, this is a kill.
2. SESSION TWO, END TO END. Seed a profile with voidPlayed=1 and no voidTut,
   pick a world from the menu, and confirm the match actually starts with no
   modal, no frozen cover, and the hand teaching on Maple. Do it on Maple AND
   on a second world.
3. ORPHANS. grep src/ and index.html for tut, tutEl, btnGotIt, voidTut,
   .tTitle, .tBody, .tEmoji, .tHand. Any live reference to a deleted element
   is a runtime error waiting for the right branch.
4. THE SHARED SELECTOR. \`#hand svg, #tut .tHand svg { ... }\` was split so the
   #hand half survived. Confirm #hand still renders its SVG with the right
   size and drop-shadow — shoot the hand on a fresh profile.
5. OVERLAYS. 'tut' was removed from the OVERLAYS list. Read what OVERLAYS does
   (hide-on-menu? escape-key? pause?) and confirm nothing indexes it by
   position.`,
  },
  {
    key: 'hand', sha: 'a4f5bf6',
    brief: `THE LANDING: the figure-8 ghost hand now runs on Maple every time. The
commit claims the hand hung off firstRun (= !voidPlayed, written at match
START, so it died one second into the first match ever played), that flipping
firstRun alone would NOT work because the hand also needed !nomArmed (which
starts TRUE for a returning player), and that three new flags — teachDrag,
dragDone, controlsLive — separate what firstRun was doing at once. Probe
qa/mapleteach.mjs: fails before (hand absent with history), passes after (hand
shown on Maple, gone after a drag, absent on Pirate).

KILL IT ON:
1. THE HAND THAT NEVER LEAVES. Find a path where teachDrag is true and dragDone
   never becomes true: a child who taps without dragging, who uses the joystick
   below joy.mag 0.25, who pauses, who quits to menu and returns, who lets the
   intro run out. Does the hand sit on screen for the whole match? Run it.
2. THE HAND DURING THE INTRO. controlsLive is set when introT <= 0. Confirm the
   hand does NOT appear during the establishing shot, when a drag would move
   nothing — the commit says that was the whole point of controlsLive.
3. THE FIRST-RUN LADDER IS INTACT. The welcome banners, the DRAG pill, the
   FIRST NOM party and the danger beats must still fire on a genuinely fresh
   profile and must NOT fire on Maple for a returning child. Test both
   profiles. A regression here is the "permanent tutorial" the commit says it
   avoided.
4. THE PROBE'S HONESTY. Read qa/mapleteach.mjs. It waits for t > 5 then checks
   the hand, then drags, then waits for t > 7. Is 5 match-seconds always past
   Maple's introLen (2.2s)? Does the drag it synthesises actually clear
   joy.mag 0.25 on the real pointer handler? If the probe would pass on a
   build where the hand shows but never leaves, its second half is decoration.
5. pickedWorld === 'maple' is evaluated at module scope. Confirm a world switch
   is a full reload so that is stable — and note what breaks the day it is not.`,
  },
  {
    key: 'board', sha: '592e9a3',
    brief: `THE LANDING: the top-left scoreboard (#board) removed — markup, six CSS
rules, the menu-hide selector, the render block, the paint cache, the boardEl
binding, the solo toggle, and the ⚡ chaser marker that existed only to be drawn
on it. The clock re-centred (left:42vw -> left:0). qa/solotog.mjs's two
leaderboard assertions cut. The commit records the crew's measurement that
size does NOT track score (player's rank read off size wrong in 99.7% of
frames) and DELIBERATELY keeps \`rows\` and \`myRank\` alive for the rival's
brag bubble.

KILL IT ON:
1. WHAT STILL READS #board. grep src/, index.html and qa/ for 'board' — every
   probe, every selector, every getElementById. The commit says seven probes
   degrade silently via if(!el)continue or querySelectorAll; verify each one
   actually does, by reading it. Run qa/solotog.mjs and qa/uisystem.mjs.
2. THE CLOCK. It moved from a 42vw lane to full width. Shoot a match frame
   with the HUD up and confirm the timer is centred, does not overlap #coins
   or #btnQuit on the right, and clears the safe-area inset on a notched
   viewport (the probe viewport is 430x932).
3. THE ⚡ MARKER. It was removed from the rows' name field and three
   .replace('⚡ ','') guards were deleted. Confirm no other reader expected
   the prefix (the brag bubble, the end screen, telemetry names).
4. THE END SCREEN. The owner said "at the end we can reflect scores". Does the
   end screen ALREADY show every joined void's score and rank, or did this
   removal leave scores shown nowhere at all? Shoot the end screen.
5. THE MEASUREMENT ITSELF. The 99.7% figure came from qa/sizerank.mjs, filed
   by a crew. Re-run it or re-derive one of its headline numbers. If size DOES
   track score, the commit's stated reasoning is wrong even if the removal is
   right.`,
  },
  {
    key: 'cards', sha: '0efda23',
    brief: `THE LANDING: five of the family's #banner cards removed — the welcome
card, the join card, the "you ate one" card, the surge card, the stuffed
card — plus announceJoin() and ARCH_TAG, which were left with no callers. The
commit claims each deleted card had a world-space twin (halo colour, kill-site
floater, red surge halo, gold stuffed halo) and that the banner was GAGGING
crowd bubbles: bubbles.say() returns (discards) while a banner is up, at a
39% duty cycle. The crown cards ("YOU ARE IN FRONT", "X TOOK THE LEAD", "you
passed X") were DELIBERATELY KEPT.

KILL IT ON:
1. THE TWINS ARE REAL. For each deleted card, confirm the claimed world-space
   signal actually fires at the same moment on the real build: shoot a rival
   joining (does the halo appear?), a rival being eaten (does the floater show
   name+title+points?), a surge (is the halo red for its whole duration?), a
   stuffed rival (gold, pulsing?). A twin that fires late, off-screen, or not
   at all means the card was carrying information that is now lost.
2. THE GAG CLAIM. Read bubbles.ts say(). Is the 39% duty cycle real (the
   commit cites a comment in prototype3d.ts ~:3130 — find it and check the
   number was measured, not asserted)? With the family's cards gone, measure
   the banner duty cycle on a real match and report the new figure. If it
   barely moved, the "airtime back" claim is decoration.
3. THE CROWN CARDS STILL FIRE. They were kept on purpose as the last rank
   channel. Confirm they still render and that the rank machine (rows/myRank)
   still feeds them and the brag bubble.
4. ORPHANS AND DEAD STATE. With announceHtml call sites gone, are there
   variables, cooldowns or flags that no longer change (the commit mentions
   rankHold/shownRank/etc were NOT touched because the crown cards stayed —
   confirm nothing else is now write-only).
5. THE UNHOUSED TEACH. ARCH_TAG carried "she CHASES you" etc. The commit says
   this teach is now nowhere. Confirm that is true — and confirm no probe
   asserted on those strings.`,
  },
]

const results = await parallel(jobs.map((j) => () => agent(
  `${FACTS}

THE COMMIT UNDER REFUTATION: ${j.sha}. Run \`git show ${j.sha}\` and read its
full diff. Then read the real files on disk at HEAD.

${j.brief}

Write your complete verdict to docs/crews/round-5/refute-${j.key}.verdict.md —
the ONLY file you may write. Format: '# VERDICT: ...' / '## What I ran' /
'## What I checked on disk' / '## Kill shots' / '## Corrections (verbatim)'.`,
  { label: `refute:${j.key}`, phase: 'Refute', schema: VERDICT },
)))

return Object.fromEntries(jobs.map((j, i) => [j.key, results[i]]))
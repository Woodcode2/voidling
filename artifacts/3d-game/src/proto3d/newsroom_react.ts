// ══════════════════════════════════════════════════════════════════════════
//  THE TOWN REACTS — what the newsroom says about a thing that just happened
// ══════════════════════════════════════════════════════════════════════════
//
//  THE OWNER'S ASK, verbatim: "When the void absorbs key buildings or events
//  like a band it should say something funny to that."
//
//  The scheduled arc (newsroom_arc.ts) is the town's STORY — morning, doubt,
//  alarm, panic. This file is the town's REFLEX. When something named happens,
//  the paper drops what it was writing and reports THAT, and then the arc picks
//  up exactly where it was. A reactive line never advances a phase on its own;
//  it rides whatever phase the arc has already reached, which is why the chip
//  above it is still right.
//
//  FOUR TRIGGERS, and each one already exists in the game as a moment a child
//  can see happen:
//
//    landmark  a NAMED thing goes. The water tower, the ferris wheel car, the
//              ball of twine. These are the sticker props — they are the only
//              objects in the world with a name a paper could print. This used
//              to be ONE hard-coded template ("X has gone. It was Y the whole
//              time.") fired in all four worlds in no world's voice.
//    beat      a match beat fires — the band, the parade, the goat, the drum,
//              the fourth quarter. NOT an echo of the banner: the banner
//              announces the beat, and seven seconds later the paper reports
//              the beat WALKING INTO THE VOID. The banner is the event; this is
//              the consequence. (The old code handed the newsroom the banner's
//              own text in the same frame and five of eight headlines in a
//              measured Maple match were the card the player had just read.)
//    evolve    the void changes form. It is a visible event in the sky and the
//              town noticing it is funnier than a HUD banner saying EVOLVED.
//    rivalGone one void has eaten another. The town has no idea they have
//              names — see the rule below — but a second hole vanishing is news.
//
//  THE RULES THIS FILE INHERITS, all of them non-negotiable:
//    · A VOID NEVER SPEAKS HERE. Nothing in this file is in a void's voice and
//      no line contains a name from RIVAL_VOICE. The paper is the town.
//    · NO RIVAL NAMES, ever. Nobody in any of these worlds can know one. When a
//      line needs a second void it says "another one" or "a second".
//    · 4+. Property is comic, people are never victims, nobody is hurt and
//      nothing is frightening. The jokes are about dignity.
//    · ONE LINE, ONE SCREEN. Hard cap 78 characters AFTER the subject is
//      substituted, which is why {X} is clipped to 30 before it lands.
//    · VOICE PER WORLD IS SACRED. Read newsroom_maple.ts, newsroom.ts,
//      newsroom_gameday.ts and newsroom_lantern.ts before writing a word here.
//
//  {X} is the only token, it is the named thing, and only `landmark` has it.
//  {F} is the form name, and only `evolve` has it.

export type ReactWorld = 'maple' | 'pirate' | 'gameday' | 'lantern' | 'powder';
export type ReactKind = 'landmark' | 'beat' | 'evolve' | 'rivalGone';

/** The ticker is one line on a phone. Same number the four newsrooms use. */
const TICKER_MAX = 78;
/**
 * A NAMED THING MUST ARRIVE WITH ITS WHOLE NAME.
 *
 * The longest of the sixty four sticker names is 32 characters ("The
 * Second-Biggest Ball of Twine"), and the first version of this clipped the
 * subject to 30 — which qa/newsarc.mjs caught on a live card reading "Marge did
 * not move an inch when The Second-Biggest Ball of went." A landmark line whose
 * entire job is to name the landmark must never be the thing that cuts it in
 * half. So the budget goes the other way: the SUBJECT is never clipped in
 * practice, and the TEMPLATES are held short enough to fit one — checked at
 * worst-case fill by qa/newsstyle.mjs, which uses this same number.
 *
 * 34 rather than 32 so a future sticker with a slightly longer name still lands
 * whole. The whole-line clip below remains as the last-resort guard; if it ever
 * fires, the template is too long and the meter will say so first.
 */
const SUBJECT_MAX = 34;

interface WorldReact {
  /** {X} is the named thing that just went. */
  landmark: string[];
  /** One pool per match beat, indexed the way BEATS is in prototype3d.ts.
   *  Each pool is the town reacting to that beat MEETING the void. */
  beat: [string[], string[], string[], string[]];
  /** {F} is the form the void has just become. */
  evolve: string[];
  /** a second void has been eaten by the first */
  rivalGone: string[];
}

// ── MAPLE FALLS · THE BUGLE ───────────────────────────────────────────────
// Dry, small-town, plain sentences with a full stop. The joke is a grown-up
// refusing to be impressed. Cast: Mayor Dinkle, Gus, Carla Webb, Pearl, Tater,
// Dale, Marge, the goat, Biscuit, Pike Hollow. No pies. No bake sales.
const MAPLE: WorldReact = {
  // LANDMARK LINES ARE ON A BUDGET. {X} is a NAMED thing — a sticker prop, or
  // this world's hero landmark from WORLD_COPY.heroName — and the longest of
  // the sixty four sticker names is 32 characters ("The Second-Biggest Ball of
  // Twine"). SUBJECT_MAX is 34, so a template gets 44 characters to be funny in.
  // qa/newsstyle.mjs checks that at worst-case fill and caught the first draft
  // of nine of these; qa/newsarc.mjs then caught the tenth on a live card.
  landmark: [
    '{X} has gone. Mayor Dinkle says it is fine.',
    'Gus watched {X} go. Gus has notes.',
    'Where {X} stood there is now a tidy nothing.',
    'Tater says {X} going was the best bit yet.',
    '{X} is not where it was this morning.',
    'Pike Hollow still has theirs. {X} is gone.',
    'Marge did not move an inch when {X} went.',
  ],
  beat: [
    [ // 0 · band practice
      'The band marched into the thing on Elm Street and kept playing.',
      'The band is down to eleven players and has not stopped the song.',
      'The trombone section has gone and the song has not.',
    ],
    [ // 1 · dog off the lead
      'Biscuit ran round the hole twice and then took a sandwich.',
      'Six people chasing one dog have all stopped at the same spot.',
      'The dog will not go near it and the dog is being sensible.',
    ],
    [ // 2 · town parade
      'The parade has reached Main Street and Main Street has not.',
      'The float went in. The mayor calls it a scheduling matter.',
      'The parade is going round something nobody will name.',
    ],
    [ // 3 · the goat
      'The goat walked to the edge, looked in, and walked away.',
      'The goat has stopped running for the first time in years.',
      'Everybody is watching the goat and nobody is watching the hole.',
    ],
  ],
  evolve: [
    'It is bigger. Mayor Dinkle says it is the same size as before.',
    'The thing on Elm Street is a {F} now, whatever that means.',
    'Dale has measured it and says it gained four feet since lunch.',
    'It has grown again and Pearl is still the calmest woman in town.',
    'Carla Webb has run out of words that mean large. It is a {F}.',
  ],
  rivalGone: [
    'One void has eaten the other. There is one left, and it is bigger.',
    'One hole has gone into the other hole. Nobody has an explanation.',
    'We are down to a single hole and it has had a very good morning.',
  ],
};

// ── PIRATE BAY · BAY RADIO ────────────────────────────────────────────────
// A resort PA that will not admit anything is wrong, and upsells through it.
// Cast: Capt. Roger, Nigel, Barnaby, DJ Coconut, Mrs Fenwick-Hyde, Maisie,
// Cressida Vane, the Gilded Lagoon. No alcohol, ever.
const PIRATE: WorldReact = {
  landmark: [
    '{X} is closed for the season, from today.',
    'Guests asking after {X} should ask again later.',
    '{X} has been taken off the map for now.',
    'Five clear stars for the gap where {X} was.',
    '{X} was not included in your package, madam.',
    'Barnaby is already saying it: {X} has gone.',
    'Do book {X} early for next year. Very early.',
  ],
  beat: [
    [ // 0 · ice cream hour
      'Ice cream hour continues beside a hole and the queue has not moved.',
      'Nine hundred ice creams served and exactly one has been dropped.',
      'The ice cream hut is now the closest building to the thing.',
    ],
    [ // 1 · the parrot
      'Barnaby flew over it and repeated every word he heard below.',
      'The parrot has learned the sound a villa makes on the way down.',
      'Barnaby will not come down and Barnaby is the smartest one here.',
    ],
    [ // 2 · dance party
      'The dance floor has gone. DJ Coconut says one more hour anyway.',
      'The conga line went round it and came back four guests shorter.',
      'Dance Cove is now Dance Hole. Management prefers the old name.',
    ],
    [ // 3 · treasure hunt
      'A guest has found the treasure and lost the beach it was under.',
      'The treasure hunt continues with two of the clues missing.',
      'Nigel has drawn a new map that is wrong in a brand new way.',
    ],
  ],
  evolve: [
    'The water feature is larger today and management calls that an upgrade.',
    'Our purple guest is a {F} now and is still not on the guest list.',
    'Mrs Fenwick-Hyde would like a word about the size of the thing.',
    'Capt. Roger has upgraded it to a suite it cannot possibly fit in.',
    'Maisie says her friend got bigger. Maisie is entirely correct.',
  ],
  rivalGone: [
    'One of them has eaten the other. There is one left. Rather large.',
    'One of them has taken the other. Do enjoy the rest of your stay.',
    'The bay is down to a single hole and it looks extremely pleased.',
  ],
};

// ── GAME DAY · THE BOOTH ──────────────────────────────────────────────────
// Hank Prewitt on play-by-play, Bill Ordway on colour. They never stop calling
// it. No score, ever, and the two benches are never on opposite sides.
const GAMEDAY: WorldReact = {
  landmark: [
    'And {X} is gone, Bill, with no flag.',
    'Bill has the rulebook out on {X}.',
    'In thirty one seasons, {X} is a first.',
    'Nobody expected {X} to go like that.',
    'They are measuring where {X} was.',
    'Dwight had the best view of {X} going.',
    'We have lost {X}, folks.',
  ],
  beat: [
    [ // 0 · kickoff
      'The ball came down, Bill, and the ball did not come back up.',
      'That is the strangest opening play I have called in my life.',
      'Kickoff is away and half the north lot has gone with it.',
    ],
    [ // 1 · the band on the field
      'The band marched straight into it and never broke cadence.',
      'Down to one drum out there and that drum is not slowing up.',
      'The tubas have gone. Bill says they would have wanted this.',
    ],
    [ // 2 · concession rush
      'Ernie is still at grill nine and grill nine is the concourse now.',
      'The hot dog queue went round it and nobody lost their place.',
      'Doreen\'s casserole made it out and that is your story today.',
    ],
    [ // 3 · fourth quarter
      'Fourth quarter, the seats are gone, everybody is on their feet.',
      'They are calling it from a box with nothing underneath it.',
      'Coach Duffy has not stopped chewing, and that is the job.',
    ],
  ],
  evolve: [
    'It has grown again and Bill has stopped writing things down.',
    'That is a {F} now, and it is not on anybody\'s depth chart.',
    'Hank has run clean out of things to compare it to, folks.',
    'The chain crew measured it and have asked for a longer chain.',
    'It has put on size at the half and it did not eat a half.',
  ],
  rivalGone: [
    'One took the other, Bill. One left on the field, and it is bigger.',
    'One took the other. No flag on the play. There is no rule for it.',
    'And then there was one, folks. Deb says we are staying with it.',
  ],
};

// ── LANTERN NIGHT · THE MARKET COURTESY SYSTEM ────────────────────────────
// A recording that cannot tell anything is wrong, and management upstairs
// reading a ledger. It never denies the void, because it has never considered
// it. Cast: the Warden, Ponta, Yuki, Madam Yuzu, Kasa, Eleven Bowls, the koi.
const LANTERN: WorldReact = {
  landmark: [
    'The market thanks the guest for taking {X}.',
    '{X} has been accepted, with thanks.',
    'Guests looking for {X} should look elsewhere.',
    '{X} is no longer on tonight\'s map.',
    '{X} was six hundred years old until now.',
    'Ponta bowed as {X} went past and kept bowing.',
    'The ledger now shows {X} in the last column.',
  ],
  beat: [
    [ // 0 · the lanterns are lit
      'Nine hundred lanterns were lit and eleven have gone out already.',
      'The lamps are lit for the guest and the guest has eaten four.',
      'The Warden lights the lamps and will light them all again.',
    ],
    [ // 1 · everything is free
      'Every stall waived its prices and the guest took every stall.',
      'Free tonight: the dumplings, the masks and all of Lantern Row.',
      'Yuki has given away nine fox masks and one entire stall.',
    ],
    [ // 2 · the drum
      'The drum is struck for two reasons and this is not the other one.',
      'Nobody alive has heard the tower drum before this evening.',
      'The drum continues and the recording continues underneath it.',
    ],
    [ // 3 · the bathhouse
      'Madam Yuzu has opened every window and lit every one of them.',
      'The bathhouse is open to the guest and is the last thing up.',
      'A room has been made up upstairs and it will not be enough.',
    ],
  ],
  evolve: [
    'The honoured guest is a {F} now and the market is delighted.',
    'Our guest has grown. Please continue to give the guest room.',
    'Management notes the guest has doubled and the bill has trebled.',
    'Kasa says the guest is bigger. Kasa says a great many things.',
    'The guest no longer fits through the great gate and came in anyway.',
  ],
  rivalGone: [
    'There is one guest tonight. The guest list has been updated.',
    'One guest has taken the other. Both are thanked for visiting.',
    'We are honoured to host a single guest tonight. A very large one.',
  ],
};

// ── POWDER PASS · THE VALLEY BULLETIN ─────────────────────────────────────
// The school-closures desk: bureaucratic understatement against total
// catastrophe. The reader has been on since 5am and will not be hurried.
const POWDER: WorldReact = {
  landmark: [
    '{X} has been removed from the piste map. The piste map is next.',
    '{X} is gone. The council will revisit the matter in spring.',
    'We have lost {X}. The closure list has been amended accordingly.',
    '{X} was there at the 7am bulletin. The 8am bulletin differs.',
  ],
  beat: [
    [ // sled hour
      'Sledding continues despite the hole. Some sledding continues INTO the hole.',
      'The sled queue has shortened considerably. The bulletin will not say why.',
      'A toboggan has set a new speed record. The record ends at the hole.',
    ],
    [ // lake hour
      'Skating on the lake is suspended. The lake is also, partly, suspended.',
      'The ice remains thick. The ice also remains fewer places than before.',
      'Norm reports excellent fishing conditions and one enormous new neighbour.',
    ],
    [ // snowman contest
      'The snowman contest is down to fewer entrants than registered.',
      'Chairman Frost has retained his title by remaining in one piece.',
      'Judging is delayed. Several entries have been, in the official term, unentered.',
    ],
    [ // avalanche
      'The mountain has let go. The hole has been advised. The hole seems pleased.',
      'An avalanche is proceeding down the Home Run. So is everything else.',
      'The bulletin notes that the valley is now arriving all at once.',
    ],
  ],
  evolve: [
    'The hole is now classified {F}. The classification office has closed early.',
    'Officials confirm the hole has reached {F} status. Officials are leaving.',
    'The hole has been upgraded to {F}. The grit budget has not.',
  ],
  rivalGone: [
    'One hole has absorbed the other. The closure list is simpler now.',
    'The valley is down to a single hole. The bulletin calls this progress.',
    'Two holes went up the Home Run. One came back. It looks satisfied.',
  ],
};

const BY_WORLD: Record<ReactWorld, WorldReact> = {
  maple: MAPLE, pirate: PIRATE, gameday: GAMEDAY, lantern: LANTERN, powder: POWDER,
};

/** Everything said this match, so a landmark line cannot land twice. Cleared
 *  by resetReact() from resetMatch(), the same way every newsroom clears. */
const said: string[] = [];

export function resetReact(): void { said.length = 0; }

const clip = (s: string, n: number): string => {
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  const sp = cut.lastIndexOf(' ');
  return (sp > n * 0.5 ? cut.slice(0, sp) : cut).trim();
};

export interface ReactIn {
  world: ReactWorld;
  kind: ReactKind;
  /** the named thing, for `landmark` */
  subject?: string;
  /** which beat fired, 0-3, for `beat` */
  beat?: number;
  /** the beat's stable id, for `beat` — the matchdeck deals MIDDLE beats from
   *  a pool, so slot index no longer says WHICH event fired. When the id names
   *  a pool in MID_REACT below, that pool wins; the slot index stays as the
   *  fallback for the opener and the finale, which never move. */
  beatId?: string;
  /** the new form, for `evolve` */
  form?: string;
}

// ── THE MIDDLE-BEAT POOLS, BY ID ────────────────────────────────────────────
// The matchdeck (src/game/matchdeck.ts) deals a match its two MIDDLE beats
// from a pool of four per world, so "slot 1" and "slot 2" stopped naming an
// event. These pools are keyed by the beat's stable id instead. The first two
// per world ARE the shipped tuple entries, by reference — one source of truth,
// and reactAudit() keeps metering them through the tuple as before. The last
// two are the pool beats that only exist here.
//
// Same contract as every pool in this file: the town reacting to the beat
// MEETING THE VOID, eight seconds after the banner — never an echo of it.
export const MID_REACT: Record<string, string[]> = {
  'maple.dog': BY_WORLD.maple.beat[1],
  'maple.parade': BY_WORLD.maple.beat[2],
  'maple.bake': [
    'The bake sale table went in with all nine pies still on it.',
    'Marge sold a pie to the hole. Marge says a sale is a sale.',
    'The prize sponge is gone and Pearl is taking it extremely well.',
  ],
  'maple.tractor': [
    'Old Hutchins has driven the tractor round the hole four times, waving.',
    'The tractor pull has been redirected. The tractor had other ideas.',
    'Dale flagged the tractor down at the edge. The trailer did not stop.',
  ],
  'pirate.parrot': BY_WORLD.pirate.beat[1],
  'pirate.dance': BY_WORLD.pirate.beat[2],
  'pirate.limbo': [
    'The limbo line has bent itself around the thing by the tiki bar.',
    'The limbo champion went under the bar and did not come back up.',
    'The bar is now at ankle height and so, apparently, is the beach.',
  ],
  'pirate.crab': [
    'Crab number six has run straight in. The bookmaker is delighted.',
    'The derby has been re-routed. The crabs have not been informed.',
    'Number six is gone and the crowd is calling it a photo finish.',
  ],
  'gameday.bandfield': BY_WORLD.gameday.beat[1],
  'gameday.dogs': BY_WORLD.gameday.beat[2],
  'gameday.wave': [
    'The wave has reached section C. Section C is no longer attending.',
    'The wave went round the stadium twice and into the hole once.',
    'Statistically the wave is now the fastest thing on the field.',
  ],
  'gameday.mascot': [
    'A mascot has run straight in. The head came off on the way down.',
    'The mascot race is down to two. Neither of them can see the hole.',
    'The eagle is gone. The eagle was in the lead. Tough break.',
  ],
  'lantern.free': BY_WORLD.lantern.beat[1],
  'lantern.drum': BY_WORLD.lantern.beat[2],
  'lantern.masks': [
    'A masked figure bowed to the guest in the purple. The guest ate the mask.',
    'The mask parade has circled it once, out of respect, and once to check.',
    'Somebody offered it a mask. It is now wearing the whole seller.',
  ],
  'lantern.wishes': [
    'A wish paper drifted in. The market has decided it was granted.',
    'Half the wishes on the long wall now mention the guest by name.',
    'The wish about "a bigger appetite for the festival" has been withdrawn.',
  ],
  'powder.lake': BY_WORLD.powder.beat[1],
  'powder.contest': BY_WORLD.powder.beat[2],
  'powder.cocoa': [
    'The hot chocolate queue has re-formed in a ring around the hole.',
    'A full mug went in. The lodge is calling it a donation.',
    'Norm says the hole takes its cocoa with nothing in it. Everything, technically.',
  ],
  'powder.snowball': [
    'Every snowball on the green is being thrown at the same target. None have landed.',
    'The snowball fight has declared the hole ineligible. It keeps winning.',
    'A direct hit was recorded at noon. The snowball has not been returned.',
  ],
};

/**
 * One reactive headline, ready for breakingNews() — or null when this world has
 * nothing fresh left to say about this kind of event, which is the correct
 * answer roughly never but has to be an answer rather than a repeat.
 *
 * Returning null is DELIBERATE and the call sites must handle it: a paper that
 * says the same thing about two different landmarks is worse than a paper that
 * says nothing about the second one, because the first one stops being a story.
 */
export function reactLine(inp: ReactIn, rnd: () => number = Math.random): string | null {
  const w = BY_WORLD[inp.world];
  if (!w) return null;
  let pool: string[];
  if (inp.kind === 'landmark') pool = w.landmark;
  else if (inp.kind === 'evolve') pool = w.evolve;
  else if (inp.kind === 'rivalGone') pool = w.rivalGone;
  else pool = (inp.beatId && MID_REACT[inp.beatId]) || w.beat[Math.max(0, Math.min(3, inp.beat ?? 0))];

  const fresh = pool.filter((t) => !said.includes(t));
  if (!fresh.length) return null;
  const raw = fresh[Math.floor(rnd() * fresh.length) % fresh.length];
  said.push(raw);

  // Substitute, then clip the WHOLE line — a 30-character landmark inside a
  // 62-character template is 89 and the ticker would eat the joke's last word.
  const out = raw
    .replace(/\{X\}/g, clip(inp.subject ?? 'it', SUBJECT_MAX))
    .replace(/\{F\}/g, clip(inp.form ?? 'void', 14));
  return out.length > TICKER_MAX ? clip(out, TICKER_MAX) : out;
}

// The two hooks below match what all four newsroom modules already export, and
// like theirs they have no caller yet: qa/newsstyle.mjs meters these pools by
// reading this file's source, because doing it that way needs no build step and
// cannot be fooled by a pool that is exported but never picked from.

/** Census, for the content sanity check the other newsrooms all report. */
export function reactLineCount(): number {
  let n = 0;
  for (const w of Object.values(BY_WORLD)) {
    n += w.landmark.length + w.evolve.length + w.rivalGone.length;
    for (const b of w.beat) n += b.length;
  }
  return n;
}

/** QA hook: every raw template, tagged, so a harness can meter the house style
 *  without reaching into module privates. */
export function reactAudit(): { world: ReactWorld; kind: string; line: string }[] {
  const out: { world: ReactWorld; kind: string; line: string }[] = [];
  for (const key of Object.keys(BY_WORLD) as ReactWorld[]) {
    const w = BY_WORLD[key];
    for (const line of w.landmark) out.push({ world: key, kind: 'landmark', line });
    for (let i = 0; i < 4; i++) for (const line of w.beat[i]) out.push({ world: key, kind: `beat${i}`, line });
    for (const line of w.evolve) out.push({ world: key, kind: 'evolve', line });
    for (const line of w.rivalGone) out.push({ world: key, kind: 'rivalGone', line });
  }
  return out;
}

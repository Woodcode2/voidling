// ══════════════════════════════════════════════════════════════════════════
//  NEWSROOM — LANTERN NIGHT, the market that cannot tell anything is wrong
//
//  THE CONCEIT, AND WHY IT IS NOT THE OTHER THREE
//  ----------------------------------------------
//  Maple Falls has a mayor who denies there is a void. Pirate Bay has a
//  manager who denies there is a void. Game Day has two announcers who call
//  the void as if it were a football play. All three are the same joke told
//  three ways: a PERSON in authority failing to admit what is in front of
//  them, then panicking.
//
//  This one is not a person. It is the market's PUBLIC ADDRESS — a recorded
//  courtesy system that has run the same announcements for six hundred years
//  and has no mechanism for noticing anything. It cannot deny the void,
//  because denial requires having considered it. It simply keeps welcoming
//  the guest, thanking the guest, and reminding the guest of the opening
//  hours while the guest eats the market.
//
//  That is why the escalation here is HOSPITALITY -> CONCERN -> ALARM rather
//  than denial -> panic:
//
//    tier 0  THE PA. Pure courtesy. It has decided you are a customer and it
//            is delighted. Nothing in tier 0 acknowledges damage at all.
//    tier 1  MANAGEMENT. A real voice, several floors up, working from a
//            ledger. It has not seen you; it has seen the numbers, and the
//            numbers are extraordinary. This tier is about a BILL.
//    tier 2  THE DRUM TOWER. Somebody has taken the microphone. The PA's
//            courtesy formulas are still audible underneath, which is the
//            joke landing: the recording does not stop for an emergency.
//
//  THE RULE ABOUT THE VOID. The market covers ONE thing: a void is eating it.
//  Nobody here can know that some OTHER void has a name, so no line refers to
//  a rival by name; if a line needs a second void it says "another one" or
//  "a second one". The same rule the other three newsrooms carry, for the same
//  reason — the ticker is diegetic and the leaderboard is not.
//
//  TEMPLATES. {M} is the last thing eaten, {D} the district the player is
//  standing in, {P} the percent devoured, {R} the percent still standing,
//  {F} the player's form, {S} seconds left. Every one is real live state, so
//  the market is narrating the child's own run back to them. This world has no
//  LIVE pool and no per-meal pools, so the token lines at the foot of each
//  T*_GENERAL are the ONLY route live state has to the ticker here — keep them.
// ══════════════════════════════════════════════════════════════════════════

export type NewsTier = 0 | 1 | 2;

/** District ids are the RENAMED ones biomeAt returns — island.ts translates
 *  three of lantern.ts's names at the boundary and this file must agree with
 *  what comes out, not with what went in. */
export type LnDist =
  | 'torii' | 'stalls' | 'canal' | 'teahouse' | 'shrine'
  | 'moonbridge' | 'nightgarden' | 'bathhouse' | 'onsen' | 'bamboo';

export interface LanternCtx {
  tier: NewsTier;
  district: LnDist | null;
  lastMeal: string;
  devouredPct: number;
  form: string;
  secondsLeft: number;
  // accepted and ignored, exactly as the booth ignores them: the PA is a
  // recording and management is reading a ledger. Neither can know a rival's
  // name. Declared so the shared call site type-checks; never read.
  rivalName?: string;
  rivalLead?: number;
}

/** Per-tier badge. The station does not change — its composure does. */
export const LANTERN_BRAND: [string, string, string] = [
  '🏮 MARKET COURTESY',
  '📜 MANAGEMENT NOTICE',
  '🥁 THE DRUM TOWER',
];

// ── the sign-on ────────────────────────────────────────────────────────────
// The first thing anybody hears, guaranteed. It has to establish the whole
// premise in one line: this place is open, it is pleased to see you, and it
// has absolutely no idea.
const SIGN_ON: string[] = [
  'Good evening, night market! Nine hundred lanterns, one upside down.',
  'Good evening, night market! "Best dumplings on the row," says Ponta.',
  'Good evening, night market! Lost property so far: one sandal, one hat.',
  'Good evening, night market! Kasa the umbrella is up. It is not raining.',
  'Good evening, night market! How many gates are there? Twelve, as always.',
  'Good evening, night market! Yuki sold out of fox masks before opening time.',
  'Good evening, night market! The stall called Eleven Bowls has eleven bowls.',
  'Good evening, night market! Madam Yuzu scrubbed the bathhouse stair twice.',
  'Good evening, night market! Tea is on. The boats are out. The moon is up.',
  'Good evening, night market! The teahouse has forty cups and one favourite.',
  'Good evening, night market! Six hundred years open. No trouble yet.',
  'Good evening, night market! Ponta ate nine of his own dumplings. Nine.',
  'Good evening, night market! The koi are asleep. They have had a long year.',
];

// ── TIER 0 · THE PA ────────────────────────────────────────────────────────
// Pure courtesy. Not one line here acknowledges that anything is wrong,
// because the system that speaks them has no way to.
const T0_GENERAL = [
  'The market is open and Ponta has already sold nine hundred dumplings.',
  'A round purple guest has arrived at the gate. Everybody is delighted.',
  '"Welcome, honoured guest," says Yuki, bowing low to a hole in the road.',
  'Ponta has given the purple guest one free dumpling, then eleven more.',
  'The dark patch by stall six is a new pond, says the man with the mop.',
  'Kasa says the purple guest moved. Kasa says a great many things.',
  'Eleven Bowls is down to nine bowls and will not discuss the matter.',
  'Lost property tonight: two sandals, one paper fan and one small boat.',
  'Tea has been poured for the purple guest. That is the eleventh pot.',
  'Correction: the thing by stall four is a guest, not a puddle.',
  'Madam Yuzu is making up a room at the bathhouse for the round guest.',
  'Has anybody seen the little lantern from the moon bridge?',
  'The koi are asleep, and the night garden asks that they stay asleep.',
  'Everything is free to guests tonight. It says so on the gate.',
  'Ponta drummed his belly for the guest. The guest did not clap.',
  'Update. The purple guest has now visited every stall on Lantern Row.',
  'Yuki has offered the guest a fox mask. It does not appear to fit.',
  'Two boats have drifted off down the canal with nobody aboard.',
  'The offering box has gone from the shrine. It will turn up somewhere.',
  'Bowls. The stack is down to six and nobody is counting out loud.',
  'The purple guest has been offered a towel, a room and a small cake.',
  'The stone stair has one step fewer than it had this morning.',
  'Ponta\'s stall has a queue of one, and the one is extremely large.',
  'Madam Yuzu says the guest may stay as long as the guest likes.',
  'Nothing is wrong with the moon bridge. It has always been that short.',
  'Kasa hopped the whole length of the row. Nobody hops like Kasa.',
  'Please mind the step by stall nine, where the step used to be.',
  '"Have another one, honoured guest," says Ponta, for the ninetieth time.',
  // ── live state, in the PA's voice. See the note above TOKENS. ──
  'The guest has enjoyed {M}, and the market is delighted.',
  'A guest is enjoying {D}. Wonderful. Wonderful.',
  'Tonight the market welcomes a {F}, and all shapes are welcome.',
  'Has the guest tried {M} yet? The guest has, twice.',
  'Compliments of the market: {M}. And everything else too.',
  '{P} percent of the market has been enjoyed by our guest so far.',
  'Ponta reports that the guest liked {M} very much indeed.',
  'Our guest is in {D} and having, we think, a lovely time.',
];
const T0_BY_DIST: Record<LnDist, string[]> = {
  torii: ['Please count the gates on your way in. It is traditional.',
    'A guest has arrived through the great gate. Welcome, welcome.',
    'The gate lanterns are lit for you personally. Well. For everyone.'],
  stalls: ['Lantern Row is open. Please try everything.',
    'The stallholders would like it known that theirs is the best stall.',
    'Skewers, dumplings, sweet things. The order does not matter.',
    'A guest has now visited every stall on the row. Every one.'],
  canal: ['Float a lantern for luck. There are plenty.',
    'The canal is shallow and perfectly safe to walk in.',
    'Boats are complimentary. Please return them roughly where you found them.'],
  teahouse: ['The terrace has a lovely view of the market this evening.',
    'Tea is served until the lanterns go out.',
    'A guest is taking tea. That is the eleventh pot. How nice.'],
  shrine: ['You may ring the bell as often as you wish.',
    'A blessing is available to any traveller who asks.',
    'The offering box is optional. It has always been optional.'],
  moonbridge: ['The moon bridge is the best view in the market. Everybody stops.',
    'Please do stop on the bridge. Everyone does.'],
  nightgarden: ['The garden is three hundred years old and rather proud of it.',
    'The koi are asleep. Please do not wake the koi.'],
  bathhouse: ['A room is being prepared for our guest.',
    'The bathhouse welcomes guests of any size. Any size at all.',
    'Towels are provided. We are fetching more towels.'],
  onsen: ['The hot spring is open to all guests and always has been.',
    'The far pool is the hot one. Most guests work that out eventually.',
    'Very few guests find the spring. Congratulations to this one.'],
  bamboo: ['The path in is well lit. Please follow the lanterns.',
    'There is nothing out here but bamboo and the way back.'],
};

// ── TIER 1 · MANAGEMENT ────────────────────────────────────────────────────
// A real voice now, and it is holding a ledger. It has NOT looked out of the
// window — everything it knows, it knows from a number that will not stop
// going up. The comedy is administrative.
const T1_GENERAL = [
  'Management has counted the stalls twice and would like to count again.',
  'The guest\'s bill is now four pages long. The guest has no pockets.',
  'This is not an evacuation. This is a lantern walk, says Management!',
  'Eleven Bowls is down to four bowls and has changed his name to Four.',
  'Guests counted twelve gates on the way in and nine on the way out.',
  '"Everything is fine," says Management, closing a very large ledger.',
  'Kasa was right about the purple guest. Nobody is saying that out loud.',
  'The canal is lower than it was and Ponta is standing on dry stones.',
  'Please walk up the stone stair briskly and enjoy the lovely views.',
  'Yuki is leading everybody up the steps with one small paper lantern.',
  'Madam Yuzu has cancelled the guest\'s room. The guest has taken the lobby.',
  'Missing since ten: one offering box, one bridge lantern, two boats.',
  'The teahouse has run out of cups and is now running out of terrace.',
  'Ponta has stopped saying the first one is free. Ponta looks thoughtful.',
  'Is the guest larger than the bathhouse? Management would like a number.',
  'The drum has been struck twice and nobody up the tower is admitting it.',
  'Stall nine has been relocated to the void. Its owner is fine and cross.',
  'Three hundred years of moss has gone from the night garden.',
  'The koi are fine. They went up the stream at the very first wobble.',
  'Update. Lantern Row is now half a row, says a cheerful stallholder.',
  'Kasa is hopping up the stair and telling everybody else to hop.',
  'The shrine attendant is ringing the bell and will not be talked out of it.',
  'Management would like a word with whoever welcomed the guest in.',
  'Yuki says her mask is still smiling. Yuki is not smiling.',
  'The bathhouse is a floor shorter. Madam Yuzu is not amused.',
  'Everything is free to guests. Management deeply regrets writing that.',
  'The queue for the moon bridge is going the other way now.',
  'A second purple guest has been reported. We are calling that a rumour.',
  // ── live state, read off the ledger ──
  'The guest has eaten {M}. That was on the inventory.',
  'Stock in {D} is described by the stallholders as gone.',
  'Approximately {P} percent of the market is now unaccounted for.',
  'The guest is now a {F}, and the paperwork has no box for that.',
  'Added to the bill: {M}. Management has stopped reading it.',
  'Is {D} still there or is that another blank in the ledger?',
  'Management notes that {R} percent of the market remains.',
  'Ponta says the guest ate {M} and looked round for more.',
];
const T1_BY_DIST: Record<LnDist, string[]> = {
  torii: ['One of the gates is missing. We are counting them again.',
    'The great gate is shorter than it was this morning.'],
  stalls: ['Eleven stalls have stopped trading. Their owners are fine. Their stalls are not.',
    'The row is described as "shorter". We have asked how much shorter.',
    'The stallholder who said "first one is free" would like to revise that.'],
  canal: ['The canal is lower than it was. Considerably lower.',
    'Several boats are unaccounted for. So is the water they were on.'],
  teahouse: ['The terrace has been asked to move its guests indoors.',
    'We are out of the good cups. And the ordinary cups.'],
  shrine: ['The offering box is gone. The offering box weighed a great deal.',
    'The attendants are ringing the bell continuously now.'],
  moonbridge: ['The bridge has creaked. The bridge has never creaked.',
    'We are asking guests not to gather on the bridge this evening.'],
  nightgarden: ['The koi pond is a hole. The koi are, we hope, elsewhere.',
    'Three hundred years of moss. We would like it back.'],
  bathhouse: ['The bathhouse has been advised to expect a guest. A large one.',
    'The third floor has stopped answering.'],
  onsen: ['The spring is lower than it was. Springs do not do that.',
    'Somebody has been in the far pool for a very long time.'],
  bamboo: ['The path in is dark. The lanterns on it are gone.'],
};

// ── TIER 2 · THE DRUM TOWER ────────────────────────────────────────────────
// Somebody has taken the microphone. The courtesy formulas are still running
// underneath, which is the joke: a recording does not stop for an emergency.
const T2_GENERAL = [
  'The market has GONE!! Tea is served until the lanterns go out.',
  'Lantern Row has gone. The dumplings are safe. Ponta carried them all.',
  'Ponta is up the drum tower, drumming, and waving people up the stair.',
  'Weather tonight: clear, mild, and no market whatsoever.',
  'Eleven Bowls is one bowl now, and that bowl is holding up remarkably well.',
  'The great gate has gone!! Nobody counted it on the way out.',
  '"Up the stair, everybody," says Yuki, holding her small lantern high.',
  'The canal has no water in it and the boats are sitting on stones.',
  'Kasa told us at seven o\'clock. Nobody ever listens to the umbrella.',
  'Tonight\'s sport: the stone stair. Everybody is going up it very fast.',
  'Missing: the moon bridge, both ends of it, and the moon in the water.',
  'Management has left the ledger on a rock and run up the valley.',
  'The guest was honoured. The guest was welcomed. The guest ate the gate.',
  'Ponta is drumming, Kasa is hopping, and Yuki is counting us all out.',
  'The teahouse terrace has gone. The teapot is still on the tray.',
  'Take the bamboo path. Ponta will keep that drum going for you.',
  'The hot spring is dry!! Six hundred years, and it is a bowl of stones.',
  'Yuki has counted every spirit onto the path twice, and we are all here.',
  'Correction: the market closes at first light. The market closed at nine.',
  'A stallholder is running uphill carrying an entire noodle pot.',
  'Lost property is now a rock by the bamboo path. Please enquire there.',
  'Free to guests tonight: the stalls, the stair and the whole bathhouse.',
  'Madam Yuzu has locked the bathhouse door. There is no bathhouse behind it.',
  'The drum is still going!! If you can hear it, walk toward the sound.',
  'Everybody up the stone stair. UP. Do not stop at the shrine.',
  'And now the weather. Clear all night, with one lantern left over.',
  'The shrine attendant is still ringing that bell from the top step.',
  'Ponta gave the last dumplings away on the stair. All of them.',
  // ── live state, from the drum tower ──
  '{P} percent of the market is gone. Please move.',
  'It has eaten {M}. It is still hungry. GO.',
  '{D} is gone. Do not go back for anything.',
  'The guest is a {F} now. There is no larger word for it.',
  '{S} seconds. That is the honest number. Use them.',
  'It took {M} and did not slow down, so up the stair.',
  '{R} percent of the market is still standing. Everybody up the valley.',
  '{S} seconds, and the drum is still going, so walk toward it.',
];
const T2_BY_DIST: Record<LnDist, string[]> = {
  torii: ['The gate is going. GET THROUGH THE GATE.',
    'Nobody else in! Nobody else in!'],
  stalls: ['Lantern Row is gone. All of it. Leave the carts.',
    'It is coming up the row. UP THE ROW. Go sideways!'],
  canal: ['There is no water in the canal. Get out of the canal.',
    'It is IN the channel. Both banks. Move.'],
  teahouse: ['Off the terrace. Jump if you have to. OFF.',
    'It is climbing to the terrace. Everybody down the back steps.'],
  shrine: ['Up the steps! All the way up! Do not stop at the shrine!',
    'The shrine has stood for six hundred years. It will not stand tonight.'],
  moonbridge: ['THE BRIDGE IS GOING. Run to whichever end is nearer.',
    'Off the bridge! Both ends! NOW!'],
  nightgarden: ['Into the bamboo. Straight through it. Do not stop.',
    'The garden is gone. Keep going up.'],
  bathhouse: ['IT IS AT THE BATHHOUSE. Every floor. Everybody. Out.',
    'The bathhouse is the last thing. There is nothing behind it.'],
  onsen: ['OUT OF THE WATER. All of you. Now.',
    'It has drunk the spring. Six hundred years, and it is dry.'],
  bamboo: ['Keep climbing. Do not look back down the valley.',
    'You are nearly out. Keep going.'],
};

// ── THE LAST WORDS ─────────────────────────────────────────────────────────
// The market had no ending. It escalated to the drum tower and then simply
// kept shouting until the match ran out, which is the one beat the other three
// worlds all have and this one did not: somebody, safe, up the valley, saying
// goodnight. The PA is still running underneath — it does not stop for an
// emergency, and it does not stop for a goodnight either.
const SIGN_OFF: string[] = [
  'Goodnight from the night market, wherever the night market has gone.',
  'Ponta has stopped drumming, because everybody is up the valley and safe.',
  'The lanterns are out, the koi are fine, and every sandal is accounted for.',
  'Kasa put his umbrella up over the whole crowd, and we all fitted under.',
  'Tomorrow: clear skies, a warm wind, and no market at all. Sleep well.',
  'The market opens one night a year, and the lanterns keep well.',
  'Eleven Bowls is carrying his last bowl home, and singing about it.',
  'Goodnight, honoured guest. You were welcome, and you knew it.',
  'Six hundred years, one hungry guest, and everybody home. Goodnight!',
  'The recording is still saying please enjoy the market. Let it finish.',
];

// ── the pools, per tier ────────────────────────────────────────────────────
const GENERAL: [string[], string[], string[]] = [T0_GENERAL, T1_GENERAL, T2_GENERAL];
const BY_DIST: [Record<LnDist, string[]>, Record<LnDist, string[]>, Record<LnDist, string[]>] =
  [T0_BY_DIST, T1_BY_DIST, T2_BY_DIST];

let signedOn = false;
let signedOff = false;   // the tower has said goodnight; it does not come back
let recent: string[] = [];

export function resetLanternNews(): void {
  signedOn = false;
  signedOff = false;
  recent = [];
}

/** How many distinct lines this world can say, for the census the other
 *  newsrooms report. Counted rather than asserted. */
export function lanternNewsCount(): number {
  let n = SIGN_ON.length + SIGN_OFF.length;
  for (const g of GENERAL) n += g.length;
  for (const d of BY_DIST) for (const k of Object.keys(d)) n += d[k as LnDist].length;
  return n;
}

/** the ticker is one line on a phone. nothing here gets to be a paragraph. */
const TICKER_MAX = 78;
/** {M} lands MID-CLAUSE in most templates, so what arrives has to be a bare
 *  noun phrase: no terminal stop, no comma, nothing after one. Both have
 *  shipped from the call site and both were only visible on a rendered card —
 *  "It ate a guest. mid-sentence.." and "and a truck, in motion was gone".
 *  The pools cannot defend against this, so the substitution point does. */
const fragment = (s: string): string => (s.split(/[,.;:]/)[0] || s).trim();
const clip = (s: string, n: number): string => {
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  const sp = cut.lastIndexOf(' ');
  return (sp > n * 0.5 ? cut.slice(0, sp) : cut).trim();
};

function fill(t: string, c: LanternCtx): string {
  const pct = Math.max(1, Math.min(99, Math.round(c.devouredPct)));
  return t
    .replace(/\{M\}/g, clip(fragment(c.lastMeal || 'something'), 22))
    .replace(/\{D\}/g, DIST_NAME[c.district ?? 'stalls'])
    .replace(/\{P\}/g, String(pct))
    .replace(/\{R\}/g, String(100 - pct))
    .replace(/\{F\}/g, clip(c.form || 'guest', 14))
    .replace(/\{S\}/g, String(Math.max(1, Math.ceil(c.secondsLeft))));
}

/** A countdown line with two and a half minutes left is a weather report, not
 *  an evacuation. The other three newsrooms all gate {S}; this one did not. */
const usable = (t: string, c: LanternCtx): boolean =>
  !(t.includes('{S}') && c.secondsLeft > 70);

const DIST_NAME: Record<LnDist, string> = {
  torii: 'the great gate', stalls: 'Lantern Row', canal: 'the canal',
  teahouse: 'the teahouse terrace', shrine: 'the shrine steps',
  moonbridge: 'the moon bridge', nightgarden: 'the night garden',
  bathhouse: 'the bathhouse', onsen: 'the hot spring', bamboo: 'the bamboo path',
};

/** One headline. The sign-on is guaranteed first; after that it is a weighted
 *  pick between the district's own lines and the general pool, biased toward
 *  the district because a market narrating the street you are standing in is
 *  the whole reason this file is per-district. */
export function pickLanternNews(ctx: LanternCtx, rnd: () => number = Math.random): string {
  if (!signedOn) {
    signedOn = true;
    return clip(SIGN_ON[Math.floor(rnd() * SIGN_ON.length)], TICKER_MAX);
  }
  const tier = Math.max(0, Math.min(2, ctx.tier)) as NewsTier;
  // ONCE, AND LAST. tier 2 can start as early as 18% devoured, far too soon for
  // "goodnight" — so the goodnight waits for the match to be genuinely over the
  // hill, and taking it closes the tower for the match. Same gate the Bugle
  // uses, for the same reason: a sign-off that fires twice is not an ending.
  if (tier === 2 && !signedOff && ctx.secondsLeft <= 26 && rnd() < 0.45) {
    signedOff = true;
    return clip(SIGN_OFF[Math.floor(rnd() * SIGN_OFF.length)], TICKER_MAX);
  }
  const dist = ctx.district && BY_DIST[tier][ctx.district] ? ctx.district : null;
  const local = dist ? BY_DIST[tier][dist] : [];
  // 55% local when there is a local pool — enough that the street is usually
  // the subject, not so much that the general voice never gets a turn
  const wide = GENERAL[tier].filter((h) => usable(h, ctx));
  const pool = local.length && rnd() < 0.55 ? local : wide;
  const fresh = pool.filter((h) => !recent.includes(h));
  const src = fresh.length ? fresh : (pool.length ? pool : wide);
  const line = src[Math.floor(rnd() * src.length)];
  recent.push(line);
  if (recent.length > 6) recent.shift();
  return clip(fill(line, ctx), TICKER_MAX);
}

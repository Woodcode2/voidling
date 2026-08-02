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
//  standing in, {P} the percent devoured, {F} the player's form, {S} seconds
//  left. Every one is real live state, so the market is narrating the child's
//  own run back to them.
// ══════════════════════════════════════════════════════════════════════════

export type NewsTier = 0 | 1 | 2;

/** District ids are the RENAMED ones biomeAt returns — island.ts translates
 *  three of lantern.ts's names at the boundary and this file must agree with
 *  what comes out, not with what went in. */
export type LnDist =
  | 'torii' | 'stalls' | 'canal' | 'teahouse' | 'shrine'
  | 'moonbridge' | 'nightgarden' | 'bathhouse' | 'bamboo';

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
const SIGN_ON = [
  'Welcome to the night market. The market opens one night a year, and tonight is the night.',
  'Good evening, honoured guest, and welcome. Please enjoy the market at your own pace.',
  'The lanterns are lit and the market is open. We are so pleased you could come.',
];

// ── TIER 0 · THE PA ────────────────────────────────────────────────────────
// Pure courtesy. Not one line here acknowledges that anything is wrong,
// because the system that speaks them has no way to.
const T0_GENERAL = [
  'Guests are reminded that the market closes at first light.',
  'Please enjoy the market. Please enjoy the market.',
  'A guest has been seated. We hope you are comfortable.',
  'The market thanks you for visiting and hopes you will visit again.',
  'Lost property may be collected at the gate. We have found a great deal of it.',
  'Please do not run on the stones. They are old and so are we.',
  'The market would like to thank the guest in the purple for their custom.',
  'This evening the market is fully staffed and delighted about it.',
  'Guests with large appetites are especially welcome.',
  'The stalls will restock as required. They always have.',
  'Please mind your step. Please mind everyone else’s step also.',
  'The market has been open for six hundred years without incident.',
  'Somebody has eaten {M}. The market is happy to hear it.',
  'A guest is enjoying {D}. Wonderful. Wonderful.',
  'Tonight’s guest is a {F}. All shapes are welcome here.',
  'A reminder that everything is free to guests. Everything.',
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
  bamboo: ['The path in is well lit. Please follow the lanterns.',
    'There is nothing out here but bamboo and the way back.'],
};

// ── TIER 1 · MANAGEMENT ────────────────────────────────────────────────────
// A real voice now, and it is holding a ledger. It has NOT looked out of the
// window — everything it knows, it knows from a number that will not stop
// going up. The comedy is administrative.
const T1_GENERAL = [
  'Management has been informed. Management is reviewing the figures.',
  'The guest in the purple has now had eleven of everything.',
  'A note from the office: the guest’s account is the largest ever opened.',
  'We are reviewing our policy on complimentary items.',
  'The guest has eaten {M}. That was on the inventory.',
  'Stock levels in {D} are described by the stallholders as "gone".',
  'Approximately {P} percent of the market is now unaccounted for.',
  'The market has never closed early. We are discussing whether it could.',
  'A ledger has been opened. A second ledger has been opened.',
  'Management would like a word with whoever let the guest in.',
  'The guest is now a {F}. The paperwork does not have a box for that.',
  'We remind guests that "everything is free" was intended warmly.',
  'Nobody is panicking. Several people are walking quickly.',
  'The stallholders have asked what the plan is. There is no plan yet.',
  'A second void has been reported. We are treating that as a rumour.',
  'The bell has been rung. Nobody is sure who rang it.',
  'Somebody has counted the gates on the way out and got a different number.',
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
  bamboo: ['The path in is dark. The lanterns on it are gone.'],
};

// ── TIER 2 · THE DRUM TOWER ────────────────────────────────────────────────
// Somebody has taken the microphone. The courtesy formulas are still running
// underneath, which is the joke: a recording does not stop for an emergency.
const T2_GENERAL = [
  'EVERYBODY OUT. Up the valley. Do not stop for your things.',
  'This is not the recording. This is a person. Please listen.',
  'The market is closing. The market has never closed.',
  '{P} percent of the market is gone. Please move.',
  'It has eaten {M}. It is still hungry. GO.',
  '{D} is gone. Do not go back for anything.',
  'The guest is a {F} now. There is no larger word for it.',
  'Get to the bamboo. Get UP the valley. Now.',
  'The drum is being struck. If you can hear it, run toward the sound.',
  'The gate is that way. The gate is the only way.',
  '{S} seconds. That is the honest number. Use them.',
  '…and the market thanks you for visiting. SORRY. That was the recording.',
  'Please enjoy the market — no. NO. Somebody switch that off.',
  'A second one has been seen. We were wrong to call it a rumour.',
  'We welcomed it. We WELCOMED it. Please go.',
  'Six hundred years. Six hundred years. Move.',
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
  bamboo: ['Keep climbing. Do not look back down the valley.',
    'You are nearly out. Keep going.'],
};

// ── the pools, per tier ────────────────────────────────────────────────────
const GENERAL: [string[], string[], string[]] = [T0_GENERAL, T1_GENERAL, T2_GENERAL];
const BY_DIST: [Record<LnDist, string[]>, Record<LnDist, string[]>, Record<LnDist, string[]>] =
  [T0_BY_DIST, T1_BY_DIST, T2_BY_DIST];

let signedOn = false;
let recent: string[] = [];

export function resetLanternNews(): void {
  signedOn = false;
  recent = [];
}

/** How many distinct lines this world can say, for the census the other
 *  newsrooms report. Counted rather than asserted. */
export function lanternNewsCount(): number {
  let n = SIGN_ON.length;
  for (const g of GENERAL) n += g.length;
  for (const d of BY_DIST) for (const k of Object.keys(d)) n += d[k as LnDist].length;
  return n;
}

function fill(t: string, c: LanternCtx): string {
  return t
    .replace(/\{M\}/g, c.lastMeal || 'something')
    .replace(/\{D\}/g, DIST_NAME[c.district ?? 'stalls'])
    .replace(/\{P\}/g, String(Math.max(1, Math.min(99, Math.round(c.devouredPct)))))
    .replace(/\{F\}/g, c.form || 'guest')
    .replace(/\{S\}/g, String(Math.max(1, Math.ceil(c.secondsLeft))));
}

const DIST_NAME: Record<LnDist, string> = {
  torii: 'the great gate', stalls: 'Lantern Row', canal: 'the canal',
  teahouse: 'the teahouse terrace', shrine: 'the shrine steps',
  moonbridge: 'the moon bridge', nightgarden: 'the night garden',
  bathhouse: 'the bathhouse', bamboo: 'the bamboo path',
};

/** One headline. The sign-on is guaranteed first; after that it is a weighted
 *  pick between the district's own lines and the general pool, biased toward
 *  the district because a market narrating the street you are standing in is
 *  the whole reason this file is per-district. */
export function pickLanternNews(ctx: LanternCtx, rnd: () => number = Math.random): string {
  if (!signedOn) {
    signedOn = true;
    return SIGN_ON[Math.floor(rnd() * SIGN_ON.length)];
  }
  const tier = Math.max(0, Math.min(2, ctx.tier)) as NewsTier;
  const dist = ctx.district && BY_DIST[tier][ctx.district] ? ctx.district : null;
  const local = dist ? BY_DIST[tier][dist] : [];
  // 55% local when there is a local pool — enough that the street is usually
  // the subject, not so much that the general voice never gets a turn
  const pool = local.length && rnd() < 0.55 ? local : GENERAL[tier];
  const fresh = pool.filter((h) => !recent.includes(h));
  const src = fresh.length ? fresh : pool;
  const line = src[Math.floor(rnd() * src.length)];
  recent.push(line);
  if (recent.length > 6) recent.shift();
  return fill(line, ctx);
}

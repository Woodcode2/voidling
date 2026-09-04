// ══════════════════════════════════════════════════════════════════════════
//  THE SEASONS — the same island, repainted on a calendar
// ══════════════════════════════════════════════════════════════════════════
//
//  THE IDEA, STOLEN HONESTLY. Subway Surfers has run the identical loop for a
//  decade by repainting it every few weeks — new city, one limited character,
//  and the app icon itself changes so the phone's home screen advertises
//  novelty before the app is even opened. Ours, sized to four worlds: each
//  world owns one fortnight of the year. During its window the world's beat
//  palette shifts to the season's colour, a themed prop set is scattered
//  through the districts, four extra stickers hide in it, and the menu grows
//  a ribbon naming the season and the day it ends.
//
//  EVERYTHING HERE IS A CLOCK CHECK. No server, no config fetch, no remote
//  switch: the table below is shipped in the build and checked against the
//  device's own date at boot. A season that needs a server is a season that
//  breaks in airplane mode.
//
//  WINDOWS RECUR. `from`/`to` are month-and-day, so every season comes back
//  every year. That is the 4+ version of "limited": a child who misses
//  HARVEST WEEK has not lost it forever, they have a reason to come back in
//  October — and a sticker found during a season stays found, permanently,
//  same as every other sticker (stickers.ts owns that promise).
//
//  WHAT A SEASON MAY NEVER DO: run a countdown inside a match, gate anything
//  a child already owns, or touch the shop. The ribbon carries a date, not a
//  timer. The pull is "the island looks different this fortnight", nothing
//  sharper than that.

export interface SeasonEvent {
  /** stable id — sticker gating and telemetry key on it. Never rename. */
  id: string;
  world: 'maple' | 'pirate' | 'gameday' | 'lantern' | 'powder' | 'skylark';
  /** the season's name, shouted the way the worlds shout */
  name: string;
  icon: string;
  /** inclusive [month 1-12, day] window, device-local, recurs yearly */
  from: [number, number];
  to: [number, number];
  /** repaints the beat palette + fever rings while live */
  accent: number;
  /** the beat card's screen flash while live */
  flash: string;
  /** the ribbon's second line, in the world's own voice */
  line: string;
}

export const EVENTS: SeasonEvent[] = [
  // Lantern Night opens the year: the real lantern festival closes the lunar
  // new year, so early February is the honest slot for it.
  { id: 'moonfest', world: 'lantern', name: 'MOON FESTIVAL', icon: '🌕',
    from: [2, 5], to: [2, 21], accent: 0xffe9a8, flash: 'rgba(255,233,168,0.30)',
    line: 'the moon has accepted the invitation' },
  // high summer belongs to the resort
  { id: 'regatta', world: 'pirate', name: 'THE GREAT REGATTA', icon: '⛵',
    from: [7, 11], to: [7, 27], accent: 0x35d6ff, flash: 'rgba(53,214,255,0.28)',
    line: 'every boat in the bay, racing nowhere' },
  // season opener — the one weekend the whole town comes back
  { id: 'homecoming', world: 'gameday', name: 'HOMECOMING', icon: '🎉',
    from: [9, 4], to: [9, 20], accent: 0x6f8bff, flash: 'rgba(111,139,255,0.28)',
    line: 'the alumni are everywhere and so are the pennants' },
  // and October is Maple Falls, obviously
  { id: 'harvest', world: 'maple', name: 'HARVEST WEEK', icon: '🎃',
    from: [10, 17], to: [11, 2], accent: 0xff9a2e, flash: 'rgba(255,154,46,0.30)',
    line: 'the pumpkins have won' },
  // the valley owns the year's end: the first real December season, and the
  // one the wrap-the-new-year branch below was waiting for. School is shut.
  { id: 'snowday', world: 'powder', name: 'SNOW DAY', icon: '❄️',
    from: [12, 18], to: [1, 4], accent: 0xbfe4ff, flash: 'rgba(191,228,255,0.30)',
    line: 'all schools closed. all sledding mandatory.' },
  // SKYLARK FIELD, and it fills the year's biggest hole: between the Moon
  // Festival on 21 February and the Regatta on 11 July there was nothing at
  // all, four and a half months of no season in a game that sells them.
  //
  // THE NIGHT GLOW is what a balloon meet is actually famous for, and it is
  // the one evening nobody flies: the envelopes stand tethered after dark and
  // every burner on the field fires together on a count, so ninety-one
  // balloons light up from the inside at once. May is right for it — the
  // still evenings a glow needs, and far enough from the Regatta that the two
  // summer seasons do not crowd each other.
  { id: 'nightglow', world: 'skylark', name: 'THE NIGHT GLOW', icon: '🔥',
    from: [5, 16], to: [5, 31], accent: 0xffb347, flash: 'rgba(255,179,71,0.30)',
    line: 'every burner on the field, on the count of three' },
];

const EVENT_BY_ID = new Map(EVENTS.map((e) => [e.id, e]));

// month*100+day makes the window test one integer comparison, and the
// `fromKey > toKey` branch handles a window that wraps the new year (none in
// the table today, but the first December season would hit it silently).
const dayKey = (d: Date): number => (d.getMonth() + 1) * 100 + d.getDate();
const inWindow = (d: Date, ev: SeasonEvent): boolean => {
  const k = dayKey(d), a = ev.from[0] * 100 + ev.from[1], b = ev.to[0] * 100 + ev.to[1];
  return a <= b ? k >= a && k <= b : k >= a || k <= b;
};

/** Every season live right now (the table keeps windows apart, but nothing
 *  downstream is allowed to assume that). */
export const liveEvents = (d: Date = new Date()): SeasonEvent[] =>
  EVENTS.filter((ev) => inWindow(d, ev));

/** The season this world is in, or null. */
export const eventForWorld = (world: string, d: Date = new Date()): SeasonEvent | null =>
  EVENTS.find((ev) => ev.world === world && inWindow(d, ev)) ?? null;

/** Is this event id live? Stickers gate their placement on this. */
export const isEventLive = (id: string, d: Date = new Date()): boolean => {
  const ev = EVENT_BY_ID.get(id);
  return !!ev && inWindow(d, ev);
};

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
/** "ENDS NOV 2" — a date, deliberately not a countdown. */
export const eventEndLabel = (ev: SeasonEvent): string =>
  `ENDS ${MONTHS[ev.to[0] - 1]} ${ev.to[1]}`;

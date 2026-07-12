// Weekly "TOP VOIDS" leaderboard (Machine round) — the ranked-vs-humans feel.
// Deterministic per ISO week: the same seeded field everywhere, refreshed every
// Monday. The player climbs it with their best score of the week.
import { meta } from './meta';

export interface BoardRow { rank: number; name: string; flag: string; score: number; me: boolean; }

const NAMES = [
  'Kai', 'Luna', 'Maks', 'Ava', 'Rin', 'Zoe', 'Leo', 'Mia', 'Yuki', 'Bex',
  'Nova', 'Oda', 'Pia', 'Rex', 'Sol', 'Tao', 'Iris', 'Juno', 'Kira', 'Nia',
  'Orion', 'Puck', 'Quin', 'Suki', 'Vega', 'Wren', 'Ximo', 'Yara', 'Zed', 'Ash',
];
const FLAGS = ['🇯🇵', '🇧🇷', '🇵🇱', '🇺🇸', '🇰🇷', '🇩🇪', '🇫🇷', '🇬🇧', '🇮🇳', '🇲🇽', '🇨🇦', '🇪🇸', '🇮🇹', '🇸🇪', '🇳🇬', '🇦🇺', '🇹🇷', '🇳🇱', '🇵🇹', '🇦🇷'];

/** ISO week key like "2026-W28" — the board's seed and reset boundary. */
export function weekKey(d = new Date()): string {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((t.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function daysLeftInWeek(d = new Date()): number {
  const day = d.getDay() || 7; // Mon=1..Sun=7
  return 8 - day;
}

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Record a finished round; returns true if it's a new weekly best. */
export function submitWeeklyScore(score: number): boolean {
  const wk = weekKey();
  if (meta.data.weeklyKey !== wk) { meta.data.weeklyKey = wk; meta.data.weeklyBest = 0; }
  if (score > meta.data.weeklyBest) {
    meta.data.weeklyBest = score;
    meta.save();
    return true;
  }
  return false;
}

/** Full 26-row board for this week (25 seeded rivals + the player). */
export function weeklyBoard(): { rows: BoardRow[]; myRank: number; daysLeft: number } {
  const wk = weekKey();
  if (meta.data.weeklyKey !== wk) { meta.data.weeklyKey = wk; meta.data.weeklyBest = 0; meta.save(); }
  const rand = mulberry(hashStr(wk));
  const others: { name: string; flag: string; score: number }[] = [];
  const namePool = [...NAMES].sort(() => rand() - 0.5).slice(0, 25);
  for (let i = 0; i < 25; i++) {
    // plausible top-of-ladder curve: #1 around 9-12k, long tail to ~800
    const frac = i / 24;
    const top = 9000 + rand() * 3200;
    const score = Math.round((top * Math.pow(1 - frac, 1.7) + 800 * frac) / 10) * 10 + Math.floor(rand() * 9);
    others.push({ name: namePool[i], flag: FLAGS[Math.floor(rand() * FLAGS.length)], score });
  }
  const mine = { name: 'You', flag: '⭐', score: meta.data.weeklyBest };
  const all = [...others, mine].sort((a, b) => b.score - a.score);
  const rows: BoardRow[] = all.map((r, i) => ({ rank: i + 1, name: r.name, flag: r.flag, score: r.score, me: r.name === 'You' }));
  const myRank = rows.find((r) => r.me)?.rank ?? rows.length;
  return { rows, myRank, daysLeft: daysLeftInWeek() };
}

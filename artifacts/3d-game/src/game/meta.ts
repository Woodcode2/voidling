// v12 §5: Trophy tracking added to GameMeta

export interface TrophyCounters {
  totalBites: number;
  totalTriples: number;
  totalVoidsEaten: number;
  totalWins: number;
  bestRoundBites: number;
  bestDucks: number;
  gnomeLordTotal: number;
  bestDevoured: number;  // 0–100 (% of world area eaten)
  muncher: number;
  gobbler: number;
  devourer: number;
  worldEnder: number;
}

export interface GameMeta {
  coins: number;
  skinsOwned: string[];
  equippedSkin: string;
  streak: number;
  lastDailyDate: string;
  lastWinDate: string;   // Economy: first-win-of-the-day 2× tracking
  lastPlayDate: string;  // Economy: daily-bite bonus tracking
  stars: number;         // Retention: placement stars (hole.io ladder)
  highScore: number;
  removeAds: boolean;
  missions: { id: string; progress: number; completed: boolean }[];
  firstTime: boolean;
  firstFeastClaimed: boolean; // Second-session hook: one-time welcome bonus
  weeklyBest: number;   // Machine round: best score this ISO week (Top Voids board)
  weeklyKey: string;    // ISO week the weeklyBest belongs to
  xp: number;    // v7 §11: XP within the current level
  level: number; // v7 §11: player meta level (starts at 1)
  // v12 §5: trophies
  trophiesEarned: string[];
  trophyCounters: TrophyCounters;
}

const DEFAULT_TROPHY_COUNTERS: TrophyCounters = {
  totalBites: 0, totalTriples: 0, totalVoidsEaten: 0, totalWins: 0,
  bestRoundBites: 0, bestDucks: 0, gnomeLordTotal: 0, bestDevoured: 0,
  muncher: 0, gobbler: 0, devourer: 0, worldEnder: 0,
};

const DEFAULT_META: GameMeta = {
  coins: 0,
  skinsOwned: ['classic'],
  equippedSkin: 'classic',
  streak: 0,
  lastDailyDate: '',
  lastWinDate: '',
  lastPlayDate: '',
  stars: 0,
  highScore: 0,
  removeAds: false,
  missions: [],
  firstTime: true,
  firstFeastClaimed: false,
  weeklyBest: 0,
  weeklyKey: '',
  xp: 0,
  level: 1,
  trophiesEarned: [],
  trophyCounters: { ...DEFAULT_TROPHY_COUNTERS },
};

export const meta = {
  data: { ...DEFAULT_META, trophyCounters: { ...DEFAULT_TROPHY_COUNTERS } },

  load() {
    this.data = { ...DEFAULT_META, trophyCounters: { ...DEFAULT_TROPHY_COUNTERS } };
    const saved = localStorage.getItem('voidling_meta_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          this.data = { ...DEFAULT_META, trophyCounters: { ...DEFAULT_TROPHY_COUNTERS }, ...parsed };
        }
      } catch (e) {
        console.error("Failed to load meta");
      }
    }
    // coerce corrupt/legacy shapes back to safe defaults before use
    if (!Array.isArray(this.data.skinsOwned)) this.data.skinsOwned = [...DEFAULT_META.skinsOwned];
    if (!Array.isArray(this.data.missions)) this.data.missions = [];
    if (typeof this.data.equippedSkin !== 'string') this.data.equippedSkin = 'classic';
    if (typeof this.data.coins !== 'number' || !Number.isFinite(this.data.coins)) this.data.coins = 0;
    if (typeof this.data.firstFeastClaimed !== 'boolean') this.data.firstFeastClaimed = false;
    if (typeof this.data.weeklyBest !== 'number' || !Number.isFinite(this.data.weeklyBest)) this.data.weeklyBest = 0;
    if (typeof this.data.weeklyKey !== 'string') this.data.weeklyKey = '';
    if (typeof this.data.lastWinDate !== 'string') this.data.lastWinDate = '';
    if (typeof this.data.lastPlayDate !== 'string') this.data.lastPlayDate = '';
    if (typeof this.data.stars !== 'number' || !Number.isFinite(this.data.stars)) this.data.stars = 0;
    if (typeof this.data.xp !== 'number' || !Number.isFinite(this.data.xp)) this.data.xp = 0;
    if (typeof this.data.level !== 'number' || !Number.isFinite(this.data.level) || this.data.level < 1) this.data.level = 1;
    // v12 §5: migrate legacy saves without trophy fields
    if (!Array.isArray(this.data.trophiesEarned)) this.data.trophiesEarned = [];
    if (!this.data.trophyCounters || typeof this.data.trophyCounters !== 'object') {
      this.data.trophyCounters = { ...DEFAULT_TROPHY_COUNTERS };
    } else {
      // ensure all counter keys exist (forward compat for new trophies)
      this.data.trophyCounters = { ...DEFAULT_TROPHY_COUNTERS, ...this.data.trophyCounters };
    }
    // migrate legacy skin id 'default' -> 'classic'
    this.data.skinsOwned = this.data.skinsOwned.map((s) => (s === 'default' ? 'classic' : s));
    if (!this.data.skinsOwned.includes('classic')) this.data.skinsOwned.unshift('classic');
    if (this.data.equippedSkin === 'default') this.data.equippedSkin = 'classic';
    // never leave the player with an unowned skin equipped
    if (!this.data.skinsOwned.includes(this.data.equippedSkin)) this.data.equippedSkin = 'classic';
    // initialize missions if empty
    if (this.data.missions.length === 0) {
      this.generateMissions();
    }
  },

  save() {
    try {
      localStorage.setItem('voidling_meta_v1', JSON.stringify(this.data));
    } catch { /* storage unavailable (private mode / quota) — play session-only */ }
  },

  addCoins(amount: number) {
    this.data.coins += amount;
    this.save();
  },

  // v7 §11: grant XP (= floor(score/100)) and roll up any level-ups. Returns the
  // list of levels reached this call plus any freebies unlocked (e.g. L5 → Kitty).
  addXP(score: number): { levelsGained: number[]; unlocked: string[] } {
    const gain = Math.floor(score / 100);
    this.data.xp += gain;
    const levelsGained: number[] = [];
    const unlocked: string[] = [];
    // xpForLevel(n) = 500 + n*250 (kept in sync with utils.xpForLevel)
    let need = 500 + this.data.level * 250;
    while (this.data.xp >= need) {
      this.data.xp -= need;
      this.data.level += 1;
      levelsGained.push(this.data.level);
      if (this.data.level === 5 && !this.data.skinsOwned.includes('kitty')) {
        this.data.skinsOwned.push('kitty');
        unlocked.push('kitty');
      }
      need = 500 + this.data.level * 250;
    }
    this.save();
    return { levelsGained, unlocked };
  },

  unlockSkin(id: string) {
    if (!this.data.skinsOwned.includes(id)) {
      this.data.skinsOwned.push(id);
      this.save();
    }
  },

  equipSkin(id: string) {
    if (this.data.skinsOwned.includes(id)) {
      this.data.equippedSkin = id;
      this.save();
    }
  },

  generateMissions() {
    // Pick 3 random missions
    // In a real app this would rotate daily
    this.data.missions = [
      { id: 'eat_ducks', progress: 0, completed: false },
      { id: 'combo_4', progress: 0, completed: false },
      { id: 'tier_4', progress: 0, completed: false }
    ];
    this.save();
  },

  updateMission(id: string, amount: number) {
    const m = this.data.missions.find(x => x.id === id);
    if (m && !m.completed) {
      m.progress = Math.max(m.progress, amount); // or += depending on mission. for now, track max achieved per round or sum
      this.save();
    }
  },

  checkDailyStreak() {
    const today = new Date().toDateString();
    if (this.data.lastDailyDate === today) return; // already played
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (this.data.lastDailyDate === yesterday.toDateString()) {
      // contiguous
    } else if (this.data.lastDailyDate !== '') {
      // missed a day
      this.data.streak = 0;
    }
  },

  recordDaily() {
    const today = new Date().toDateString();
    if (this.data.lastDailyDate !== today) {
      this.data.streak += 1;
      this.data.lastDailyDate = today;
      this.save();
    }
  },

  // ── Retention: placement stars + rank ladder (hole.io model) ───────────────

  /** Stars by final placement: 1st=20, 2nd=10, 3rd=5, 4th=2, else 1. */
  addStars(placement: number): number {
    const gain = placement === 1 ? 20 : placement === 2 ? 10 : placement === 3 ? 5 : placement === 4 ? 2 : 1;
    this.data.stars += gain;
    this.save();
    return gain;
  },

  /** Current rank from lifetime stars. */
  rank(): { name: string; tier: number; next: number | null; nextName: string | null } {
    const LADDER: [string, number][] = [
      ['BRONZE', 0], ['SILVER', 60], ['GOLD', 160],
      ['DIAMOND', 320], ['PLATINUM', 560], ['MASTER', 900],
    ];
    let tier = 0;
    for (let i = 0; i < LADDER.length; i++) if (this.data.stars >= LADDER[i][1]) tier = i;
    return {
      name: LADDER[tier][0],
      tier,
      next: tier + 1 < LADDER.length ? LADDER[tier + 1][1] : null,
      nextName: tier + 1 < LADDER.length ? LADDER[tier + 1][0] : null,
    };
  },

  // ── Economy: daily bonuses (LoL model) ─────────────────────────────────────

  /** True until the player's first crowned win today (2× payout hook). */
  isFirstWinOfDay(): boolean {
    return this.data.lastWinDate !== new Date().toDateString();
  },

  recordWin() {
    this.data.lastWinDate = new Date().toDateString();
    this.save();
  },

  /** True until the first finished match today (daily-bite bonus hook). */
  isFirstPlayOfDay(): boolean {
    return this.data.lastPlayDate !== new Date().toDateString();
  },

  recordPlay() {
    this.data.lastPlayDate = new Date().toDateString();
    this.save();
  },

  // ── v12 §5: Trophy helpers ─────────────────────────────────────────────────

  /** Transient: trophies earned since last drain (engine reads for results). */
  recentTrophies: [] as string[],

  /** Mark a trophy as earned (no-op if already earned). Grants a one-time
   *  coin BOUNTY (retention: concrete goals pay out). Saves. */
  earnTrophy(id: string) {
    if (!this.data.trophiesEarned.includes(id)) {
      this.data.trophiesEarned.push(id);
      const BIG = new Set(['devoured_100pct', 'score_10000', 'form_world_ender', 'void_destroyer', 'daily_winner']);
      const bounty = BIG.has(id) ? 100 : 50;
      this.data.coins += bounty;
      this.recentTrophies.push(id);
      this.save();
      console.log(`[trophy] EARNED: ${id} (+${bounty}¢)`);
    }
  },

  /** Drain the transient earned-this-round list; returns total bounty paid. */
  drainRecentTrophies(): { count: number; bounty: number } {
    const BIG = new Set(['devoured_100pct', 'score_10000', 'form_world_ender', 'void_destroyer', 'daily_winner']);
    let bounty = 0;
    for (const id of this.recentTrophies) bounty += BIG.has(id) ? 100 : 50;
    const count = this.recentTrophies.length;
    this.recentTrophies = [];
    return { count, bounty };
  },

  /**
   * Update a lifetime counter.
   * mode 'max' — keep the highest value ever seen (e.g. best round score).
   * mode 'sum' — add to lifetime total (e.g. total voids eaten).
   */
  updateTrophyCounter(key: keyof TrophyCounters, value: number, mode: 'max' | 'sum') {
    if (mode === 'max') {
      if (value > (this.data.trophyCounters[key] ?? 0)) {
        (this.data.trophyCounters[key] as number) = value;
        this.save();
      }
    } else {
      (this.data.trophyCounters[key] as number) = (this.data.trophyCounters[key] ?? 0) + value;
      this.save();
    }
  },
};

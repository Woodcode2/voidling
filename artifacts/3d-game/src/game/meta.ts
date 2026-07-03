export interface GameMeta {
  coins: number;
  skinsOwned: string[];
  equippedSkin: string;
  streak: number;
  lastDailyDate: string;
  highScore: number;
  removeAds: boolean;
  missions: { id: string; progress: number; completed: boolean }[];
  firstTime: boolean;
}

const DEFAULT_META: GameMeta = {
  coins: 0,
  skinsOwned: ['classic'],
  equippedSkin: 'classic',
  streak: 0,
  lastDailyDate: '',
  highScore: 0,
  removeAds: false,
  missions: [],
  firstTime: true
};

export const meta = {
  data: { ...DEFAULT_META },

  load() {
    this.data = { ...DEFAULT_META };
    const saved = localStorage.getItem('voidling_meta_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          this.data = { ...DEFAULT_META, ...parsed };
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
    localStorage.setItem('voidling_meta_v1', JSON.stringify(this.data));
  },

  addCoins(amount: number) {
    this.data.coins += amount;
    this.save();
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
  }
};

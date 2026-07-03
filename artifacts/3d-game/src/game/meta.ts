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
  skinsOwned: ['default'],
  equippedSkin: 'default',
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
    const saved = localStorage.getItem('voidling_meta_v1');
    if (saved) {
      try {
        this.data = { ...DEFAULT_META, ...JSON.parse(saved) };
      } catch (e) {
        console.error("Failed to load meta");
      }
    }
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

export const CONFIG = {
  FPS: 60,
  TIMESTEP: 1000 / 60,
  GAME_DURATION: 90,
  COLORS: {
    bg: '#FDF6EC',
    ground: '#A8E6CF',
    path: '#FFD3B6',
    uiText: '#2B2140',
    primaryButton: '#6C5CE7',
    primaryButtonText: '#FFFFFF',
    voidlingBody: '#2B2140',
    voidlingGlow: '#8C7CFF',
    voidlingEyes: '#FFFFFF',
    pops: ['#FF8B94', '#FFDA77', '#6EB5FF', '#FFAAA5'],
    tiers: ['#FF8B94', '#FFDA77', '#6EB5FF', '#FFAAA5', '#D4A5FF']
  },
  MAP_SIZE: 3000,
  PLAYER_BASE_RADIUS: 22,
  ABSORB_SHRINK_TIME: 200,
  GROWTH_TIME: 250,
  MERGE_TIME: 300,
  COMBO_DECAY_TIME: 4000,
  ORBIT_RADIUS_OFFSET: 15,
  ORBIT_SPEED: 0.002,
  SKINS: [
    { id: 'default', name: 'Original', body: '#2B2140', glow: '#8C7CFF', cost: 0 },
    { id: 'cherry', name: 'Cherry', body: '#5C1D24', glow: '#FF8B94', cost: 300 },
    { id: 'sun', name: 'Solar', body: '#5C4300', glow: '#FFDA77', cost: 500 },
    { id: 'ocean', name: 'Ocean', body: '#002845', glow: '#6EB5FF', cost: 500 },
    { id: 'mint', name: 'Minty', body: '#1B4031', glow: '#A8E6CF', cost: 800 },
    { id: 'ghost', name: 'Phantom', body: '#E0E0E0', glow: '#FFFFFF', cost: 800 },
    { id: 'gold', name: 'Midas', body: '#B8860B', glow: '#FFD700', cost: 1200 },
    { id: 'premium', name: 'Nebula', body: '#1A0B2E', glow: '#FF00FF', cost: 1500 }
  ],
  MISSIONS: [
    { id: 'eat_ducks', desc: 'Eat 20 ducks', target: 20, reward: 50 },
    { id: 'tier_4', desc: 'Reach Tier 4 size', target: 1, reward: 100 },
    { id: 'combo_4', desc: 'Hit x4 combo', target: 4, reward: 80 },
    { id: 'devour_60', desc: 'Devour 60% of map', target: 60, reward: 150 }
  ],
  BOONS: [
    { id: 'magnet', name: 'Magnet', desc: 'Absorb reach +40%' },
    { id: 'overdrive', name: 'Overdrive', desc: 'Speed +25%' },
    { id: 'twin', name: 'Twin Merge', desc: 'Merges need 2 of a kind' },
    { id: 'time', name: 'Time Shard', desc: '+10 seconds' },
    { id: 'tremor', name: 'Tremor', desc: 'Bump big objects to shrink them 15%' },
    { id: 'greed', name: 'Greed', desc: 'All score x1.5' }
  ]
};

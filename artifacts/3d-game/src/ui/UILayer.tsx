import { useEffect, useRef, useState } from 'react';
import { CONFIG } from '../game/config';
import type { GameEngine, Snapshot } from '../game/engine';
import { audio } from '../game/audio';
import { StarField } from './StarField';
import { SkinPreview } from './SkinPreview';

// v16.2 build stamp — increment on every deploy
const BUILD_STAMP = 'v19 · 0';

// v12 §3: weekday names for the streak calendar
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MOD_ICONS: Record<string, string> = {
  zoom: '💨', gnome: '🧙', golden: '✨', tiny: '🔬', merge: '⚡', frenzy: '🔥', double: '2×',
};

// ── little inline icons (no image assets) ──────────────────────────────────────
function CoinIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="#C79A12" />
      <circle cx="12" cy="12" r="8.6" fill="#FFD23F" />
      <path d="M12 6.2l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z" fill="#C79A12" />
    </svg>
  );
}
function SoundIcon({ muted, size = 22 }: { muted: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 9v6h4l5 4V5L8 9H4z" fill="#fff" stroke="none" />
      {muted ? <path d="M17 8l5 8M22 8l-5 8" /> : <><path d="M16 8a5 5 0 0 1 0 8" /><path d="M18.5 6a8 8 0 0 1 0 12" /></>}
    </svg>
  );
}
function HelpIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9.2 9a2.8 2.8 0 1 1 4.3 2.4c-.9.6-1.5 1.1-1.5 2.1" />
      <circle cx="12" cy="17.4" r="0.4" fill="#fff" stroke="#fff" strokeWidth="1.2" />
    </svg>
  );
}
function CloseIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
function BackIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}
function PauseIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="1.5" />
      <rect x="14" y="5" width="4" height="14" rx="1.5" />
    </svg>
  );
}
function CrownIcon({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 48" aria-hidden="true">
      <path d="M6 44L2 12l16 12L32 4l14 20 16-12-4 32z" fill="#FFD23F" stroke="#C79A12" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="32" cy="20" r="4" fill="#FF3D68" />
    </svg>
  );
}

function Coins({ n }: { n: number }) {
  return (
    <div className="vd-coins"><CoinIcon /> {n.toLocaleString()}</div>
  );
}

// v6 §12: rarity tier derived from a skin's price
function rarityOf(cost: number): { key: string; label: string } {
  if (cost <= 0) return { key: 'starter', label: 'STARTER' };
  if (cost <= 700) return { key: 'common', label: 'COMMON' };
  if (cost <= 900) return { key: 'rare', label: 'RARE' };
  if (cost <= 1100) return { key: 'epic', label: 'EPIC' };
  return { key: 'legendary', label: 'LEGENDARY' };
}

// v6 §12: short-lived confetti burst (pure CSS pieces)
function Confetti() {
  const colors = ['#FFD23F', '#FF3D68', '#5AC8FF', '#1CC6AE', '#C77DFF'];
  const pieces = Array.from({ length: 18 }, (_, i) => ({
    x: 50 + (Math.random() * 2 - 1) * 30,
    dx: (Math.random() * 2 - 1) * 160,
    dy: -120 - Math.random() * 120,
    rot: Math.random() * 540 - 270,
    color: colors[i % colors.length],
    delay: Math.random() * 0.06,
  }));
  return (
    <div className="vd-confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{
            left: `${p.x}%`,
            background: p.color,
            // custom props consumed by the keyframes
            ['--dx' as string]: `${p.dx}px`,
            ['--dy' as string]: `${p.dy}px`,
            ['--rot' as string]: `${p.rot}deg`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

// ── screens ────────────────────────────────────────────────────────────────────
// v12 §3: Splash screen — animated voidling drop, shown 1800ms on first mount
// v14 §4: Splash screen with optional full-bleed splash.png (1.0→1.04 slow zoom).
// If no splash.png is found the existing starfield + voidling fallback is shown.
function Splash({ snap, onDone }: { snap: Snapshot; onDone: () => void }) {
  const [hasSplash, setHasSplash] = useState(true); // optimistic — hide on error
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    // v14.1: prime the AudioContext on first user-visible frame (counts as a gesture on iOS)
    audio.init();
    audio.loadSamples().catch(() => {});
    // Rebuild Prompt 10: show splash art 4s, then fade smoothly (500ms) into the menu.
    const t = window.setTimeout(() => setFadingOut(true), 4000);
    const t2 = window.setTimeout(onDone, 4500);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [onDone]);

  const skip = () => {
    audio.init();
    audio.loadSamples().catch(() => {});
    import('tone').then((T) => T.start()).catch(() => {});
    onDone(); // Prompt 10 §Stage1: tap-to-skip advances immediately, no fade wait
  };

  return (
    <div
      className="vd-overlay vd-overlay--solid vd-splash"
      onClick={skip}
      role="button"
      aria-label="Tap to skip"
      style={{
        overflow: 'hidden',
        opacity: fadingOut ? 0 : 1,
        transition: 'opacity 500ms ease',
      }}
    >
      {/* Rebuild Prompt 10: dedicated splash art, scaled to cover with no distortion */}
      {hasSplash && (
        <img
          src="/assets/splash_screen.jpg"
          alt=""
          aria-hidden="true"
          onError={() => setHasSplash(false)}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Fallback starfield when splash art fails to load */}
      {!hasSplash && (
        <>
          <StarField />
          <div className="vd-splash-inner" style={{ position: 'relative', zIndex: 2 }}>
            <div className="vd-splash-void">
              <SkinPreview skinId={snap.equippedSkin} size={140} glow={1} />
            </div>
            <h1 className="vd-splash-title">VOIDLING</h1>
            <p className="vd-splash-tag">EAT. GROW. DEVOUR.</p>
            <p style={{
              marginTop: 28, fontSize: '0.95rem', letterSpacing: '0.14em',
              color: 'rgba(255,255,255,0.72)', fontWeight: 700, textTransform: 'uppercase',
              animation: 'vd-pulse 1.8s ease-in-out infinite',
            }}>TAP TO START</p>
          </div>
        </>
      )}
    </div>
  );
}

// v12 §5: Trophy Room — 18 trophy definitions + earned/locked grid
const TROPHY_DEFS = [
  { id: 'first_win',         icon: '👑', name: 'Champion',        desc: 'Win your first round.' },
  { id: 'score_1000',        icon: '🌟', name: 'Rising Star',     desc: 'Score 1,000 in a round.' },
  { id: 'score_5000',        icon: '💫', name: 'Superstar',       desc: 'Score 5,000 in a round.' },
  { id: 'score_10000',       icon: '🏆', name: 'Legend',          desc: 'Score 10,000 in a round.' },
  { id: 'form_bite',         icon: '😋', name: 'First Bite',      desc: 'Evolve past NIBBLE.' },
  { id: 'form_devourer',     icon: '🦷', name: 'Devourer',        desc: 'Reach the DEVOURER form.' },
  { id: 'form_world_ender',  icon: '🌌', name: 'World Ender',     desc: 'Reach the WORLD ENDER form.' },
  { id: 'devoured_50pct',    icon: '🗺️', name: 'Half the Town',   desc: 'Devour 50% of the world.' },
  { id: 'devoured_100pct',   icon: '💀', name: 'Town Gone',       desc: 'Devour 100% of the world.' },
  { id: 'duck_5',            icon: '🦆', name: 'Duck Collector',  desc: 'Eat 5 ducks in one round.' },
  { id: 'combo_10',          icon: '⚡', name: 'Chain Chomp',     desc: 'Reach a 10-bite combo.' },
  { id: 'triple_combo',      icon: '🔱', name: 'Triple Threat',   desc: 'Land 3 TRIPLE combos in a round.' },
  { id: 'void_eater',        icon: '💥', name: 'Void Eater',      desc: 'Devour a rival voidling.' },
  { id: 'void_destroyer',    icon: '☄️', name: 'Void Destroyer',  desc: 'Devour 5 rivals in rounds.' },
  { id: 'daily_player',      icon: '📅', name: 'Daily Regular',   desc: 'Play a Daily Bite.' },
  { id: 'daily_winner',      icon: '🗓️', name: 'Daily Champ',     desc: 'Win a Daily Bite.' },
  { id: 'gnome_lord',        icon: '🧙', name: 'Gnome Lord',      desc: 'Eat every gnome in a round.' },
  { id: 'zoo_break',         icon: '🦁', name: 'Zoo Break',       desc: 'Smash the zoo gate.' },
  { id: 'democracy',         icon: '🏛️', name: 'Democracy Devoured', desc: 'Eat the town hall.' },
];

function TrophyRoom({ snap, onClose }: { snap: Snapshot; onClose: () => void }) {
  const earned = snap.trophies?.earned ?? [];
  return (
    <div className="vd-overlay vd-overlay--solid">
      <StarField />
      <div className="vd-topbar">
        <button className="vd-icon-btn" onClick={onClose} aria-label="Close"><BackIcon /></button>
        <span className="vd-topbar-title">TROPHY ROOM</span>
        <span className="vd-trophy-count">{earned.length}/{TROPHY_DEFS.length}</span>
      </div>
      <div className="vd-trophy-grid">
        {TROPHY_DEFS.map((t) => {
          const has = earned.includes(t.id);
          return (
            <div key={t.id} className={`vd-trophy-card${has ? '' : ' vd-trophy-card--locked'}`}>
              <div className="vd-trophy-icon">{has ? t.icon : '🔒'}</div>
              <div className="vd-trophy-name">{has ? t.name : '???'}</div>
              {has && <div className="vd-trophy-desc">{t.desc}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Home({ snap, engine, onHelp, onPlay, onTrophies }: { snap: Snapshot; engine: GameEngine; onHelp: () => void; onPlay: () => void; onTrophies: () => void }) {
  return (
    <div className="vd-overlay vd-overlay--solid" onPointerDown={() => engine.unlockAudio()}>
      <StarField />
      <div className="vd-topbar">
        <Coins n={snap.coins} />
        <div className="vd-topbar-right">
          <button className="vd-icon-btn" onClick={onHelp} aria-label="How to play"><HelpIcon /></button>
          <button className="vd-icon-btn" onClick={() => engine.toggleMute()} aria-label="Toggle sound">
            <SoundIcon muted={snap.muted} />
          </button>
        </div>
      </div>
      <div className="vd-stack">
        <div className="vd-hero-void">
          <SkinPreview skinId={snap.equippedSkin} size={196} glow={0.8} />
        </div>
        <h1 className="vd-title">VOIDLING</h1>
        <p className="vd-tagline">{CONFIG.HOME_TAGLINE}</p>
        {snap.planName && (
          <p style={{
            fontSize: 10, letterSpacing: '0.12em', fontFamily: 'monospace',
            color: 'rgba(255,255,255,0.42)', marginTop: -10, userSelect: 'none',
          }}>TODAY: {snap.planName} DAY</p>
        )}
        {/* v7 §11: player level badge + name pill */}
        <div className="vd-namepill"><span className="vd-lvbadge">Lv{snap.level}</span> You</div>
        {snap.highScore > 0 && (
          <div className="vd-plaque"><span className="vd-plaque-label">BEST</span> {snap.highScore.toLocaleString()}</div>
        )}
        <button className="vd-btn vd-btn--play vd-btn--pulse" onClick={onPlay}>PLAY</button>
        <div className="vd-row">
          <button className="vd-btn vd-btn--secondary vd-btn--sm" onClick={() => engine.openDaily()}>DAILY BITE</button>
          <button className="vd-btn vd-btn--secondary vd-btn--sm" onClick={() => engine.openShop()}>SHOP</button>
          <button className="vd-btn vd-btn--secondary vd-btn--sm" onClick={onTrophies}>🏆</button>
        </div>
      </div>
      {/* v14.1: permanent build stamp — bottom-right, 10px */}
      <span style={{
        position: 'absolute', bottom: 6, right: 10,
        fontSize: 10, color: 'rgba(255,255,255,0.28)',
        fontFamily: 'monospace', pointerEvents: 'none', userSelect: 'none',
      }}>{BUILD_STAMP}</span>
    </div>
  );
}

// ── v14.1 Sound-board debug panel (shown when ?debug=1 in URL) ────────────────
function SoundBoard({ snap, engine }: { snap: Snapshot; engine: GameEngine }) {
  const [vols, setVols] = useState<Record<string, number>>(() =>
    Object.fromEntries(audio.SAMPLE_CONFIGS.map((s) => [s.name, s.vol]))
  );
  // Update RADII display 2×/sec
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(id);
  }, []);

  const play = (name: string, rate: number) => {
    audio.init();
    audio._playSample(name, rate, vols[name] ?? 0.5);
  };

  const lawCeiling = snap.screen === 'game'
    ? (snap.radii.length > 0 ? 'tracking' : '—')
    : '—';

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
      background: 'rgba(10,8,24,0.96)', borderTop: '1px solid #3a3060',
      padding: '10px 12px 14px', overflowY: 'auto', maxHeight: '70vh',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ color: '#9AAFC8', fontSize: 11, fontFamily: 'monospace', letterSpacing: '0.06em' }}>
          🎮 DEBUG PANEL · {BUILD_STAMP}
        </span>
        <span style={{ color: '#4a4070', fontSize: 10, fontFamily: 'monospace' }}>?debug=1 to toggle</span>
      </div>

      {/* ── §0 RADII ─────────────────────────────────────── */}
      <div style={{ marginBottom: 10, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '8px 10px' }}>
        <div style={{ color: '#7BFFED', fontSize: 11, fontFamily: 'monospace', marginBottom: 6, letterSpacing: '0.06em' }}>
          📐 RADII · law ceiling = {lawCeiling}
        </div>
        {snap.radii.length === 0
          ? <span style={{ color: '#4a4070', fontSize: 11, fontFamily: 'monospace' }}>Start a round to see live data</span>
          : snap.radii.map((v) => (
            <div key={v.name} style={{
              display: 'grid', gridTemplateColumns: '80px 60px 60px 70px', gap: 6,
              color: v.overLaw ? '#FF6B6B' : '#CBD5E0',
              fontSize: 12, fontFamily: 'monospace', marginBottom: 3,
            }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</span>
              <span>r={v.radius.toFixed(1)}</span>
              <span>m={v.mass}</span>
              <span>#{v.score}</span>
            </div>
          ))
        }
      </div>

      {/* ── §1 HITBOXES ───────────────────────────────────── */}
      <div style={{ marginBottom: 10, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={snap.showHitboxes}
            onChange={() => engine.toggleHitboxes()}
            style={{ accentColor: '#00FFAA', width: 16, height: 16, cursor: 'pointer' }}
          />
          <span style={{ color: '#00FFAA', fontSize: 12, fontFamily: 'monospace', letterSpacing: '0.06em' }}>
            🔲 SHOW HITBOXES
          </span>
        </label>
        <span style={{ color: '#4a4070', fontSize: 10, fontFamily: 'monospace' }}>contact_scale=0.90 · overrides: tree/house 0.85 · sky 0.80</span>
      </div>

      {/* ── §2 MUSIC ─────────────────────────────────────── */}
      <div style={{ marginBottom: 10, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '8px 10px' }}>
        <div style={{ color: '#FFD23F', fontSize: 11, fontFamily: 'monospace', marginBottom: 6, letterSpacing: '0.06em' }}>🎵 MUSIC</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#CBD5E0', fontSize: 12, fontFamily: 'monospace', width: 90 }}>MUSIC GAIN</span>
          <input
            type="range" min={0} max={0.5} step={0.01}
            defaultValue={0.22}
            onChange={(e) => audio.setMusicGain(Number(e.target.value))}
            style={{ flex: 1, height: 28, accentColor: '#FFD23F', cursor: 'pointer' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <span style={{ color: '#CBD5E0', fontSize: 12, fontFamily: 'monospace', width: 90 }}>SFX GAIN</span>
          <input
            type="range" min={0} max={1} step={0.01}
            defaultValue={0.5}
            onChange={(e) => audio.setSfxGain(Number(e.target.value))}
            style={{ flex: 1, height: 28, accentColor: '#FFD23F', cursor: 'pointer' }}
          />
        </div>
      </div>

      {/* ── 🔊 SOUNDS ────────────────────────────────────── */}
      <div style={{ color: '#9AAFC8', fontSize: 11, fontFamily: 'monospace', marginBottom: 6, letterSpacing: '0.06em' }}>🔊 SOUNDS</div>
      <div style={{ display: 'grid', gap: 6 }}>
        {audio.SAMPLE_CONFIGS.map((s) => (
          <div key={s.name} style={{
            display: 'grid', gridTemplateColumns: '130px 48px 1fr', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '8px 10px',
          }}>
            <span style={{ color: '#CBD5E0', fontSize: 13, fontFamily: 'monospace' }}>{s.name}</span>
            <button
              onClick={() => play(s.name, s.rate)}
              style={{
                background: '#4F3FD1', border: 'none', borderRadius: 6, color: '#fff',
                fontSize: 18, padding: '6px 10px', cursor: 'pointer', lineHeight: 1,
              }}
              aria-label={`Play ${s.name}`}
            >▶</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="range" min={0} max={1} step={0.01}
                value={vols[s.name] ?? s.vol}
                onChange={(e) => setVols((prev) => ({ ...prev, [s.name]: Number(e.target.value) }))}
                style={{ flex: 1, height: 28, accentColor: '#7C3AED', cursor: 'pointer' }}
              />
              <span style={{ color: '#9AAFC8', fontSize: 11, fontFamily: 'monospace', width: 34, textAlign: 'right' }}>
                {((vols[s.name] ?? s.vol) * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Shop({ snap, engine }: { snap: Snapshot; engine: GameEngine }) {
  const [denied, setDenied] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [iap, setIap] = useState<string | null>(null); // v7 §9: mock IAP modal
  const [toast, setToast] = useState<string | null>(null);
  const [confetti, setConfetti] = useState(0);
  const timers = useRef<number[]>([]);

  // clear any pending timers on unmount so we don't set state after navigation
  useEffect(() => () => { timers.current.forEach((id) => clearTimeout(id)); timers.current = []; }, []);
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };

  const showToast = (msg: string) => {
    setToast(msg);
    later(() => setToast(null), 1600);
  };

  const buy = (id: string) => {
    const res = engine.buySkin(id);
    if (res.ok) {
      const skin = CONFIG.SKINS.find((s) => s.id === id);
      setConfetti((c) => c + 1);
      showToast(`${skin?.name ?? 'Skin'} unlocked!`);
      engine.equipSkin(id);
    } else {
      setDenied(id);
      later(() => setDenied(null), 320);
    }
  };

  const previewSkin = preview ? CONFIG.SKINS.find((s) => s.id === preview) : null;

  return (
    <div className="vd-overlay vd-overlay--solid">
      <StarField />
      <div className="vd-topbar">
        <button className="vd-icon-btn" onClick={() => engine.goHome()} aria-label="Back"><BackIcon /></button>
        <Coins n={snap.coins} />
      </div>
      <div className="vd-stack vd-shop-list">
        <h2 className="vd-heading">SHOP</h2>
        <div className="vd-grid">
          {CONFIG.SKINS.filter((s) => !s.premium).map((skin) => {
            const owned = snap.ownedSkins.includes(skin.id);
            const equipped = snap.equippedSkin === skin.id;
            const rar = rarityOf(skin.cost);
            return (
              <button
                key={skin.id}
                className={
                  'vd-card vd-card--btn' +
                  ` vd-rar--${rar.key}` +
                  (equipped ? ' vd-card--equipped' : '') +
                  (!owned ? ' vd-card--locked' : '')
                }
                onClick={() => setPreview(skin.id)}
                style={denied === skin.id ? { animation: 'vd-twinkle 0.3s' } : undefined}
              >
                <span className={`vd-rarity vd-rarity--${rar.key}`}>{rar.label}</span>
                <div className="vd-skinwrap"><SkinPreview skinId={skin.id} size={92} glow={0.4} /></div>
                <div className="vd-skin-name">{skin.name}</div>
                {equipped ? (
                  <span className="vd-tag vd-tag--on">EQUIPPED</span>
                ) : owned ? (
                  <span className="vd-tag vd-tag--equip">OWNED</span>
                ) : (
                  <span className="vd-tag vd-tag--buy"><CoinIcon size={14} /> {skin.cost}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* v7 §9: PREMIUM cash-skin row (mock IAP) */}
        <h3 className="vd-shop-subhead">PREMIUM</h3>
        <div className="vd-grid">
          {CONFIG.SKINS.filter((s) => s.premium).map((skin) => {
            const owned = snap.ownedSkins.includes(skin.id);
            const equipped = snap.equippedSkin === skin.id;
            return (
              <button
                key={skin.id}
                className={'vd-card vd-card--btn vd-rar--premium' + (equipped ? ' vd-card--equipped' : '') + (!owned ? ' vd-card--locked' : '')}
                onClick={() => { if (owned) { engine.equipSkin(skin.id); } else { engine.iapView(skin.id); setIap(skin.id); } }}
              >
                <span className="vd-rarity vd-rarity--premium">PREMIUM</span>
                <div className="vd-skinwrap"><SkinPreview skinId={skin.id} size={92} glow={0.4} /></div>
                <div className="vd-skin-name">{skin.name}</div>
                {equipped ? (
                  <span className="vd-tag vd-tag--on">EQUIPPED</span>
                ) : owned ? (
                  <span className="vd-tag vd-tag--equip">OWNED</span>
                ) : (
                  <span className="vd-tag vd-tag--cash">${skin.priceUSD?.toFixed(2)}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* v7 §9: mock IAP modal */}
      {iap && (() => {
        const s = CONFIG.SKINS.find((x) => x.id === iap);
        if (!s) return null;
        return (
          <div className="vd-modal-scrim" onClick={() => setIap(null)}>
            <div className="vd-modal vd-rar--premium" onClick={(e) => e.stopPropagation()}>
              <button className="vd-modal-close" onClick={() => setIap(null)} aria-label="Close"><CloseIcon /></button>
              <span className="vd-rarity vd-rarity--premium">PREMIUM</span>
              <div className="vd-modal-void"><SkinPreview skinId={s.id} size={168} glow={0.7} /></div>
              <h3 className="vd-modal-name">{s.name}</h3>
              <p className="vd-sub">Unlock instantly + 100 bonus coins</p>
              <button
                className="vd-btn vd-btn--play"
                onClick={() => { engine.iapPurchase(s.id); setConfetti((c) => c + 1); showToast(`${s.name} unlocked!`); setIap(null); }}
              >
                ${s.priceUSD?.toFixed(2)} · BUY
              </button>
              <p className="vd-fineprint">Mock purchase — no real charge.</p>
            </div>
          </div>
        );
      })()}

      {/* v6 §12: skin preview modal */}
      {previewSkin && (() => {
        const owned = snap.ownedSkins.includes(previewSkin.id);
        const equipped = snap.equippedSkin === previewSkin.id;
        const afford = snap.coins >= previewSkin.cost;
        const rar = rarityOf(previewSkin.cost);
        return (
          <div className="vd-modal-scrim" onClick={() => setPreview(null)}>
            <div className={`vd-modal vd-rar--${rar.key}`} onClick={(e) => e.stopPropagation()}>
              <button className="vd-modal-close" onClick={() => setPreview(null)} aria-label="Close"><CloseIcon /></button>
              <span className={`vd-rarity vd-rarity--${rar.key}`}>{rar.label}</span>
              <div className="vd-modal-void"><SkinPreview skinId={previewSkin.id} size={168} glow={0.7} /></div>
              <h3 className="vd-modal-name">{previewSkin.name}</h3>
              {equipped ? (
                <button className="vd-btn vd-btn--ghost" disabled>EQUIPPED</button>
              ) : owned ? (
                <button className="vd-btn vd-btn--secondary" onClick={() => { engine.equipSkin(previewSkin.id); setPreview(null); }}>EQUIP</button>
              ) : (
                <button
                  className="vd-btn vd-btn--play"
                  disabled={!afford}
                  onClick={() => { buy(previewSkin.id); setPreview(null); }}
                >
                  <CoinIcon size={20} /> {afford ? `BUY · ${previewSkin.cost}` : `NEED ${previewSkin.cost}`}
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {confetti > 0 && <Confetti key={confetti} />}
      {toast && <div className="vd-toast">{toast}</div>}
    </div>
  );
}

function Results({ snap, engine }: { snap: Snapshot; engine: GameEngine }) {
  const r = snap.results;
  if (!r) return null;
  return (
    <div className="vd-overlay vd-overlay--scrim">
      <div className="vd-stack">
        {r.crown ? <CrownIcon size={76} /> : null}
        <h2 className="vd-heading">{r.crown ? 'CHAMPION!' : `#${r.placement} of ${r.total}`}</h2>
        <div className="vd-big-num">{r.score.toLocaleString()}</div>
        {r.newBest && <span className="vd-badge">NEW BEST!</span>}
        {r.reachedForm && (
          <div className="vd-reached">
            {r.district
              ? `Ended as ${r.reachedForm} in ${r.district}`
              : `Reached: ${r.reachedForm}`}
          </div>
        )}
        {r.district && !r.reachedForm && <div className="vd-reached">Finished in {r.district}</div>}
        {r.gnomeLord && <div className="vd-reached">👑 GNOME LORD — ate every gnome!</div>}
        {r.killedBy && (
          <div className="vd-reached" style={{ color: '#FF7070' }}>
            💀 Devoured by {r.killedBy}
          </div>
        )}
        <div style={{ width: '100%', maxWidth: 320, marginTop: 8 }}>
          <div className="vd-stat-row"><span>Placement</span><span>#{r.placement}</span></div>
          <div className="vd-stat-row"><span>Devoured</span><span>{r.devoured.toFixed(0)}%</span></div>
          <div className="vd-stat-row"><span>Coins earned</span><span>+{r.coins}</span></div>
          {r.isDaily && <div className="vd-stat-row"><span>Daily streak</span><span>{snap.streak}🔥</span></div>}
        </div>
        {/* v7 §11: XP bar + level-up flourish */}
        <div className="vd-xp">
          {r.leveledTo != null && <div className="vd-levelup">LEVEL {r.leveledTo}!</div>}
          <div className="vd-xp-head">
            <span>Lv{r.level}</span>
            <span>+{r.xpGain} XP</span>
          </div>
          <div className="vd-xp-track">
            <div className="vd-xp-fill" style={{ width: `${Math.min(100, (r.xpInLevel / r.xpNext) * 100)}%` }} />
          </div>
          <div className="vd-xp-sub">{r.xpInLevel} / {r.xpNext} to Lv{r.level + 1}</div>
        </div>
        {r.leveledTo != null && <Confetti key={`lvl-${r.leveledTo}`} />}
        {r.skinTease && (
          <div className="vd-tease" onClick={() => engine.openShop()}>
            <span className="vd-tease-name">{r.skinTease.botName}</span> flexed the <b>{r.skinTease.skinName}</b> skin — grab it in the Shop!
          </div>
        )}
        <button className="vd-btn vd-btn--play" onClick={() => engine.start(r.isDaily)}>PLAY AGAIN</button>
        <button className="vd-btn vd-btn--ghost" onClick={() => engine.goHome()}>HOME</button>
      </div>
    </div>
  );
}

function Boon({ snap, engine }: { snap: Snapshot; engine: GameEngine }) {
  return (
    <div className="vd-overlay vd-overlay--scrim">
      <div className="vd-stack">
        <h2 className="vd-heading">CHOOSE A BOON</h2>
        <p className="vd-sub">Pick a power to keep chomping</p>
        {snap.boonChoices.map((b) => (
          <button
            key={b.id}
            className="vd-boon"
            onClick={() => engine.chooseBoon(b.id)}
          >
            <h3>{b.name}</h3>
            <p>{b.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// v12 §4: Daily Bite v2 — weekday calendar + mod icon
const DAILY_MOD_IDS = ['zoom', 'gnome', 'golden', 'tiny', 'merge', 'frenzy', 'double'];
function Daily({ snap, engine }: { snap: Snapshot; engine: GameEngine }) {
  const d = snap.daily;
  const today = new Date().getDay(); // 0=Sun
  return (
    <div className="vd-overlay vd-overlay--solid">
      <StarField />
      <div className="vd-topbar">
        <button className="vd-icon-btn" onClick={() => engine.goHome()} aria-label="Back"><BackIcon /></button>
        <Coins n={snap.coins} />
      </div>
      <div className="vd-stack">
        <h2 className="vd-heading">DAILY BITE</h2>
        <p className="vd-sub">Streak: {snap.streak} day{snap.streak === 1 ? '' : 's'} 🔥</p>
        {/* v12 §4: 7-day week calendar */}
        <div className="vd-week">
          {WEEKDAYS.map((day, i) => (
            <div key={i} className={`vd-week-day${i === today ? ' vd-week-day--today' : ''}`}>
              <span className="vd-week-icon">{MOD_ICONS[DAILY_MOD_IDS[i]] ?? '?'}</span>
              <span className="vd-week-label">{day}</span>
            </div>
          ))}
        </div>
        <div className="vd-card" style={{ width: '100%', maxWidth: 360, padding: 22 }}>
          <div className="vd-skin-name" style={{ fontSize: 24, color: '#FFD23F' }}>
            {MOD_ICONS[d?.id ?? ''] ?? ''} {d?.name}
          </div>
          <p className="vd-sub" style={{ opacity: 0.95 }}>{d?.desc}</p>
        </div>
        <button className="vd-btn vd-btn--play" onClick={() => engine.start(true)}>PLAY</button>
      </div>
    </div>
  );
}

// v16 §5: news ticker — slim animated bar that scrolls across the bottom during play
function NewsTicker({ line }: { line: string }) {
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      height: 28,
      background: 'rgba(10,8,24,0.88)',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      display: 'flex', alignItems: 'center',
      overflow: 'hidden',
      zIndex: 90,
      pointerEvents: 'none',
    }}>
      {/* Label badge */}
      <div style={{
        flexShrink: 0, paddingLeft: 8, paddingRight: 6, marginRight: 8,
        fontSize: 8, fontWeight: 800, letterSpacing: '0.12em',
        color: '#FFD23F', textTransform: 'uppercase', whiteSpace: 'nowrap',
        borderRight: '1px solid rgba(255,215,63,0.25)',
      }}>📰 BREAKING</div>
      {/* Scrolling text */}
      <div style={{
        flex: 1, overflow: 'hidden',
        fontSize: 10, color: 'rgba(255,255,255,0.88)', fontWeight: 600,
        letterSpacing: '0.04em', whiteSpace: 'nowrap',
        animation: 'vd-ticker-scroll 12s linear forwards',
      }}>
        {line}
      </div>
    </div>
  );
}

// Rebuild Prompt 10 §Stage2: brief centered intro at match start — welcome line, then a
// coaching line — each fades in and out on its own, never blocks input (pointer-events: none).
// Both lines are mounted together and timed purely via CSS animation-delay (not React state/
// setTimeout swaps): match start can coincide with heavy asset-decode work (sprite sheets load
// right as the round begins), and a busy main thread can coalesce back-to-back setTimeout
// callbacks into a single paint, skipping a phase entirely. A CSS timeline can't be skipped
// that way — the browser always shows whatever keyframe % corresponds to real elapsed time.
function MatchIntro({ visible }: { visible: boolean }) {
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Safety-net unmount well after both lines have finished fading (harmless if delayed —
    // both are already invisible by then).
    const t = window.setTimeout(() => setDone(true), 10000);
    return () => clearTimeout(t);
  }, []);

  if (done) return null;

  return (
    <div
      className="vd-match-intro"
      aria-hidden="true"
      style={{ visibility: visible ? 'visible' : 'hidden' }}
    >
      <div className="vd-match-intro-text vd-intro-welcome">
        <div className="vd-intro-line1">Welcome to New Earth</div>
        <div className="vd-intro-line2">It's time to eat.</div>
      </div>
      <div className="vd-match-intro-text vd-intro-coach">
        Eat smaller things to grow and feed your void.
      </div>
    </div>
  );
}

function GameControls({ snap, engine }: { snap: Snapshot; engine: GameEngine }) {
  return (
    <div className="vd-game-ui">
      {/* pause + sound pills, top-right */}
      {!snap.paused && (
        <div className="vd-hud-pills">
          <button className="vd-pause-pill" onClick={() => engine.togglePause()} aria-label="Pause">
            <PauseIcon />
          </button>
          <button className="vd-pause-pill" onClick={() => engine.toggleMute()} aria-label="Toggle sound">
            <SoundIcon muted={snap.muted} />
          </button>
        </div>
      )}
      {/* v16 §5: round contracts — live-ticking chips at top-left under the score */}
      {!snap.paused && snap.contracts && snap.contracts.length > 0 && (
        <div style={{
          position: 'fixed', top: 252, left: 10,
          display: 'flex', flexDirection: 'column', gap: 4,
          pointerEvents: 'none', zIndex: 40,
        }}>
          {snap.contracts.map((c) => (
            <div key={c.id} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: c.done ? 'rgba(123,255,237,0.18)' : 'rgba(10,8,24,0.72)',
              border: `1px solid ${c.done ? '#7BFFED' : 'rgba(255,255,255,0.12)'}`,
              borderRadius: 8, padding: '3px 7px',
              fontSize: 9, fontWeight: 700, letterSpacing: '0.04em',
              color: c.done ? '#7BFFED' : 'rgba(255,255,255,0.65)',
              transition: 'all 0.3s',
            }}>
              <span>{c.done ? '✓' : '○'}</span>
              <span style={{ textDecoration: c.done ? 'line-through' : 'none' }}>{c.name}</span>
              <span style={{ opacity: 0.6, marginLeft: 2 }}>+{c.reward}¢</span>
            </div>
          ))}
        </div>
      )}
      {/* Death Rules Pivot: powers removed entirely — no active-power HUD badge */}
      {/* Fix 7: news ticker removed (garbled scroll) — events routed to banner pill */}
      {snap.paused && (
        <div className="vd-overlay vd-overlay--dim vd-pause-overlay">
          <div className="vd-sheet">
            <h2 className="vd-heading">PAUSED</h2>
            <button className="vd-btn vd-btn--play" onClick={() => engine.togglePause()}>RESUME</button>
            <button className="vd-btn vd-btn--secondary" onClick={() => engine.toggleMusic()}>
              {snap.musicOn ? 'MUSIC: ON' : 'MUSIC: OFF'}
            </button>
            <button className="vd-btn vd-btn--secondary" onClick={() => engine.toggleSfx()}>
              {snap.sfxOn ? 'SFX: ON' : 'SFX: OFF'}
            </button>
            <button className="vd-btn vd-btn--ghost" onClick={() => engine.goHome()}>QUIT ROUND</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Phase 7a §5: rewritten guide cards matching new mechanics
const ONBOARD_PANELS = [
  {
    skin: 'classic',
    title: 'DRAG TO MOVE',
    body: 'Drag anywhere on screen to move. Eat anything smaller than you.',
    hint: 'Everything edible gets pulled into your orbit automatically',
    spriteKind: 'flower',
  },
  {
    skin: 'devil',
    title: 'GROW TO EVOLVE',
    body: 'Eat enough to evolve through five forms. Gold ring = you can eat it. Red ring = RUN.',
    hint: 'Watch the rim color — green means safe, red means danger',
    spriteKind: 'house',
  },
  {
    skin: 'wizard',
    title: 'POWERS ARE AUTOMATIC',
    body: "Don't fall off the island. Grab a power pickup and it fires on its own — no button needed.",
    hint: 'Stay on the island. Grab every power you see.',
    spriteKind: 'tree',
  },
];

function Onboarding({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const panel = ONBOARD_PANELS[i];
  const last = i === ONBOARD_PANELS.length - 1;
  return (
    <div className="vd-overlay vd-overlay--scrim vd-onboard">
      <button className="vd-onboard-skip" onClick={onDone}>SKIP</button>
      <div className="vd-stack">
        <div className="vd-hero-void" style={{ position: 'relative' }}>
          <SkinPreview key={panel.skin} skinId={panel.skin} size={150} glow={0.7} />
          {/* sprite icon floating bottom-right of the voidling */}
          <img
            src={`/assets/objects/${panel.spriteKind}.png`}
            alt=""
            aria-hidden="true"
            style={{
              position: 'absolute', bottom: 0, right: 4,
              width: 52, height: 52, objectFit: 'contain',
              imageRendering: 'pixelated',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
            }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
        <h2 className="vd-heading">{panel.title}</h2>
        <p className="vd-onboard-body">{panel.body}</p>
        <p style={{ color: '#9AAFC8', fontSize: '0.78rem', margin: '0 0 4px', letterSpacing: '0.04em' }}>
          {panel.hint}
        </p>
        <div className="vd-dots">
          {ONBOARD_PANELS.map((_, k) => (
            <span key={k} className={'vd-dot' + (k === i ? ' vd-dot--on' : '')} />
          ))}
        </div>
        <button className="vd-btn vd-btn--play" onClick={() => (last ? onDone() : setI(i + 1))}>
          {last ? "LET'S GO" : 'NEXT'}
        </button>
      </div>
    </div>
  );
}

const ONBOARD_KEY = 'vd_onboarded';

export function UILayer({ snap, engine }: { snap: Snapshot; engine: GameEngine }) {
  const [showOnboard, setShowOnboard] = useState(false);
  // v12 §3: splash screen — shown once on first mount, cleared at 1800ms or on tap
  const [showSplash, setShowSplash] = useState(true);
  // v12 §5: trophy room local state
  const [showTrophies, setShowTrophies] = useState(false);
  // v14.1: debug sound-board — enabled by ?debug=1 in the URL
  const debugMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1';

  // Rebuild Prompt 10 §Stage2: fires the welcome/coaching intro exactly once per real
  // match start (engine.start()), never on boon-pick/resume transitions that also
  // touch snap.screen. Lives at this top level so it survives internal screen swaps.
  const lastMatchSeq = useRef(-1);
  const [introSeq, setIntroSeq] = useState<number | null>(null);
  useEffect(() => {
    if (snap.matchStartSeq !== lastMatchSeq.current) {
      const first = lastMatchSeq.current === -1;
      lastMatchSeq.current = snap.matchStartSeq;
      if (!first) setIntroSeq(snap.matchStartSeq);
    }
  }, [snap.matchStartSeq]);

  // v9 §7: onboarding fires on the FIRST PLAY tap (before the first countdown),
  // never on home load. When it finishes we start the game. The "?" replays it
  // without auto-starting. This ref carries the action to run after the intro.
  const afterOnboard = useRef<null | (() => void)>(null);

  const finishOnboard = () => {
    setShowOnboard(false);
    const next = afterOnboard.current;
    afterOnboard.current = null;
    // Only the first PLAY-triggered intro marks onboarding complete + starts the
    // game. The "?" replay path leaves the flag alone so the real first PLAY still
    // shows the intro.
    if (next) {
      try { localStorage.setItem(ONBOARD_KEY, '1'); } catch { /* ignore */ }
      next();
    }
  };

  const handlePlay = () => {
    // v14.1: first user gesture — ensure AudioContext is live and samples are decoding
    audio.init();
    audio.loadSamples().catch(() => {});
    let seen = true;
    try { seen = localStorage.getItem(ONBOARD_KEY) === '1'; } catch { /* ignore */ }
    if (!seen) { afterOnboard.current = () => engine.start(false); setShowOnboard(true); }
    else engine.start(false);
  };

  // v12 §3: show splash before any other screen on first mount
  if (showSplash) {
    return <Splash snap={snap} onDone={() => setShowSplash(false)} />;
  }

  // v12 §5: trophy room overlays everything
  if (showTrophies) {
    return <TrophyRoom snap={snap} onClose={() => setShowTrophies(false)} />;
  }

  let screen: React.ReactNode = null;
  switch (snap.screen) {
    case 'home': screen = <Home snap={snap} engine={engine} onHelp={() => setShowOnboard(true)} onPlay={handlePlay} onTrophies={() => setShowTrophies(true)} />; break;
    case 'shop': screen = <Shop snap={snap} engine={engine} />; break;
    case 'results': screen = <Results snap={snap} engine={engine} />; break;
    case 'boon': screen = <Boon snap={snap} engine={engine} />; break;
    case 'dailyIntro': screen = <Daily snap={snap} engine={engine} />; break;
    case 'game': screen = <GameControls snap={snap} engine={engine} />; break;
    default: screen = null;
  }

  return (
    <>
      {screen}
      {introSeq === snap.matchStartSeq && <MatchIntro key={introSeq} visible={snap.screen === 'game'} />}
      {showOnboard && <Onboarding onDone={finishOnboard} />}
      {debugMode && <SoundBoard snap={snap} engine={engine} />}
    </>
  );
}

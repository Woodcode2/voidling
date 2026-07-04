import { useEffect, useRef, useState } from 'react';
import { CONFIG } from '../game/config';
import type { GameEngine, Snapshot } from '../game/engine';
import { StarField } from './StarField';
import { SkinPreview } from './SkinPreview';

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
function Home({ snap, engine, onHelp, onPlay }: { snap: Snapshot; engine: GameEngine; onHelp: () => void; onPlay: () => void }) {
  return (
    <div className="vd-overlay vd-overlay--solid">
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
        {/* v7 §11: player level badge + name pill */}
        <div className="vd-namepill"><span className="vd-lvbadge">Lv{snap.level}</span> You</div>
        {snap.highScore > 0 && (
          <div className="vd-plaque"><span className="vd-plaque-label">BEST</span> {snap.highScore.toLocaleString()}</div>
        )}
        <button className="vd-btn vd-btn--play vd-btn--pulse" onClick={onPlay}>PLAY</button>
        <div className="vd-row">
          <button className="vd-btn vd-btn--secondary vd-btn--sm" onClick={() => engine.openDaily()}>DAILY BITE</button>
          <button className="vd-btn vd-btn--secondary vd-btn--sm" onClick={() => engine.openShop()}>SHOP</button>
        </div>
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
        {r.reachedForm && <div className="vd-reached">Reached: {r.reachedForm}</div>}
        {r.gnomeLord && <div className="vd-reached">👑 GNOME LORD — ate every gnome!</div>}
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
          <button key={b.id} className="vd-boon" onClick={() => engine.chooseBoon(b.id)}>
            <h3>{b.name}</h3>
            <p>{b.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function Daily({ snap, engine }: { snap: Snapshot; engine: GameEngine }) {
  const d = snap.daily;
  return (
    <div className="vd-overlay vd-overlay--solid">
      <StarField />
      <div className="vd-topbar">
        <button className="vd-icon-btn" onClick={() => engine.goHome()} aria-label="Back"><BackIcon /></button>
        <Coins n={snap.coins} />
      </div>
      <div className="vd-stack">
        <h2 className="vd-heading">DAILY BITE</h2>
        <p className="vd-sub">Streak: {snap.streak} day{snap.streak === 1 ? '' : 's'}</p>
        <div className="vd-card" style={{ width: '100%', maxWidth: 360, padding: 22 }}>
          <div className="vd-skin-name" style={{ fontSize: 24, color: '#FFD23F' }}>{d?.name}</div>
          <p className="vd-sub" style={{ opacity: 0.95 }}>{d?.desc}</p>
        </div>
        <button className="vd-btn vd-btn--play" onClick={() => engine.start(true)}>PLAY</button>
      </div>
    </div>
  );
}

function GameControls({ snap, engine }: { snap: Snapshot; engine: GameEngine }) {
  return (
    <div className="vd-game-ui">
      {/* single 40px pause pill, top-right — no floating buttons over the arena */}
      {!snap.paused && (
        <button className="vd-pause-pill" onClick={() => engine.togglePause()} aria-label="Pause">
          <PauseIcon />
        </button>
      )}
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

// v6 §13: first-launch (replayable) 3-panel onboarding
const ONBOARD_PANELS = [
  { skin: 'classic', title: 'EAT TO GROW', body: 'Swallow anything smaller than you. The more you eat, the bigger you get.' },
  { skin: 'devil', title: 'DODGE THE BIG ONES', body: 'Bigger voidlings will eat YOU. Keep clear until you outgrow them.' },
  { skin: 'wizard', title: 'EVOLVE & WIN', body: 'Grow through forms, trigger world events, and top the board before time runs out.' },
];

function Onboarding({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const panel = ONBOARD_PANELS[i];
  const last = i === ONBOARD_PANELS.length - 1;
  return (
    <div className="vd-overlay vd-overlay--scrim vd-onboard">
      <button className="vd-onboard-skip" onClick={onDone}>SKIP</button>
      <div className="vd-stack">
        <div className="vd-hero-void"><SkinPreview key={panel.skin} skinId={panel.skin} size={150} glow={0.7} /></div>
        <h2 className="vd-heading">{panel.title}</h2>
        <p className="vd-onboard-body">{panel.body}</p>
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
    let seen = true;
    try { seen = localStorage.getItem(ONBOARD_KEY) === '1'; } catch { /* ignore */ }
    if (!seen) { afterOnboard.current = () => engine.start(false); setShowOnboard(true); }
    else engine.start(false);
  };

  let screen: React.ReactNode = null;
  switch (snap.screen) {
    case 'home': screen = <Home snap={snap} engine={engine} onHelp={() => setShowOnboard(true)} onPlay={handlePlay} />; break;
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
      {showOnboard && <Onboarding onDone={finishOnboard} />}
    </>
  );
}

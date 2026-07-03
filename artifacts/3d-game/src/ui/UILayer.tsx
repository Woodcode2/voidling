import { useState } from 'react';
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

// ── screens ────────────────────────────────────────────────────────────────────
function Home({ snap, engine }: { snap: Snapshot; engine: GameEngine }) {
  return (
    <div className="vd-overlay vd-overlay--solid">
      <StarField />
      <div className="vd-topbar">
        <Coins n={snap.coins} />
        <button className="vd-icon-btn" onClick={() => engine.toggleMute()} aria-label="Toggle sound">
          <SoundIcon muted={snap.muted} />
        </button>
      </div>
      <div className="vd-stack">
        <SkinPreview skinId={snap.equippedSkin} size={168} glow={0.7} />
        <h1 className="vd-title">VOIDLING</h1>
        {snap.highScore > 0 && <p className="vd-sub">Best: {snap.highScore.toLocaleString()}</p>}
        <button className="vd-btn vd-btn--play" onClick={() => engine.start(false)}>PLAY</button>
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
          {CONFIG.SKINS.map((skin) => {
            const owned = snap.ownedSkins.includes(skin.id);
            const equipped = snap.equippedSkin === skin.id;
            const afford = snap.coins >= skin.cost;
            return (
              <div
                key={skin.id}
                className={
                  'vd-card' +
                  (equipped ? ' vd-card--equipped' : '') +
                  (!owned ? ' vd-card--locked' : '')
                }
                style={denied === skin.id ? { animation: 'vd-twinkle 0.3s' } : undefined}
              >
                <div className="vd-skinwrap"><SkinPreview skinId={skin.id} size={92} glow={0.4} /></div>
                <div className="vd-skin-name">{skin.name}</div>
                {equipped ? (
                  <span className="vd-tag vd-tag--on">EQUIPPED</span>
                ) : owned ? (
                  <button className="vd-tag vd-tag--equip" onClick={() => engine.equipSkin(skin.id)}>EQUIP</button>
                ) : (
                  <button
                    className="vd-tag vd-tag--buy"
                    disabled={!afford}
                    onClick={() => {
                      const res = engine.buySkin(skin.id);
                      if (!res.ok) { setDenied(skin.id); setTimeout(() => setDenied(null), 320); }
                    }}
                  >
                    <CoinIcon size={14} /> {skin.cost}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
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
        <div style={{ width: '100%', maxWidth: 320, marginTop: 8 }}>
          <div className="vd-stat-row"><span>Placement</span><span>#{r.placement}</span></div>
          <div className="vd-stat-row"><span>Devoured</span><span>{r.devoured.toFixed(0)}%</span></div>
          <div className="vd-stat-row"><span>Coins earned</span><span>+{r.coins}</span></div>
          {r.isDaily && <div className="vd-stat-row"><span>Daily streak</span><span>{snap.streak}🔥</span></div>}
        </div>
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
      <div className="vd-controls">
        <button className="vd-icon-btn" onClick={() => engine.toggleMute()} aria-label="Toggle sound">
          <SoundIcon muted={snap.muted} />
        </button>
        <button className="vd-icon-btn" onClick={() => engine.goHome()} aria-label="Leave round">
          <CloseIcon />
        </button>
      </div>
    </div>
  );
}

export function UILayer({ snap, engine }: { snap: Snapshot; engine: GameEngine }) {
  switch (snap.screen) {
    case 'home': return <Home snap={snap} engine={engine} />;
    case 'shop': return <Shop snap={snap} engine={engine} />;
    case 'results': return <Results snap={snap} engine={engine} />;
    case 'boon': return <Boon snap={snap} engine={engine} />;
    case 'dailyIntro': return <Daily snap={snap} engine={engine} />;
    case 'game': return <GameControls snap={snap} engine={engine} />;
    default: return null;
  }
}

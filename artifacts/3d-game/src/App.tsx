import { useCallback, useEffect, useRef, useState } from 'react';
import { createGame, type GameEngine, type Snapshot } from './game/engine';
import { UILayer } from './ui/UILayer';
import { DebugPanel } from './ui/DebugPanel';
import { preloadSprites } from './game/sprites';

// v10 §1: fire-and-forget sprite preload at app boot
preloadSprites(import.meta.env.BASE_URL);

const DEBUG = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1';
// Stage 13 §1: ?debug=photo → show full-island photo-mode capture overlay
const PHOTO_MODE = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === 'photo';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoReady, setPhotoReady] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = createGame(canvasRef.current);
    engineRef.current = engine;
    setSnap(engine.getSnapshot());
    const unsub = engine.subscribe(() => setSnap(engine.getSnapshot()));

    // Stage 13 §1: in photo mode, start a match so the world generates, then capture.
    if (PHOTO_MODE) {
      engine.start(false);
      // Give the world + ground buffer one rAF to bake before capturing.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const url = engine.capturePhoto();
          setPhotoUrl(url);
          setPhotoReady(true);
          // Post to /api/map-png so GET /map.png also works.
          if (url) {
            fetch(url)
              .then(r => r.blob())
              .then(blob => {
                const form = new FormData();
                form.append('file', blob, 'map.png');
                // Convert dataURL → binary and POST to Vite dev route.
                const byteStr = atob(url.split(',')[1]);
                const ab = new Uint8Array(byteStr.length);
                for (let i = 0; i < byteStr.length; i++) ab[i] = byteStr.charCodeAt(i);
                fetch(`${import.meta.env.BASE_URL}api/map-png`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'image/png' },
                  body: ab,
                }).catch(() => {/* dev-server route not available in prod */});
              })
              .catch(() => {});
          }
        });
      });
    }

    return () => {
      unsub();
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  const handleCaptureClick = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const url = engine.capturePhoto();
    setPhotoUrl(url);
    setPhotoReady(true);
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="vd-canvas" />
      {snap && engineRef.current && <UILayer snap={snap} engine={engineRef.current} />}
      {DEBUG && <DebugPanel />}

      {/* Stage 13 §1: photo-mode overlay */}
      {PHOTO_MODE && (
        <div style={{
          position: 'fixed', inset: 0, background: '#0a0818',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, gap: 16,
        }}>
          {photoReady && photoUrl ? (
            <>
              <img
                src={photoUrl}
                alt="Island map"
                style={{ maxWidth: '96vmin', maxHeight: '82vmin', borderRadius: 8, boxShadow: '0 4px 32px #000a' }}
              />
              <div style={{ display: 'flex', gap: 12 }}>
                <a
                  href={photoUrl}
                  download="map.png"
                  style={{
                    padding: '10px 24px', background: '#7BFFED', color: '#0a0818',
                    borderRadius: 6, fontWeight: 700, textDecoration: 'none', fontSize: 15,
                  }}
                >
                  💾 Save map.png
                </a>
                <button
                  onClick={handleCaptureClick}
                  style={{
                    padding: '10px 24px', background: '#9B7FFF', color: '#fff',
                    borderRadius: 6, fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: 15,
                  }}
                >
                  🔄 Recapture
                </button>
              </div>
              <p style={{ color: '#7BFFED', fontSize: 13, opacity: 0.7 }}>
                Dev server: GET <code style={{ opacity: 1 }}>{import.meta.env.BASE_URL}map.png</code> also works.
              </p>
            </>
          ) : (
            <p style={{ color: '#7BFFED', fontSize: 18 }}>Rendering island map…</p>
          )}
        </div>
      )}
    </>
  );
}

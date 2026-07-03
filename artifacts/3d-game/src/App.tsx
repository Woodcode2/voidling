import { useEffect, useRef, useState } from 'react';
import { createGame, type GameEngine, type Snapshot } from './game/engine';
import { UILayer } from './ui/UILayer';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [snap, setSnap] = useState<Snapshot | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = createGame(canvasRef.current);
    engineRef.current = engine;
    setSnap(engine.getSnapshot());
    const unsub = engine.subscribe(() => setSnap(engine.getSnapshot()));
    return () => {
      unsub();
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="vd-canvas" />
      {snap && engineRef.current && <UILayer snap={snap} engine={engineRef.current} />}
    </>
  );
}

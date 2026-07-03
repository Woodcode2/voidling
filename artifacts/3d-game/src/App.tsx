import { useEffect, useRef } from 'react';
import { initGame } from './game/main';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!canvasRef.current) return;
    const cleanup = initGame(canvasRef.current);
    return cleanup;
  }, []);
  
  return (
    <canvas
      ref={canvasRef}
      id="game-canvas"
      style={{ display: 'block', width: '100%', height: '100%', touchAction: 'none' }}
    />
  );
}

import { useMemo } from 'react';

// Decorative twinkling starfield (+ occasional shooting stars) for the menus.
export function StarField({ count = 46 }: { count?: number }) {
  const stars = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: Math.random() * 2 + 1,
        delay: Math.random() * 4,
        dur: 2 + Math.random() * 3,
      })),
    [count],
  );
  // v6 §11: a few shooting stars streaking across the menu backdrop
  const shooters = useMemo(
    () =>
      Array.from({ length: 3 }, (_, i) => ({
        top: 8 + Math.random() * 50,
        left: Math.random() * 60,
        delay: i * 3 + Math.random() * 3,
        dur: 1.1 + Math.random() * 0.7,
      })),
    [],
  );
  return (
    <div className="vd-stars" aria-hidden="true">
      {stars.map((s, i) => (
        <span
          key={i}
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.dur}s`,
          }}
        />
      ))}
      {shooters.map((s, i) => (
        <i
          key={`sh${i}`}
          className="vd-shooting"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.dur}s`,
          }}
        />
      ))}
    </div>
  );
}

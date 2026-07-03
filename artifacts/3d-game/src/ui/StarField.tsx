import { useMemo } from 'react';

// Decorative twinkling starfield for the menu screens.
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
    </div>
  );
}

export const track = (event: string, props: any = {}) => {
  console.log(`[Analytics] ${event}`, props);
  // Stub for actual tracking
  let queue: unknown[] = [];
  try {
    const raw = JSON.parse(localStorage.getItem('voidling_events') || '[]');
    if (Array.isArray(raw)) queue = raw;
  } catch {
    // corrupt queue — start fresh
  }
  queue.push({ event, props, time: Date.now() });
  if (queue.length > 50) queue.shift();
  try {
    localStorage.setItem('voidling_events', JSON.stringify(queue));
  } catch {
    // storage full/unavailable — ignore
  }
};

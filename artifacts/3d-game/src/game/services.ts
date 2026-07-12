import { logEvent } from './analytics';

// Machine round: track() now feeds the REAL analytics pipeline (Supabase edge
// ingest, batched). The local ring buffer is kept for offline debugging.
export const track = (event: string, props: any = {}) => {
  logEvent(event, props);
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

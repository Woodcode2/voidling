import { createRoot } from 'react-dom/client';

import App from './App';

import './index.css';
import './ui.css';

// v5 §2: suppress the long-press callout menu and pinch/gesture zoom on touch.
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('gesturestart' as keyof DocumentEventMap, (e: Event) => e.preventDefault());

if (import.meta.env.PROD) {
  // Production: register the PWA service worker for offline + installability.
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.log('SW registration failed: ', err);
      });
    });
  }
} else if ('serviceWorker' in navigator) {
  // Development: never let a service worker cache the dev server. Unregister any
  // existing worker and clear its caches so the preview always shows fresh code.
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => reg.unregister());
  });
  if (window.caches) {
    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
  }
}

createRoot(document.getElementById('root')!).render(<App />);

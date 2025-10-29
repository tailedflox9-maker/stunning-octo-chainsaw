import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { inject } from '@vercel/analytics';
import App from './App.tsx';
import './index.css';

// Initialize Vercel Analytics
inject();

// Service Worker update checker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then(registration => {
    // Check for updates every 5 minutes
    setInterval(() => {
      registration.update();
    }, 5 * 60 * 1000);

    // Listen for new service worker
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available
            if (confirm('A new version is available! Reload to update?')) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
              window.location.reload();
            }
          }
        });
      }
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

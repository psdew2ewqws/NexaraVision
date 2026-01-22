'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/logger';

/**
 * Service Worker Registration Component
 * Registers the PWA service worker for offline caching
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // Only register in production
    if (process.env.NODE_ENV !== 'production') {
      logger.debug('[SW] Skipping service worker in development');
      return;
    }

    // Register service worker
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        logger.debug('[SW] Service worker registered:', registration.scope);

        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000); // Check every hour
      })
      .catch((error) => {
        logger.error('[SW] Service worker registration failed:', error);
      });

    // Handle updates
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      logger.debug('[SW] Service worker updated');
    });
  }, []);

  return null;
}

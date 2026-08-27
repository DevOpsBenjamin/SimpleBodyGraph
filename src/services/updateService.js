import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';

/**
 * UpdateService manages Service Worker registration, cache busting,
 * and lifecycle events to keep the Capacitor Android WebView and Web PWA
 * always synchronized with Cloudflare Pages deployments.
 */

let swRegistration = null;
let isReloading = false;
let updateListenersInitialized = false;

/**
 * Check if the current environment supports Service Workers.
 */
export function isServiceWorkerSupported() {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
}

/**
 * Register Service Worker with strict no-cache policy and attach update handlers.
 * @param {Object} options
 * @param {Function} [options.onUpdateAvailable] Callback triggered when a new version is waiting to activate
 * @param {boolean} [options.autoReload=true] Whether to automatically reload when a new controller takes over
 * @returns {Promise<ServiceWorkerRegistration|null>}
 */
export async function registerServiceWorker(options = {}) {
  if (!isServiceWorkerSupported()) {
    console.info('[UpdateService] Service Workers not supported in this environment');
    return null;
  }

  const { onUpdateAvailable, autoReload = true } = options;

  try {
    // updateViaCache: 'none' ensures browser always checks the server for sw.js updates
    const registration = await navigator.serviceWorker.register('/sw.js', {
      updateViaCache: 'none'
    });

    swRegistration = registration;
    console.info('[UpdateService] Service Worker registered:', registration.scope);

    // If there is already a waiting worker, notify or activate
    if (registration.waiting) {
      if (typeof onUpdateAvailable === 'function') {
        onUpdateAvailable({
          registration,
          applyUpdate: () => applyUpdate(registration)
        });
      } else {
        applyUpdate(registration);
      }
    }

    // Listen for new worker installation
    registration.addEventListener('updatefound', () => {
      const installingWorker = registration.installing;
      if (!installingWorker) return;

      installingWorker.addEventListener('statechange', () => {
        if (installingWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // A new version has been installed
            console.info('[UpdateService] New version installed and ready.');
            if (typeof onUpdateAvailable === 'function') {
              onUpdateAvailable({
                registration,
                applyUpdate: () => applyUpdate(registration)
              });
            } else {
              applyUpdate(registration);
            }
          }
        }
      });
    });

    // Handle controller change (when new worker activates)
    if (autoReload) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (isReloading) return;
        isReloading = true;
        console.info('[UpdateService] Controller changed, reloading page to apply update...');
        if (typeof window !== 'undefined' && window.location) {
          window.location.reload();
        }
      });
    }

    // Attach lifecycle listeners (Capacitor resume & Web visibility change)
    attachLifecycleListeners();

    return registration;
  } catch (error) {
    console.warn('[UpdateService] Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Instruct waiting service worker to skip waiting and activate immediately.
 * @param {ServiceWorkerRegistration} [reg]
 */
export function applyUpdate(reg = swRegistration) {
  if (reg && reg.waiting) {
    reg.waiting.postMessage({ type: 'SKIP_WAITING' });
  } else if (typeof window !== 'undefined' && window.location) {
    window.location.reload();
  }
}

/**
 * Manually trigger a check for updates against the Cloudflare Pages server.
 * @returns {Promise<boolean>} Whether the update check succeeded
 */
export async function checkForAppUpdates() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    console.debug('[UpdateService] Device is offline, skipping update check');
    return false;
  }

  if (swRegistration && typeof swRegistration.update === 'function') {
    try {
      console.debug('[UpdateService] Checking for updates via ServiceWorker registration...');
      await swRegistration.update();
      return true;
    } catch (error) {
      console.debug('[UpdateService] Update check failed:', error);
      return false;
    }
  }

  return false;
}

/**
 * Attach listeners to Capacitor app resume and browser visibility change events.
 */
export function attachLifecycleListeners() {
  if (updateListenersInitialized) return;
  updateListenersInitialized = true;

  // 1. Capacitor Native App Resume Listener
  try {
    if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('App')) {
      CapApp.addListener('appStateChange', async (state) => {
        if (state && state.isActive) {
          console.info('[UpdateService] App resumed (Capacitor foreground), checking Cloudflare updates...');
          await checkForAppUpdates();
        }
      });
    }
  } catch (err) {
    console.debug('[UpdateService] Could not attach Capacitor appStateChange listener:', err);
  }

  // 2. Web Document Visibility Listener
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'visible') {
        console.info('[UpdateService] Page became visible, checking Cloudflare updates...');
        await checkForAppUpdates();
      }
    });
  }

  // 3. Online Network Reconnection Listener
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('online', async () => {
      console.info('[UpdateService] Network back online, checking Cloudflare updates...');
      await checkForAppUpdates();
    });
  }
}

/**
 * Helper to reset internal state (used for testing).
 */
export function _resetUpdateServiceState() {
  swRegistration = null;
  isReloading = false;
  updateListenersInitialized = false;
}

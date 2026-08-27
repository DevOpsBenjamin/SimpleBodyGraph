import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';

/**
 * UpdateService manages Service Worker registration, cache busting,
 * GitHub Release APK update checks, and lifecycle events to keep both
 * Capacitor Android WebView and Web PWA synchronized with the latest version.
 */

export const CURRENT_APP_VERSION = '1.3.0';

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
 * Compare two semver strings (e.g. '1.3.0' vs '1.2.0' or 'v1.4.0' vs '1.3.0').
 * Returns 1 if v1 > v2, -1 if v1 < v2, and 0 if v1 === v2.
 */
export function compareSemver(v1, v2) {
  if (!v1 || !v2) return 0;

  const clean1 = String(v1).replace(/^v/i, '').split('-')[0].trim();
  const clean2 = String(v2).replace(/^v/i, '').split('-')[0].trim();

  const parts1 = clean1.split('.').map(p => parseInt(p, 10) || 0);
  const parts2 = clean2.split('.').map(p => parseInt(p, 10) || 0);

  const maxLen = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < maxLen; i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }

  return 0;
}

/**
 * Get current application version from Capacitor Native App info or fallback to CURRENT_APP_VERSION.
 */
export async function getCurrentAppVersion() {
  try {
    if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('App')) {
      const info = await CapApp.getInfo();
      if (info && info.version) {
        return info.version;
      }
    }
  } catch (err) {
    console.debug('[UpdateService] Could not retrieve native App info:', err);
  }
  return CURRENT_APP_VERSION;
}

/**
 * Check latest GitHub release for SimpleBodyGraph and determine if an APK update is available.
 * @param {Object} [options]
 * @param {string} [options.repo='DevOpsBenjamin/SimpleBodyGraph']
 * @param {string} [options.currentVersion]
 * @param {Function} [options.fetchFn]
 * @returns {Promise<{hasUpdate: boolean, latestVersion: string, currentVersion: string, tagName: string, releaseName: string, releaseUrl: string, apkUrl: string, releaseNotes: string}|{hasUpdate: false, error: string, currentVersion: string}>}
 */
export async function checkGitHubRelease(options = {}) {
  const {
    repo = 'DevOpsBenjamin/SimpleBodyGraph',
    currentVersion = null,
    fetchFn = typeof fetch !== 'undefined' ? fetch : null
  } = options;

  const effectiveCurrentVersion = currentVersion || await getCurrentAppVersion();

  if (!fetchFn) {
    return { hasUpdate: false, error: 'Fetch not available', currentVersion: effectiveCurrentVersion };
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { hasUpdate: false, error: 'Device is offline', currentVersion: effectiveCurrentVersion };
  }

  try {
    const res = await fetchFn(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers: {
        Accept: 'application/vnd.github.v3+json'
      }
    });

    if (!res.ok) {
      return {
        hasUpdate: false,
        error: `GitHub API returned ${res.status}`,
        currentVersion: effectiveCurrentVersion
      };
    }

    const data = await res.json();
    const tagName = data.tag_name || '';
    const latestVersion = tagName.replace(/^v/i, '').trim();
    const hasUpdate = compareSemver(latestVersion, effectiveCurrentVersion) > 0;

    let apkUrl = `https://github.com/${repo}/releases/latest/download/SimpleBodyGraph.apk`;
    if (Array.isArray(data.assets)) {
      const apkAsset = data.assets.find(a => a.name && a.name.endsWith('.apk'));
      if (apkAsset && apkAsset.browser_download_url) {
        apkUrl = apkAsset.browser_download_url;
      }
    }

    return {
      hasUpdate,
      latestVersion,
      currentVersion: effectiveCurrentVersion,
      tagName,
      releaseName: data.name || tagName,
      releaseUrl: data.html_url || `https://github.com/${repo}/releases/latest`,
      apkUrl,
      releaseNotes: data.body || '',
      publishedAt: data.published_at
    };
  } catch (error) {
    console.debug('[UpdateService] Failed to check GitHub releases:', error);
    return {
      hasUpdate: false,
      error: error.message || 'Unknown network error',
      currentVersion: effectiveCurrentVersion
    };
  }
}

/**
 * Open APK download URL in external browser / system handler.
 * @param {string} [url]
 */
export async function openApkDownload(url = 'https://github.com/DevOpsBenjamin/SimpleBodyGraph/releases/latest/download/SimpleBodyGraph.apk') {
  if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Browser')) {
    try {
      await Browser.open({ url, windowName: '_system' });
      return;
    } catch (err) {
      console.warn('[UpdateService] Browser.open failed, fallback to window.open:', err);
    }
  }
  if (typeof window !== 'undefined') {
    window.open(url, '_system') || window.open(url, '_blank');
  }
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
 * Attach listeners to Capacitor app resume, browser visibility change, and online events.
 * @param {Object} [options]
 * @param {Function} [options.onAppResume]
 */
export function attachLifecycleListeners(options = {}) {
  if (updateListenersInitialized) return;
  updateListenersInitialized = true;

  const { onAppResume } = options;

  // 1. Capacitor Native App Resume Listener
  try {
    if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('App')) {
      CapApp.addListener('appStateChange', async (state) => {
        if (state && state.isActive) {
          console.info('[UpdateService] App resumed (Capacitor foreground), checking updates...');
          await checkForAppUpdates();
          if (typeof onAppResume === 'function') {
            try {
              await onAppResume();
            } catch (e) {
              console.debug('[UpdateService] onAppResume handler error:', e);
            }
          }
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
        console.info('[UpdateService] Page became visible, checking updates...');
        await checkForAppUpdates();
        if (typeof onAppResume === 'function') {
          try {
            await onAppResume();
          } catch (e) {
            console.debug('[UpdateService] onAppResume handler error:', e);
          }
        }
      }
    });
  }

  // 3. Online Network Reconnection Listener
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('online', async () => {
      console.info('[UpdateService] Network back online, checking updates...');
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

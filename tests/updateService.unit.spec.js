import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
    isPluginAvailable: vi.fn(() => true)
  }
}));

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn(),
    getInfo: vi.fn()
  }
}));

vi.mock('@capacitor/browser', () => ({
  Browser: {
    open: vi.fn(),
    close: vi.fn()
  }
}));

import {
  isServiceWorkerSupported,
  registerServiceWorker,
  applyUpdate,
  checkForAppUpdates,
  attachLifecycleListeners,
  compareSemver,
  getCurrentAppVersion,
  checkGitHubRelease,
  openApkDownload,
  CURRENT_APP_VERSION,
  _resetUpdateServiceState
} from '../src/services/updateService';

describe('UpdateService Module', () => {
  const originalNavigator = global.navigator;
  const originalWindow = global.window;
  const originalDocument = global.document;

  beforeEach(() => {
    _resetUpdateServiceState();
    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true
    });
    Object.defineProperty(global, 'window', {
      value: originalWindow,
      configurable: true,
      writable: true
    });
    Object.defineProperty(global, 'document', {
      value: originalDocument,
      configurable: true,
      writable: true
    });
  });

  describe('compareSemver', () => {
    it('correctly compares version numbers', () => {
      expect(compareSemver('1.3.0', '1.2.0')).toBe(1);
      expect(compareSemver('1.2.0', '1.3.0')).toBe(-1);
      expect(compareSemver('1.3.0', '1.3.0')).toBe(0);
      expect(compareSemver('v1.4.0', '1.3.0')).toBe(1);
      expect(compareSemver('1.2.1', 'v1.2.0')).toBe(1);
      expect(compareSemver('2.0.0', '1.9.9')).toBe(1);
      expect(compareSemver('1.10.0', '1.9.0')).toBe(1);
      expect(compareSemver('1.3.0-beta', '1.3.0')).toBe(0);
      expect(compareSemver(null, '1.0.0')).toBe(0);
    });
  });

  describe('getCurrentAppVersion', () => {
    it('returns native version from CapApp.getInfo when running on native platform', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(Capacitor.isPluginAvailable).mockReturnValue(true);
      vi.mocked(CapApp.getInfo).mockResolvedValue({ version: '1.2.5' });

      const version = await getCurrentAppVersion();
      expect(version).toBe('1.2.5');
    });

    it('falls back to CURRENT_APP_VERSION when on web or when CapApp throws', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);

      const version = await getCurrentAppVersion();
      expect(version).toBe(CURRENT_APP_VERSION);
    });
  });

  describe('checkGitHubRelease', () => {
    it('detects newer version and extracts APK download link', async () => {
      const mockRelease = {
        tag_name: 'v1.4.0',
        name: 'SimpleBodyGraph v1.4.0 (build 8)',
        html_url: 'https://github.com/DevOpsBenjamin/SimpleBodyGraph/releases/tag/v1.4.0',
        body: 'Exciting release notes',
        published_at: '2026-08-27T10:00:00Z',
        assets: [
          {
            name: 'SimpleBodyGraph.apk',
            browser_download_url: 'https://github.com/DevOpsBenjamin/SimpleBodyGraph/releases/download/v1.4.0/SimpleBodyGraph.apk'
          }
        ]
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockRelease)
      });

      const result = await checkGitHubRelease({
        currentVersion: '1.3.0',
        fetchFn: mockFetch
      });

      expect(result.hasUpdate).toBe(true);
      expect(result.latestVersion).toBe('1.4.0');
      expect(result.currentVersion).toBe('1.3.0');
      expect(result.apkUrl).toBe('https://github.com/DevOpsBenjamin/SimpleBodyGraph/releases/download/v1.4.0/SimpleBodyGraph.apk');
      expect(result.releaseNotes).toBe('Exciting release notes');
    });

    it('returns hasUpdate: false when already on the latest or newer version', async () => {
      const mockRelease = {
        tag_name: 'v1.3.0',
        name: 'SimpleBodyGraph v1.3.0',
        html_url: 'https://github.com/DevOpsBenjamin/SimpleBodyGraph/releases/tag/v1.3.0',
        assets: []
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockRelease)
      });

      const result = await checkGitHubRelease({
        currentVersion: '1.3.0',
        fetchFn: mockFetch
      });

      expect(result.hasUpdate).toBe(false);
      expect(result.latestVersion).toBe('1.3.0');
    });

    it('handles offline status gracefully', async () => {
      Object.defineProperty(global, 'navigator', {
        value: { onLine: false },
        configurable: true,
        writable: true
      });

      const result = await checkGitHubRelease({
        fetchFn: vi.fn()
      });

      expect(result.hasUpdate).toBe(false);
      expect(result.error).toBe('Device is offline');
    });

    it('handles HTTP error responses from GitHub API', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404
      });

      const result = await checkGitHubRelease({
        currentVersion: '1.3.0',
        fetchFn: mockFetch
      });

      expect(result.hasUpdate).toBe(false);
      expect(result.error).toContain('404');
    });
  });

  describe('openApkDownload', () => {
    it('uses Capacitor Browser plugin when available on native', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(Capacitor.isPluginAvailable).mockReturnValue(true);

      await openApkDownload('https://example.com/app.apk');
      expect(Browser.open).toHaveBeenCalledWith({ url: 'https://example.com/app.apk', windowName: '_system' });
    });

    it('falls back to window.open on web', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
      const mockWindowOpen = vi.fn();
      Object.defineProperty(global, 'window', {
        value: { open: mockWindowOpen },
        configurable: true,
        writable: true
      });

      await openApkDownload('https://example.com/app.apk');
      expect(mockWindowOpen).toHaveBeenCalled();
    });
  });

  describe('isServiceWorkerSupported', () => {
    it('returns true when navigator.serviceWorker exists', () => {
      Object.defineProperty(global, 'navigator', {
        value: { serviceWorker: {} },
        configurable: true,
        writable: true
      });
      expect(isServiceWorkerSupported()).toBe(true);
    });

    it('returns false when navigator is undefined or lacks serviceWorker', () => {
      Object.defineProperty(global, 'navigator', {
        value: {},
        configurable: true,
        writable: true
      });
      expect(isServiceWorkerSupported()).toBe(false);
    });
  });

  describe('registerServiceWorker', () => {
    it('registers service worker with updateViaCache: "none"', async () => {
      const mockRegister = vi.fn().mockResolvedValue({
        scope: 'https://example.com/',
        addEventListener: vi.fn(),
        waiting: null,
        installing: null
      });

      Object.defineProperty(global, 'navigator', {
        value: {
          serviceWorker: {
            register: mockRegister,
            addEventListener: vi.fn()
          },
          onLine: true
        },
        configurable: true,
        writable: true
      });

      const reg = await registerServiceWorker();
      expect(mockRegister).toHaveBeenCalledWith('/sw.js', { updateViaCache: 'none' });
      expect(reg).not.toBeNull();
    });

    it('handles waiting service worker on startup', async () => {
      const mockWaitingWorker = {
        postMessage: vi.fn()
      };
      const mockOnUpdateAvailable = vi.fn();

      const mockRegister = vi.fn().mockResolvedValue({
        scope: 'https://example.com/',
        addEventListener: vi.fn(),
        waiting: mockWaitingWorker,
        installing: null
      });

      Object.defineProperty(global, 'navigator', {
        value: {
          serviceWorker: {
            register: mockRegister,
            addEventListener: vi.fn()
          },
          onLine: true
        },
        configurable: true,
        writable: true
      });

      await registerServiceWorker({ onUpdateAvailable: mockOnUpdateAvailable });
      expect(mockOnUpdateAvailable).toHaveBeenCalledTimes(1);
    });

    it('returns null if registration fails', async () => {
      const mockRegister = vi.fn().mockRejectedValue(new Error('Registration failed'));

      Object.defineProperty(global, 'navigator', {
        value: {
          serviceWorker: {
            register: mockRegister,
            addEventListener: vi.fn()
          },
          onLine: true
        },
        configurable: true,
        writable: true
      });

      const reg = await registerServiceWorker();
      expect(reg).toBeNull();
    });
  });

  describe('checkForAppUpdates', () => {
    it('skips update check when offline', async () => {
      Object.defineProperty(global, 'navigator', {
        value: { onLine: false },
        configurable: true,
        writable: true
      });

      const checked = await checkForAppUpdates();
      expect(checked).toBe(false);
    });

    it('triggers registration.update when online and registration exists', async () => {
      const mockUpdate = vi.fn().mockResolvedValue();
      const mockRegister = vi.fn().mockResolvedValue({
        scope: 'https://example.com/',
        addEventListener: vi.fn(),
        update: mockUpdate,
        waiting: null,
        installing: null
      });

      Object.defineProperty(global, 'navigator', {
        value: {
          serviceWorker: {
            register: mockRegister,
            addEventListener: vi.fn()
          },
          onLine: true
        },
        configurable: true,
        writable: true
      });

      await registerServiceWorker();
      const checked = await checkForAppUpdates();
      expect(mockUpdate).toHaveBeenCalled();
      expect(checked).toBe(true);
    });
  });

  describe('applyUpdate', () => {
    it('sends SKIP_WAITING postMessage to waiting worker', () => {
      const mockWaitingWorker = {
        postMessage: vi.fn()
      };
      const mockReg = {
        waiting: mockWaitingWorker
      };

      applyUpdate(mockReg);
      expect(mockWaitingWorker.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    });

    it('falls back to window.location.reload if no waiting worker', () => {
      const mockReload = vi.fn();
      Object.defineProperty(global, 'window', {
        value: {
          location: {
            reload: mockReload
          }
        },
        configurable: true,
        writable: true
      });

      applyUpdate(null);
      expect(mockReload).toHaveBeenCalled();
    });
  });

  describe('attachLifecycleListeners', () => {
    it('attaches Capacitor appStateChange and checks for updates when active', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(Capacitor.isPluginAvailable).mockReturnValue(true);

      let appStateCallback = null;
      vi.mocked(CapApp.addListener).mockImplementation((event, cb) => {
        if (event === 'appStateChange') {
          appStateCallback = cb;
        }
        return Promise.resolve();
      });

      const mockUpdate = vi.fn().mockResolvedValue();
      const mockRegister = vi.fn().mockResolvedValue({
        scope: 'https://example.com/',
        addEventListener: vi.fn(),
        update: mockUpdate,
        waiting: null,
        installing: null
      });

      Object.defineProperty(global, 'navigator', {
        value: {
          serviceWorker: {
            register: mockRegister,
            addEventListener: vi.fn()
          },
          onLine: true
        },
        configurable: true,
        writable: true
      });

      await registerServiceWorker();

      expect(appStateCallback).not.toBeNull();
      // Simulate app coming to foreground
      await appStateCallback({ isActive: true });
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('attaches visibilitychange listener on document and checks updates when visible', async () => {
      let visibilityCallback = null;
      const mockDocAddEventListener = vi.fn().mockImplementation((event, cb) => {
        if (event === 'visibilitychange') {
          visibilityCallback = cb;
        }
      });

      Object.defineProperty(global, 'document', {
        value: {
          addEventListener: mockDocAddEventListener,
          visibilityState: 'visible'
        },
        configurable: true,
        writable: true
      });

      const mockUpdate = vi.fn().mockResolvedValue();
      const mockRegister = vi.fn().mockResolvedValue({
        scope: 'https://example.com/',
        addEventListener: vi.fn(),
        update: mockUpdate,
        waiting: null,
        installing: null
      });

      Object.defineProperty(global, 'navigator', {
        value: {
          serviceWorker: {
            register: mockRegister,
            addEventListener: vi.fn()
          },
          onLine: true
        },
        configurable: true,
        writable: true
      });

      await registerServiceWorker();
      expect(mockDocAddEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));

      // Trigger visibility change
      await visibilityCallback();
      expect(mockUpdate).toHaveBeenCalled();
    });
  });
});

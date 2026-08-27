import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
    isPluginAvailable: vi.fn(() => true)
  }
}));

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn()
  }
}));

import {
  isServiceWorkerSupported,
  registerServiceWorker,
  applyUpdate,
  checkForAppUpdates,
  attachLifecycleListeners,
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

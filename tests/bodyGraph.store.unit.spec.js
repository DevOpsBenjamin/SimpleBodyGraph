import { vi, beforeEach, describe, it, expect } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

// Use vi.hoisted to stub globals and define mock data before any imports are evaluated
const { mockLogs, mockMeasurements } = vi.hoisted(() => {
  // Ensure navigator.onLine is always defined and true
  try {
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: true },
      writable: true,
      configurable: true
    });
  } catch (e) {
    globalThis.navigator = { onLine: true };
  }

  // Ensure window.location.origin is defined for OAuth redirect urls
  if (typeof globalThis.window === 'undefined') {
    globalThis.window = {
      location: {
        origin: 'http://localhost:4173'
      }
    };
  }

  const store = {};
  globalThis.localStorage = {
    getItem: vi.fn((key) => store[key] !== undefined ? store[key] : null),
    setItem: vi.fn((key, value) => { store[key] = String(value); }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { Object.keys(store).forEach(key => delete store[key]); }),
  };

  if (typeof globalThis.crypto === 'undefined' || !globalThis.crypto.randomUUID) {
    globalThis.crypto = {
      randomUUID: vi.fn(() => 'mocked-uuid-1234')
    };
  }

  // Unified global seed dataset (identical to tests/db-helper.js)
  return {
    mockLogs: [
      // --- July 2026 (Reduced weight & fat) ---
      // A couple of unsynced entries for offline/unsynced test coverage
      { id: 'j1', date: '2026-07-15', mass: 100.20, body_fat: 32.1, synced: false, user_id: 'guest' },
      { id: 'j2', date: '2026-07-12', mass: 100.80, body_fat: 32.2, synced: false, user_id: 'guest' },
      { id: 'j3', date: '2026-07-08', mass: 101.40, body_fat: 32.4, synced: true, user_id: 'guest' },
      { id: 'j4', date: '2026-07-05', mass: 101.90, body_fat: 32.5, synced: true, user_id: 'guest' },
      { id: 'j5', date: '2026-07-01', mass: 102.30, body_fat: 32.7, synced: true, user_id: 'guest' },

      // --- June 2026 (Baseline) ---
      { id: '1', date: '2026-06-17', mass: 105.35, body_fat: 34.2, synced: true, user_id: 'guest' },
      { id: '2', date: '2026-06-16', mass: 105.78, body_fat: 34.3, synced: true, user_id: 'guest' },
      { id: '3', date: '2026-06-15', mass: 106.20, body_fat: 34.4, synced: true, user_id: 'guest' },
      { id: '4', date: '2026-06-14', mass: 107.40, body_fat: 34.6, synced: true, user_id: 'guest' },
      { id: '5', date: '2026-06-13', mass: 106.60, body_fat: 34.3, synced: true, user_id: 'guest' },
      { id: '6', date: '2026-06-12', mass: 105.80, body_fat: 34.1, synced: true, user_id: 'guest' },
      { id: '7', date: '2026-06-11', mass: 106.08, body_fat: 34.2, synced: true, user_id: 'guest' },
      { id: '8', date: '2026-06-10', mass: 106.35, body_fat: 34.3, synced: true, user_id: 'guest' },
      { id: '9', date: '2026-06-09', mass: 106.35, body_fat: 34.6, synced: true, user_id: 'guest' },
      { id: '10', date: '2026-06-08', mass: 106.35, body_fat: 34.8, synced: true, user_id: 'guest' },
      { id: '11', date: '2026-06-07', mass: 106.80, body_fat: 34.9, synced: true, user_id: 'guest' },
      { id: '12', date: '2026-06-06', mass: 107.25, body_fat: 35.0, synced: true, user_id: 'guest' },
      { id: '13', date: '2026-06-05', mass: 107.65, body_fat: 35.1, synced: true, user_id: 'guest' },

      // --- May 2026 (Higher weight & fat) ---
      { id: 'y1', date: '2026-05-25', mass: 110.80, body_fat: 36.2, synced: true, user_id: 'guest' },
      { id: 'y2', date: '2026-05-20', mass: 111.20, body_fat: 36.3, synced: true, user_id: 'guest' },
      { id: 'y3', date: '2026-05-15', mass: 111.50, body_fat: 36.4, synced: true, user_id: 'guest' },
      { id: 'y4', date: '2026-05-10', mass: 112.10, body_fat: 36.5, synced: true, user_id: 'guest' },
      { id: 'y5', date: '2026-05-05', mass: 112.40, body_fat: 36.6, synced: true, user_id: 'guest' },

      // --- Late 2025 (Second year data coverage) ---
      { id: 'h1', date: '2025-12-15', mass: 114.20, body_fat: 37.2, synced: true, user_id: 'guest' },
      { id: 'h2', date: '2025-12-10', mass: 114.50, body_fat: 37.4, synced: true, user_id: 'guest' },
      { id: 'h3', date: '2025-11-28', mass: 115.10, body_fat: 37.6, synced: true, user_id: 'guest' },
      { id: 'h4', date: '2025-11-20', mass: 115.40, body_fat: 37.8, synced: true, user_id: 'guest' },
      { id: 'h5', date: '2025-11-12', mass: 116.00, body_fat: 38.0, synced: true, user_id: 'guest' }
    ],
    mockMeasurements: [
      // An unsynced entry for offline/unsynced test coverage
      { id: 'm1', date: '2026-06-17', waist: 95, chest: 104, arms: 38, thighs: 62, synced: false, user_id: 'guest' },
      { id: 'm2', date: '2026-06-10', waist: 96, chest: 105, arms: 38.5, thighs: 63, synced: true, user_id: 'guest' },
      { id: 'm3', date: '2026-06-03', waist: 97, chest: 106, arms: 39, thighs: 64, synced: true, user_id: 'guest' }
    ]
  };
});

// Mock the database dependencies
vi.mock('../src/db', () => ({
  getAllLogs: vi.fn(() => Promise.resolve(mockLogs)),
  saveLog: vi.fn(() => Promise.resolve({ id: 'mocked-log' })),
  deleteLog: vi.fn(() => Promise.resolve('mocked-log-id')),
  syncLogs: vi.fn(() => Promise.resolve({ success: true })),
  migrateGuestLogsInDB: vi.fn(() => Promise.resolve()),
  getAllMeasurements: vi.fn(() => Promise.resolve(mockMeasurements)),
  saveMeasurement: vi.fn(() => Promise.resolve({ id: 'mocked-m' })),
  deleteMeasurement: vi.fn(() => Promise.resolve('mocked-m-id')),
  exportAllData: vi.fn((userId, paliers, profile) => Promise.resolve({
    version: 2,
    exportedAt: '2026-08-19T00:00:00.000Z',
    paliers: paliers || [],
    profile: profile || null,
    logs: mockLogs,
    measurements: mockMeasurements
  })),
  importAllData: vi.fn((data, userId) => Promise.resolve({
    importedLogsCount: data.logs?.length || 0,
    importedMeasurementsCount: data.measurements?.length || 0,
    paliers: data.paliers || [],
    profile: data.profile || null
  })),
}));

// Mock supabase client and auth
let mockAuthChangeCallback = null;
vi.mock('../src/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn((callback) => {
        mockAuthChangeCallback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
      updateUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'user-123', user_metadata: {} } }, error: null })),
      signInWithPassword: vi.fn(() => Promise.resolve({ data: { user: { id: 'user-123' } }, error: null })),
      signUp: vi.fn(() => Promise.resolve({ data: { user: { id: 'user-123' } }, error: null })),
      signInWithOAuth: vi.fn(() => Promise.resolve({ data: {}, error: null })),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
    }
  }
}));

import { useBodyGraphStore, calculateAge } from '../src/stores/bodyGraph';
import { supabase } from '../src/supabase';
import * as db from '../src/db';

describe('useBodyGraphStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockAuthChangeCallback = null;
    localStorage.clear();

    // Pre-populate the store with our global seed logs, measurements, and 3 default paliers
    const store = useBodyGraphStore();
    store.logs = [...mockLogs];
    store.measurements = [...mockMeasurements];
    store.paliers = [
      { id: 'p1', mass: 100, fat: 28, validated: false },
      { id: 'p2', mass: 95, fat: 25, validated: false },
      { id: 'p3', mass: 85, fat: 20, validated: false }
    ];
  });

  describe('Getters', () => {
    it('showDashboard reflects authenticated state or guest mode', () => {
      const store = useBodyGraphStore();
      expect(store.showDashboard).toBe(false);

      store.user = { id: 'user-123' };
      expect(store.showDashboard).toBe(true);

      store.user = null;
      store.isGuestMode = true;
      expect(store.showDashboard).toBe(true);
    });

    it('currentUserId is "guest" when no user, or user.id when logged in', () => {
      const store = useBodyGraphStore();
      expect(store.currentUserId).toBe('guest');

      store.user = { id: 'real-user-id' };
      expect(store.currentUserId).toBe('real-user-id');
    });

    it('isAuthenticated matches presence of user', () => {
      const store = useBodyGraphStore();
      expect(store.isAuthenticated).toBe(false);

      store.user = { id: 'user-id' };
      expect(store.isAuthenticated).toBe(true);
    });

    it('userEmail returns appropriate label based on profile type', () => {
      const store = useBodyGraphStore();
      expect(store.userEmail).toBe('Guest Profile');

      store.user = { is_anonymous: true };
      expect(store.userEmail).toBe('Anonymous Cloud Profile');

      store.user = { email: 'test@example.com' };
      expect(store.userEmail).toBe('test@example.com');
    });

    it('logsWithEstimates computes fat_mass and lean_mass correctly', () => {
      const store = useBodyGraphStore();
      // Test calculations on first entry of seeded logs
      const firstEstimated = store.logsWithEstimates[0];
      expect(firstEstimated.id).toBe('j1');
      expect(firstEstimated.fat_mass).toBeCloseTo(32.1642, 4);
      expect(firstEstimated.lean_mass).toBeCloseTo(68.0358, 4);
    });

    it('groupedMonths processes and sorts logs into monthly groups correctly', () => {
      const store = useBodyGraphStore();
      const months = store.groupedMonths;
      expect(months).toHaveLength(5);

      // July 2026 (newest month should be first)
      expect(months[0].id).toBe('2026-07');
      expect(months[0].label).toBe('July 2026');
      expect(months[0].medianMass).toBe(101.40);
      expect(months[0].medianFat).toBe(32.4);

      // June 2026
      expect(months[1].id).toBe('2026-06');
      expect(months[1].label).toBe('June 2026');

      // May 2026
      expect(months[2].id).toBe('2026-05');
      expect(months[2].label).toBe('May 2026');
    });

    it('groupedWeeks groups and processes logs into weekly groups correctly', () => {
      const store = useBodyGraphStore();
      const weeks = store.groupedWeeks;
      expect(weeks.length).toBeGreaterThan(0);

      // Latest week (week of Jul 15, 2026)
      expect(weeks[0].id).toBe('2026-07-13');
      expect(weeks[0].label).toBe('Jul 13 - Jul 19');
      expect(weeks[0].medianMass).toBe(100.20);
    });

    it('sortedMeasurements sorts measurements descending by date', () => {
      const store = useBodyGraphStore();
      expect(store.sortedMeasurements[0].date).toBe('2026-06-17');
      expect(store.sortedMeasurements[2].date).toBe('2026-06-03');
    });

    it('activeMonth and activeWeek return null when empty, or current active selection', () => {
      const store = useBodyGraphStore();
      // 1. With pre-populated seed data
      expect(store.activeMonth.id).toBe('2026-07');
      expect(store.activeWeek.id).toBe('2026-07-13');

      // 2. When empty
      store.logs = [];
      expect(store.activeMonth).toBeNull();
      expect(store.activeWeek).toBeNull();
    });

    it('targetLeanMass and targetFatMass compute correct target weights', () => {
      const store = useBodyGraphStore();
      expect(store.targetLeanMass).toBeNull();
      expect(store.targetFatMass).toBeNull();

      store.targetMass = 100;
      store.targetFat = 20;
      expect(store.targetLeanMass).toBe(80);
      expect(store.targetFatMass).toBe(20);
    });

    it('activePalier returns the first palier in order that is not validated', () => {
      const store = useBodyGraphStore();
      // Initially, the pre-populated palier is the first one (p1)
      expect(store.activePalier).toEqual({ id: 'p1', mass: 100, fat: 28, validated: false });

      // Test clearing and custom assignment
      store.paliers = [];
      expect(store.activePalier).toBeNull();

      const p1 = { id: '1', mass: 90, validated: true };
      const p2 = { id: '2', mass: 85, validated: false };
      const p3 = { id: '3', mass: 80, validated: false };

      store.paliers = [p1, p2, p3];
      expect(store.activePalier).toEqual(p2);
    });

    it('stats handles empty logs gracefully', () => {
      const store = useBodyGraphStore();
      store.logs = [];
      const s = store.stats;
      expect(s.currentMass).toBeNull();
      expect(s.rollingMedianMass).toBeNull();
      expect(s.massChange).toBe(0);
    });

    it('stats computes weights, changes, rolling medians, and unsynced count', () => {
      const store = useBodyGraphStore();
      const s = store.stats;

      expect(s.currentMass).toBe(100.20);
      expect(s.currentFat).toBe(32.1);
      expect(s.massChange).toBeCloseTo(-0.60, 4); // 100.20 - 100.80
      expect(s.unsyncedCount).toBe(2); // j1 and j2 are unsynced

      expect(s.rollingMedianMass).toBeCloseTo(100.50, 4); // median of 100.20 and 100.80
      expect(s.rollingMedianFat).toBeCloseTo(32.15, 4); // median of 32.1 and 32.2

      expect(s.rollingMedianMassChange).toBeCloseTo(-1.15, 4); // 100.50 - 101.65
      expect(s.rollingMedianFatChange).toBeCloseTo(-0.30, 4); // 32.15 - 32.45
    });
  });

  describe('Actions', () => {
    it('setEditingLog and setEditingMeasurement prepare edit state and modals', () => {
      const store = useBodyGraphStore();
      const mockLog = { id: 'l1', date: '2026-06-15', mass: 80, body_fat: 20 };
      const mockMeasurement = { id: 'm1', date: '2026-06-15', waist: 90 };

      store.setEditingLog(mockLog);
      expect(store.editingLog).toEqual(mockLog);
      expect(store.showAddModal).toBe(true);

      store.setEditingMeasurement(mockMeasurement);
      expect(store.editingMeasurement).toEqual(mockMeasurement);
      expect(store.showAddMeasurementModal).toBe(true);
    });

    it('goToPreviousMonth/goToNextMonth navigates months bounds safely', () => {
      const store = useBodyGraphStore();
      const count = store.groupedMonths.length;
      expect(count).toBe(5);
      expect(store.selectedMonthIndex).toBe(0);

      store.goToPreviousMonth();
      expect(store.selectedMonthIndex).toBe(1);

      // Navigate to the end
      for (let i = 2; i < count; i++) {
        store.goToPreviousMonth();
      }
      const maxIndex = count - 1;
      expect(store.selectedMonthIndex).toBe(maxIndex);

      // Boundary check
      store.goToPreviousMonth();
      expect(store.selectedMonthIndex).toBe(maxIndex);

      store.goToNextMonth();
      expect(store.selectedMonthIndex).toBe(maxIndex - 1);

      // Navigate back to 0
      for (let i = maxIndex - 1; i > 0; i--) {
        store.goToNextMonth();
      }
      expect(store.selectedMonthIndex).toBe(0);

      // Boundary check
      store.goToNextMonth();
      expect(store.selectedMonthIndex).toBe(0);
    });

    it('goToPreviousWeek/goToNextWeek navigates weeks bounds safely', () => {
      const store = useBodyGraphStore();
      const weeksCount = store.groupedWeeks.length;
      expect(weeksCount).toBeGreaterThan(1);
      expect(store.selectedWeekIndex).toBe(0);

      store.goToPreviousWeek();
      expect(store.selectedWeekIndex).toBe(1);

      // Navigate to the end
      for (let i = 2; i < weeksCount; i++) {
        store.goToPreviousWeek();
      }
      const maxIndex = weeksCount - 1;
      expect(store.selectedWeekIndex).toBe(maxIndex);

      // Boundary check
      store.goToPreviousWeek();
      expect(store.selectedWeekIndex).toBe(maxIndex);

      store.goToNextWeek();
      expect(store.selectedWeekIndex).toBe(maxIndex - 1);
    });

    it('enableGuestMode triggers isGuestMode and loads logs', async () => {
      const store = useBodyGraphStore();
      await store.enableGuestMode();
      expect(store.isGuestMode).toBe(true);
      expect(db.getAllLogs).toHaveBeenCalledWith('guest');
      expect(store.logs).toHaveLength(28);
    });

    it('syncSingleGoalsFromActivePalier pulls targets from first unvalidated palier', () => {
      const store = useBodyGraphStore();
      // Test pulling from the default pre-populated paliers (active: p1 100/28)
      store.syncSingleGoalsFromActivePalier();
      expect(store.targetMass).toBe(100);
      expect(store.targetFat).toBe(28);

      store.paliers = [
        { id: '1', mass: 90, fat: 18, validated: true },
        { id: '2', mass: 85, fat: 15, validated: false }
      ];

      store.syncSingleGoalsFromActivePalier();
      expect(store.targetMass).toBe(85);
      expect(store.targetFat).toBe(15);
    });

    it('updatePaliers updates state, syncs target, and saves to supabase if logged in', async () => {
      const store = useBodyGraphStore();
      store.user = { id: 'user-123' };

      const newPaliers = [{ id: 'p1', mass: 80, fat: 12, validated: false }];
      await store.updatePaliers(newPaliers);

      expect(store.paliers).toEqual(newPaliers);
      expect(store.targetMass).toBe(80);
      expect(store.targetFat).toBe(12);

      expect(supabase.auth.updateUser).toHaveBeenCalledWith({
        data: {
          target_mass: 80,
          target_fat: 12,
          paliers: newPaliers
        }
      });
    });

    it('updatePaliers updates state and saves to localStorage if in guest mode', async () => {
      const store = useBodyGraphStore();
      store.user = null;

      const newPaliers = [{ id: 'p1', mass: 80, fat: 12, validated: false }];
      await store.updatePaliers(newPaliers);

      expect(store.paliers).toEqual(newPaliers);
      expect(localStorage.setItem).toHaveBeenCalledWith('bodygraph_paliers', JSON.stringify(newPaliers));
      expect(localStorage.setItem).toHaveBeenCalledWith('bodygraph_target_mass', 80);
      expect(localStorage.setItem).toHaveBeenCalledWith('bodygraph_target_fat', 12);
    });

    it('updateGoals triggers legacy single goal update', async () => {
      const store = useBodyGraphStore();
      const spyUpdatePaliers = vi.spyOn(store, 'updatePaliers');

      await store.updateGoals(95, 18);
      expect(spyUpdatePaliers).toHaveBeenCalled();
      expect(store.paliers[0].mass).toBe(95);
      expect(store.paliers[0].fat).toBe(18);
    });

    it('signInWithEmail/signUpWithEmail call supabase auth methods', async () => {
      const store = useBodyGraphStore();
      await store.signInWithEmail('test@test.com', 'pwd');
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@test.com',
        password: 'pwd'
      });

      await store.signUpWithEmail('test2@test.com', 'pwd');
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test2@test.com',
        password: 'pwd'
      });
    });

    it('signInWithGoogle triggers OAuth provider', async () => {
      const store = useBodyGraphStore();
      await store.signInWithGoogle();
      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: { 
          redirectTo: 'http://localhost:4173',
          skipBrowserRedirect: false
        }
      });
    });

    it('logout resets state and reloads logs', async () => {
      const store = useBodyGraphStore();
      store.user = { id: 'user-123' };
      store.session = { access_token: 'tok' };
      store.isGuestMode = true;

      await store.logout();
      expect(store.user).toBeNull();
      expect(store.session).toBeNull();
      expect(store.isGuestMode).toBe(false);
      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(db.getAllLogs).toHaveBeenCalledWith('guest');
      expect(store.logs).toHaveLength(28);
    });

    it('initAuth sets up targets and sets up supabase auth callbacks', async () => {
      const store = useBodyGraphStore();
      localStorage.setItem('bodygraph_target_mass', '90');
      localStorage.setItem('bodygraph_target_fat', '18');

      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: { user: { id: 'user-cloud', user_metadata: { target_mass: 88, target_fat: 14 } } } },
        error: null
      });

      await store.initAuth();
      expect(store.initialized).toBe(true);
      expect(store.user.id).toBe('user-cloud');
      expect(store.targetMass).toBe(88);
      expect(store.targetFat).toBe(14);

      // Now test triggering auth listener callback simulating sign out
      if (mockAuthChangeCallback) {
        await mockAuthChangeCallback('SIGNED_OUT', null);
        // Should fallback to guest targets set in localStorage initially
        expect(store.user).toBeNull();
        expect(store.targetMass).toBe(90);
        expect(store.targetFat).toBe(18);
      }
    });

    it('saveLogEntry correctly saves and triggers palier validations', async () => {
      const store = useBodyGraphStore();
      const checkPalierSpy = vi.spyOn(store, 'checkAndAutoValidatePaliers');

      await store.saveLogEntry({ id: 'l1', mass: 100, bodyFat: 20, date: '2026-06-15' });
      expect(db.saveLog).toHaveBeenCalledWith(expect.objectContaining({
        id: 'l1',
        date: '2026-06-15',
        mass: 100,
        body_fat: 20,
        synced: false
      }), 'guest');

      expect(checkPalierSpy).toHaveBeenCalled();
      expect(store.showAddModal).toBe(false);
    });

    it('deleteLogEntry removes log and reloads', async () => {
      const store = useBodyGraphStore();
      // Ensure 'l1' is in store.logs first to test deletion
      store.logs.push({ id: 'l1', date: '2026-06-15', mass: 80, body_fat: 20 });

      await store.deleteLogEntry('l1');
      expect(db.deleteLog).toHaveBeenCalledWith('l1', 'guest');
      expect(store.logs.find(l => l.id === 'l1')).toBeUndefined();
    });

    it('saveMeasurementEntry/deleteMeasurementEntry perform correct DB calls', async () => {
      const store = useBodyGraphStore();
      await store.saveMeasurementEntry({
        id: 'm1',
        date: '2026-06-15',
        waist: 90,
        chest: 100,
        arms: 35,
        thighs: 60
      });

      expect(db.saveMeasurement).toHaveBeenCalledWith({
        id: 'm1',
        date: '2026-06-15',
        waist: 90,
        chest: 100,
        arms: 35,
        thighs: 60,
        synced: false
      }, 'guest');

      await store.deleteMeasurementEntry('m1');
      expect(db.deleteMeasurement).toHaveBeenCalledWith('m1', 'guest');
    });

    it('setOnlineStatus sets online state and triggers sync if going online', async () => {
      const store = useBodyGraphStore();
      store.isOnline = false;
      const syncSpy = vi.spyOn(store, 'triggerSync');

      store.setOnlineStatus(true);
      expect(store.isOnline).toBe(true);
      expect(syncSpy).toHaveBeenCalled();
    });

    it('triggerSync triggers sync if online and not guest', async () => {
      const store = useBodyGraphStore();
      store.user = { id: 'user-real' };
      store.isOnline = true;

      await store.triggerSync();
      expect(store.isSyncing).toBe(false);
      expect(db.syncLogs).toHaveBeenCalledWith('user-real');
    });

    it('exportData calls exportAllData with current userId, paliers, and profile', async () => {
      const store = useBodyGraphStore();
      const exportResult = await store.exportData();

      expect(db.exportAllData).toHaveBeenCalledWith('guest', store.paliers, store.profile);
      expect(exportResult.version).toBe(2);
      expect(exportResult.logs).toEqual(mockLogs);
      expect(exportResult.measurements).toEqual(mockMeasurements);
    });

    it('importData calls importAllData, updates paliers and reloads logs', async () => {
      const store = useBodyGraphStore();
      const updatePaliersSpy = vi.spyOn(store, 'updatePaliers');
      const loadLogsSpy = vi.spyOn(store, 'loadLogs');
      const checkPalierSpy = vi.spyOn(store, 'checkAndAutoValidatePaliers');

      const payload = {
        version: 1,
        paliers: [{ id: 'p_new', mass: 80, fat: 15, validated: false }],
        logs: mockLogs,
        measurements: mockMeasurements
      };

      const result = await store.importData(JSON.stringify(payload));
      expect(db.importAllData).toHaveBeenCalledWith(payload, 'guest');
      expect(updatePaliersSpy).toHaveBeenCalledWith(payload.paliers);
      expect(loadLogsSpy).toHaveBeenCalled();
      expect(checkPalierSpy).toHaveBeenCalled();
      expect(result.importedLogsCount).toBe(28);
      expect(result.importedMeasurementsCount).toBe(3);
    });

    describe('checkAndAutoValidatePaliers Weight Loss/Gain validation', () => {
      it('validates a palier for weight loss trend', async () => {
        const store = useBodyGraphStore();
        // Trend is loss since palier 2 targets are lower than palier 1 targets
        store.paliers = [
          { id: 'p1', mass: 115.00, fat: 38.0, validated: false },
          { id: 'p2', mass: 110.00, fat: 36.0, validated: false }
        ];

        const updatePaliersSpy = vi.spyOn(store, 'updatePaliers');
        await store.checkAndAutoValidatePaliers();

        // Since week of June 8 has median weight 106.35 <= 110 and median fat 34.3% <= 36%, both should be validated!
        expect(updatePaliersSpy).toHaveBeenCalledWith([
          { id: 'p1', mass: 115.00, fat: 38.0, validated: true },
          { id: 'p2', mass: 110.00, fat: 36.0, validated: true }
        ]);
      });

      it('does not validate a palier for weight loss trend if target not reached', async () => {
        const store = useBodyGraphStore();
        // Targets are 85.00 kg / 20.0%, which is not reached (lowest week median weight is 106.35 kg)
        store.paliers = [
          { id: 'p1', mass: 115.00, fat: 38.0, validated: false },
          { id: 'p2', mass: 85.00, fat: 20.0, validated: false }
        ];

        const updatePaliersSpy = vi.spyOn(store, 'updatePaliers');
        await store.checkAndAutoValidatePaliers();

        // Only p1 gets validated because its target (115/38) is met, but p2 (85/20) is not.
        expect(updatePaliersSpy).toHaveBeenCalledWith([
          { id: 'p1', mass: 115.00, fat: 38.0, validated: true },
          { id: 'p2', mass: 85.00, fat: 20.0, validated: false }
        ]);
      });

      it('validates a palier for weight gain trend', async () => {
        const store = useBodyGraphStore();
        // Trend is gain since palier 2 targets are higher than palier 1 targets
        store.paliers = [
          { id: 'p1', mass: 100.00, fat: 30.0, validated: false },
          { id: 'p2', mass: 105.00, fat: 32.0, validated: false }
        ];

        const updatePaliersSpy = vi.spyOn(store, 'updatePaliers');
        await store.checkAndAutoValidatePaliers();

        // Since week of June 8 has median weight 106.35 >= 105 and median fat 34.3% >= 32%, both should be validated!
        expect(updatePaliersSpy).toHaveBeenCalledWith([
          { id: 'p1', mass: 100.00, fat: 30.0, validated: true },
          { id: 'p2', mass: 105.00, fat: 32.0, validated: true }
        ]);
      });
    });

    describe('Profile & BIA Configuration', () => {
      it('calculates age correctly via calculateAge helper', () => {
        expect(calculateAge(null)).toBeNull();
        expect(calculateAge('')).toBeNull();
        expect(calculateAge('invalid-date')).toBeNull();

        // Dynamically compute expected age
        const today = new Date();
        const birthDate20YearsAgo = new Date(today.getFullYear() - 20, today.getMonth(), today.getDate());
        const dateStr = birthDate20YearsAgo.toISOString().split('T')[0];
        expect(calculateAge(dateStr)).toBe(20);
      });

      it('computes userAge getter dynamically from store state', () => {
        const store = useBodyGraphStore();
        expect(store.userAge).toBeNull();

        const today = new Date();
        const birth = new Date(today.getFullYear() - 30, today.getMonth(), today.getDate()).toISOString().split('T')[0];
        store.profile.birthDate = birth;
        expect(store.userAge).toBe(30);
      });

      it('updates profile and persists to localStorage in local mode', async () => {
        const store = useBodyGraphStore();
        store.user = null;

        await store.updateProfile({
          gender: 'male',
          birthDate: '1992-05-14',
          height: 178
        });

        expect(store.profile).toEqual({
          gender: 'male',
          birthDate: '1992-05-14',
          height: 178
        });
        expect(localStorage.setItem).toHaveBeenCalledWith(
          'bodygraph_profile',
          JSON.stringify({ gender: 'male', birthDate: '1992-05-14', height: 178 })
        );
      });

      it('updates profile and persists to supabase when user is authenticated', async () => {
        const store = useBodyGraphStore();
        store.user = { id: 'user-123', user_metadata: {} };

        await store.updateProfile({
          gender: 'female',
          birthDate: '1995-10-20',
          height: '165'
        });

        expect(supabase.auth.updateUser).toHaveBeenCalledWith({
          data: {
            profile: {
              gender: 'female',
              birthDate: '1995-10-20',
              height: 165
            }
          }
        });
        expect(store.profile.gender).toBe('female');
        expect(store.profile.height).toBe(165);
      });

      it('exports and imports profile in JSON backup', async () => {
        const store = useBodyGraphStore();
        store.profile = { gender: 'male', birthDate: '1990-01-01', height: 180 };

        const exported = await store.exportData();
        expect(db.exportAllData).toHaveBeenCalledWith('guest', store.paliers, store.profile);

        const updateProfileSpy = vi.spyOn(store, 'updateProfile');
        const payload = {
          version: 2,
          paliers: [],
          profile: { gender: 'female', birthDate: '1998-03-15', height: 168 },
          logs: [],
          measurements: []
        };

        await store.importData(payload);
        expect(updateProfileSpy).toHaveBeenCalledWith({ gender: 'female', birthDate: '1998-03-15', height: 168 });
      });

      it('manages paired BLE devices and persists them locally and in supabase', async () => {
        const store = useBodyGraphStore();
        store.user = { id: 'user-123', user_metadata: {} };

        await store.savePairedDevice({
          deviceId: '50:FB:19:F8:0C:21',
          name: 'HUAWEI Scale 3',
          type: 'huawei_scale_3'
        });

        expect(store.pairedDevices).toHaveLength(1);
        expect(store.pairedDevices[0].deviceId).toBe('50:FB:19:F8:0C:21');
        expect(store.pairedDevices[0].name).toBe('HUAWEI Scale 3');
        expect(localStorage.setItem).toHaveBeenCalledWith('bodygraph_devices', expect.any(String));
        expect(supabase.auth.updateUser).toHaveBeenCalledWith({
          data: {
            paired_devices: store.pairedDevices
          }
        });

        await store.removePairedDevice('50:FB:19:F8:0C:21');
        expect(store.pairedDevices).toHaveLength(0);
      });
    });
  });
});

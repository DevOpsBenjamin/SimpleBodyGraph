import { vi, beforeEach, describe, it, expect } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

// Use vi.hoisted to stub globals before any imports are evaluated
vi.hoisted(() => {
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
});

// Mock the database dependencies
vi.mock('../src/db', () => ({
  getAllLogs: vi.fn(() => Promise.resolve([])),
  saveLog: vi.fn(() => Promise.resolve({ id: 'mocked-log' })),
  deleteLog: vi.fn(() => Promise.resolve('mocked-log-id')),
  syncLogs: vi.fn(() => Promise.resolve({ success: true })),
  migrateGuestLogsInDB: vi.fn(() => Promise.resolve()),
  getAllMeasurements: vi.fn(() => Promise.resolve([])),
  saveMeasurement: vi.fn(() => Promise.resolve({ id: 'mocked-m' })),
  deleteMeasurement: vi.fn(() => Promise.resolve('mocked-m-id')),
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

import { useBodyGraphStore } from '../src/stores/bodyGraph';
import { supabase } from '../src/supabase';
import * as db from '../src/db';

describe('useBodyGraphStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockAuthChangeCallback = null;
    localStorage.clear();
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
      store.logs = [
        { date: '2026-06-15', mass: 100, body_fat: 20 },
        { date: '2026-06-16', mass: 80, body_fat: 15 }
      ];

      expect(store.logsWithEstimates).toEqual([
        { date: '2026-06-15', mass: 100, body_fat: 20, fat_mass: 20, lean_mass: 80 },
        { date: '2026-06-16', mass: 80, body_fat: 15, fat_mass: 12, lean_mass: 68 }
      ]);
    });

    it('groupedMonths processes and sorts logs into monthly groups correctly', () => {
      const store = useBodyGraphStore();
      store.logs = [
        { date: '2026-06-15', mass: 100, body_fat: 20 },
        { date: '2026-06-10', mass: 102, body_fat: 22 },
        { date: '2026-05-01', mass: 110, body_fat: 25 }
      ];

      const months = store.groupedMonths;
      expect(months).toHaveLength(2);

      // Latest month should be first
      expect(months[0].id).toBe('2026-06');
      expect(months[0].label).toBe('June 2026');
      expect(months[0].medianMass).toBe(101); // median of 100 and 102
      expect(months[0].medianFat).toBe(21); // median of 20 and 22
      expect(months[0].medianFatMass).toBe(21.21); // 101 * (21 / 100)

      expect(months[1].id).toBe('2026-05');
      expect(months[1].label).toBe('May 2026');
    });

    it('groupedWeeks groups and processes logs into weekly groups correctly', () => {
      const store = useBodyGraphStore();
      // 2026-06-17 is a Wednesday, Monday is 2026-06-15, Sunday is 2026-06-21.
      store.logs = [
        { date: '2026-06-17', mass: 100, body_fat: 20 },
        { date: '2026-06-16', mass: 102, body_fat: 22 },
        // Different week (previous Monday is 2026-06-08)
        { date: '2026-06-11', mass: 105, body_fat: 25 }
      ];

      const weeks = store.groupedWeeks;
      expect(weeks).toHaveLength(2);
      expect(weeks[0].id).toBe('2026-06-15');
      expect(weeks[0].label).toBe('Jun 15 - Jun 21');
      expect(weeks[0].medianMass).toBe(101);

      expect(weeks[1].id).toBe('2026-06-08');
      expect(weeks[1].label).toBe('Jun 8 - Jun 14');
    });

    it('sortedMeasurements sorts measurements descending by date', () => {
      const store = useBodyGraphStore();
      store.measurements = [
        { date: '2026-06-10', waist: 95 },
        { date: '2026-06-15', waist: 92 },
        { date: '2026-06-12', waist: 94 }
      ];

      expect(store.sortedMeasurements).toEqual([
        { date: '2026-06-15', waist: 92 },
        { date: '2026-06-12', waist: 94 },
        { date: '2026-06-10', waist: 95 }
      ]);
    });

    it('activeMonth and activeWeek return null when empty, or current active selection', () => {
      const store = useBodyGraphStore();
      expect(store.activeMonth).toBeNull();
      expect(store.activeWeek).toBeNull();

      store.logs = [
        { date: '2026-06-15', mass: 100, body_fat: 20 }
      ];
      expect(store.activeMonth.id).toBe('2026-06');
      expect(store.activeWeek.id).toBe('2026-06-15');
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
      expect(store.activePalier).toBeNull();

      const p1 = { id: '1', mass: 90, validated: true };
      const p2 = { id: '2', mass: 85, validated: false };
      const p3 = { id: '3', mass: 80, validated: false };

      store.paliers = [p1, p2, p3];
      expect(store.activePalier).toEqual(p2);
    });

    it('stats handles empty logs gracefully', () => {
      const store = useBodyGraphStore();
      const s = store.stats;
      expect(s.currentMass).toBeNull();
      expect(s.rollingMedianMass).toBeNull();
      expect(s.massChange).toBe(0);
    });

    it('stats computes weights, changes, rolling medians, and unsynced count', () => {
      const store = useBodyGraphStore();
      // Need logs over more than 7 days to trigger different rolling median and previous window median
      // Latest log: 2026-06-17.
      // 7d window: [2026-06-11, 2026-06-17]. Logs in this window: 17th, 16th, 15th. Values: 100, 102, 104. Median = 102.
      // Previous 7d window end date: 2026-06-10.
      // Prev window [2026-06-04, 2026-06-10]. Logs: 10th. Value: 110. Median = 110.
      store.logs = [
        { date: '2026-06-17', mass: 100, body_fat: 20, synced: true },
        { date: '2026-06-16', mass: 102, body_fat: 22, synced: false },
        { date: '2026-06-15', mass: 104, body_fat: 24, synced: false },
        { date: '2026-06-10', mass: 110, body_fat: 30, synced: true }
      ];

      const s = store.stats;
      expect(s.currentMass).toBe(100);
      expect(s.currentFat).toBe(20);
      expect(s.massChange).toBe(-2); // 100 - 102
      expect(s.unsyncedCount).toBe(2);

      expect(s.rollingMedianMass).toBe(102); // median of 100, 102, 104
      expect(s.rollingMedianFat).toBe(22); // median of 20, 22, 24

      // Previous window (around 10th) only has one entry (110)
      expect(s.rollingMedianMassChange).toBe(-8); // 102 - 110
      expect(s.rollingMedianFatChange).toBe(-8); // 22 - 30
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
      store.logs = [
        { date: '2026-06-15', mass: 100, body_fat: 20 },
        { date: '2026-05-15', mass: 100, body_fat: 20 }
      ];
      // 2 months in groupedMonths
      expect(store.groupedMonths).toHaveLength(2);
      expect(store.selectedMonthIndex).toBe(0);

      store.goToPreviousMonth();
      expect(store.selectedMonthIndex).toBe(1);

      // Boundary check
      store.goToPreviousMonth();
      expect(store.selectedMonthIndex).toBe(1);

      store.goToNextMonth();
      expect(store.selectedMonthIndex).toBe(0);

      // Boundary check
      store.goToNextMonth();
      expect(store.selectedMonthIndex).toBe(0);
    });

    it('goToPreviousWeek/goToNextWeek navigates weeks bounds safely', () => {
      const store = useBodyGraphStore();
      store.logs = [
        { date: '2026-06-17', mass: 100, body_fat: 20 },
        { date: '2026-06-10', mass: 100, body_fat: 20 }
      ];
      expect(store.groupedWeeks).toHaveLength(2);
      expect(store.selectedWeekIndex).toBe(0);

      store.goToPreviousWeek();
      expect(store.selectedWeekIndex).toBe(1);

      // Boundary check
      store.goToPreviousWeek();
      expect(store.selectedWeekIndex).toBe(1);

      store.goToNextWeek();
      expect(store.selectedWeekIndex).toBe(0);

      // Boundary check
      store.goToNextWeek();
      expect(store.selectedWeekIndex).toBe(0);
    });

    it('enableGuestMode triggers isGuestMode and loads logs', async () => {
      const store = useBodyGraphStore();
      vi.mocked(db.getAllLogs).mockResolvedValue([{ id: 'l1', date: '2026-06-15' }]);

      await store.enableGuestMode();
      expect(store.isGuestMode).toBe(true);
      expect(db.getAllLogs).toHaveBeenCalledWith('guest');
      expect(store.logs).toHaveLength(1);
    });

    it('syncSingleGoalsFromActivePalier pulls targets from first unvalidated palier', () => {
      const store = useBodyGraphStore();
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
        options: { redirectTo: 'http://localhost:4173' }
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
      expect(db.saveLog).toHaveBeenCalledWith({
        id: 'l1',
        date: '2026-06-15',
        mass: 100,
        body_fat: 20,
        synced: false
      }, 'guest');

      expect(checkPalierSpy).toHaveBeenCalled();
      expect(store.showAddModal).toBe(false);
    });

    it('deleteLogEntry removes log and reloads', async () => {
      const store = useBodyGraphStore();
      await store.deleteLogEntry('l1');
      expect(db.deleteLog).toHaveBeenCalledWith('l1', 'guest');
      expect(db.getAllLogs).toHaveBeenCalled();
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

    describe('checkAndAutoValidatePaliers Weight Loss/Gain validation', () => {
      it('validates a palier for weight loss trend', async () => {
        const store = useBodyGraphStore();
        // Weight loss: initial mass is higher (e.g., 100), target is lower (e.g., 90)
        store.paliers = [
          { id: 'p1', mass: 90, validated: false }
        ];
        // Oldest log is 100 (which establishes start weight > target)
        store.logs = [
          { date: '2026-06-15', mass: 88, body_fat: 20 },
          { date: '2026-06-01', mass: 100, body_fat: 20 }
        ];

        // 7d rolling median of mass (using 88) is 88. Start weight is 100.
        // isPrise is false (target 90 < 100 start weight).
        // rollingMedian (88) <= target (90) is true -> should validate palier.
        const updatePaliersSpy = vi.spyOn(store, 'updatePaliers');
        await store.checkAndAutoValidatePaliers();

        expect(updatePaliersSpy).toHaveBeenCalledWith([
          { id: 'p1', mass: 90, validated: true }
        ]);
      });

      it('does not validate a palier for weight loss trend if target not reached', async () => {
        const store = useBodyGraphStore();
        store.paliers = [
          { id: 'p1', mass: 90, validated: false }
        ];
        store.logs = [
          { date: '2026-06-15', mass: 95, body_fat: 20 },
          { date: '2026-06-01', mass: 100, body_fat: 20 }
        ];

        const updatePaliersSpy = vi.spyOn(store, 'updatePaliers');
        await store.checkAndAutoValidatePaliers();

        expect(updatePaliersSpy).not.toHaveBeenCalled();
      });

      it('validates a palier for weight gain trend', async () => {
        const store = useBodyGraphStore();
        // Weight gain: initial mass is lower (e.g., 80), target is higher (e.g., 90)
        store.paliers = [
          { id: 'p1', mass: 90, validated: false }
        ];
        store.logs = [
          { date: '2026-06-15', mass: 92, body_fat: 15 },
          { date: '2026-06-01', mass: 80, body_fat: 15 }
        ];

        // 7d rolling median of mass is 92. Start weight is 80.
        // isPrise is true (target 90 > 80 start weight).
        // rollingMedian (92) >= target (90) is true -> should validate.
        const updatePaliersSpy = vi.spyOn(store, 'updatePaliers');
        await store.checkAndAutoValidatePaliers();

        expect(updatePaliersSpy).toHaveBeenCalledWith([
          { id: 'p1', mass: 90, validated: true }
        ]);
      });
    });
  });
});

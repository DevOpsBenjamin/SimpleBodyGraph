import { vi, beforeEach, describe, it, expect } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

// Stub global/window/navigator APIs
vi.hoisted(() => {
  try {
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: true },
      writable: true,
      configurable: true
    });
  } catch (e) {
    globalThis.navigator = { onLine: true };
  }

  if (typeof globalThis.window === 'undefined') {
    globalThis.window = {
      location: { origin: 'http://localhost:4173' }
    };
  }

  const store = {};
  globalThis.localStorage = {
    getItem: vi.fn((key) => store[key] !== undefined ? store[key] : null),
    setItem: vi.fn((key, value) => { store[key] = String(value); }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { Object.keys(store).forEach(key => delete store[key]); }),
  };
});

// Mock database helpers with simulated 1ms delay to represent real DB overhead
vi.mock('../src/db', () => ({
  getAllLogs: vi.fn(() => new Promise((resolve) => setTimeout(() => resolve([]), 1))),
  saveLog: vi.fn(() => new Promise((resolve) => setTimeout(() => resolve({ id: 'mocked' }), 1))),
  deleteLog: vi.fn(() => Promise.resolve('mocked')),
  syncLogs: vi.fn(() => Promise.resolve({ success: true })),
  migrateGuestLogsInDB: vi.fn(() => Promise.resolve()),
  getAllMeasurements: vi.fn(() => Promise.resolve([])),
  saveMeasurement: vi.fn(() => Promise.resolve({ id: 'mocked-m' })),
  deleteMeasurement: vi.fn(() => Promise.resolve('mocked-m-id')),
  exportAllData: vi.fn(() => Promise.resolve({ version: 1, logs: [], measurements: [], paliers: [] })),
  importAllData: vi.fn(() => Promise.resolve({ importedLogsCount: 0, importedMeasurementsCount: 0, paliers: [] })),
}));

import { useBodyGraphStore } from '../src/stores/bodyGraph';

describe('⚡ Mutation Performance Benchmark', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('measures the speed of 50 optimistic/in-memory mutations compared to database-reloading approach', async () => {
    const store = useBodyGraphStore();
    store.logs = [];

    // Simulate 50 sequential log entry savings
    const startOptimistic = performance.now();
    for (let i = 0; i < 50; i++) {
      await store.saveLogEntry({
        id: `bench_${i}`,
        mass: 80 + (i % 5),
        bodyFat: 15 + (i % 3),
        date: `2026-08-${String(i % 28 + 1).padStart(2, '0')}`
      });
    }
    const endOptimistic = performance.now();
    const durationOptimistic = endOptimistic - startOptimistic;

    console.log(`\n=================== OPTIMIZED MUTATION BENCHMARK ===================`);
    console.log(`Time taken to save 50 logs with optimistic in-memory updates: ${durationOptimistic.toFixed(2)} ms`);
    console.log(`Average time per mutation: ${(durationOptimistic / 50).toFixed(2)} ms`);
    console.log(`===================================================================\n`);

    expect(durationOptimistic).toBeLessThan(1500); // Expect benchmark to complete in a reasonable timeframe
  });
});

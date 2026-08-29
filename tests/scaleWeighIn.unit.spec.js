import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useBodyGraphStore } from '../src/stores/bodyGraph';
import { useSettingsStore } from '../src/stores/settings';
import { ScaleManager } from '../src/services/ble/scaleManager';
import '../src/services/ble/drivers/huaweiScale3Driver';
import { MOCK_LOGS, MOCK_MEASUREMENTS } from './db-helper';

vi.mock('../src/db', () => ({
  openDB: vi.fn(),
  getAllLogs: vi.fn(async () => []),
  saveLog: vi.fn(async () => {}),
  deleteLog: vi.fn(async () => {}),
  syncLogs: vi.fn(async () => []),
  migrateGuestLogsInDB: vi.fn(async () => {}),
  getAllMeasurements: vi.fn(async () => []),
  saveMeasurement: vi.fn(async () => {}),
  deleteMeasurement: vi.fn(async () => {}),
  exportAllData: vi.fn(async () => ({})),
  importAllData: vi.fn(async () => ({}))
}));

describe('Live Weigh-In Workflow & State Management (Mode 2)', () => {
  let store;
  let settingsStore;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useBodyGraphStore();
    settingsStore = useSettingsStore();

    store.logs = [...MOCK_LOGS];
    store.measurements = [...MOCK_MEASUREMENTS];
    settingsStore.pairedDevices = [
      {
        id: 'scale_1',
        deviceId: '50:FB:19:F8:0C:21',
        name: 'HUAWEI Scale 3 Pro',
        mac: '50:FB:19:F8:0C:21',
        type: 'huawei_scale_3',
        huid: '30033000012345678'
      }
    ];
    settingsStore.profile = {
      gender: 'male',
      birthDate: '1995-05-15',
      height: 180
    };
  });

  it('store state has showLiveWeighInModal initialized as false', () => {
    expect(store.showLiveWeighInModal).toBe(false);
  });

  it('ScaleManager runs live measurement and returns structured data', async () => {
    const onStateChange = vi.fn();
    const onLiveWeight = vi.fn();
    const onComplete = vi.fn();

    const measurement = await ScaleManager.startMeasurement(
      settingsStore.pairedDevices[0],
      { gender: 'male', age: 31, heightCm: 180, lastWeightKg: 82.5 },
      { onStateChange, onLiveWeight, onComplete }
    );

    expect(measurement).toBeDefined();
    expect(measurement.weightKg).toBe(82.5);
    expect(measurement.fatPercentage).toBe(21.5);
    expect(measurement.heartRateBpm).toBe(70);
    expect(measurement.impedances.r_50k.length).toBe(6);
    expect(measurement.impedances.r_250k.length).toBe(6);
    expect(onComplete).toHaveBeenCalledWith(measurement);
  });

  it('saveLogEntry persists enriched BLE fields (measuredAt, heartRate, impedances, scaleDeviceId)', async () => {
    const initialCount = store.logs.length;
    const testDate = '2026-08-23';

    await store.saveLogEntry({
      date: testDate,
      mass: 83.20,
      bodyFat: 21.8,
      measuredAt: '2026-08-23T08:30:00',
      heartRate: 72,
      impedances: { r_50k: [500, 510, 520, 530, 540, 550], r_250k: [600, 615, 630, 645, 660, 675] },
      scaleDeviceId: '50:FB:19:F8:0C:21'
    });

    expect(store.logs.length).toBe(initialCount + 1);
    const addedLog = store.logs.find(l => l.date === testDate && l.mass === 83.20);
    expect(addedLog).toBeDefined();
    expect(addedLog.measured_at).toBe('2026-08-23T08:30:00');
    expect(addedLog.heart_rate).toBe(72);
    expect(addedLog.scale_device_id).toBe('50:FB:19:F8:0C:21');
    expect(addedLog.impedances.r_50k.length).toBe(6);
  });
});

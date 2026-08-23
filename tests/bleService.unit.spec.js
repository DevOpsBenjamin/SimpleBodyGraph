import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BleService } from '../src/services/ble/bleService';
import { BleClient } from '@capacitor-community/bluetooth-le';

vi.mock('@capacitor-community/bluetooth-le', () => ({
  BleClient: {
    initialize: vi.fn(async () => {}),
    isEnabled: vi.fn(async () => true),
    requestEnable: vi.fn(async () => true),
    requestLEScan: vi.fn(),
    stopLEScan: vi.fn(async () => {})
  }
}));

describe('BleService Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('filters out unnamed, empty-named, or whitespace-only BLE devices during scan', async () => {
    // Mock native platform
    vi.spyOn(BleService, 'isNative').mockReturnValue(true);

    let scanCallback = null;
    BleClient.requestLEScan.mockImplementation(async (options, cb) => {
      scanCallback = cb;
    });

    const discovered = [];
    await BleService.startScan((device) => {
      discovered.push(device);
    });

    expect(scanCallback).toBeDefined();

    // 1. Device with no name / null / undefined
    scanCallback({
      device: { deviceId: 'DEV_1' },
      localName: null,
      rssi: -70
    });

    // 2. Device with empty string name
    scanCallback({
      device: { deviceId: 'DEV_2', name: '' },
      localName: '   ',
      rssi: -65
    });

    // 3. Valid device with localName
    scanCallback({
      device: { deviceId: '50:FB:19:F8:0C:21', name: 'Scale' },
      localName: 'HUAWEI Scale 3',
      rssi: -55
    });

    // 4. Another valid device
    scanCallback({
      device: { deviceId: '11:22:33:44:55:66', name: 'Mi Smart Scale 2' },
      localName: null,
      rssi: -60
    });

    // Verify only the 2 valid named devices were notified
    expect(discovered.length).toBe(2);
    expect(discovered[0].name).toBe('HUAWEI Scale 3');
    expect(discovered[0].deviceId).toBe('50:FB:19:F8:0C:21');
    expect(discovered[1].name).toBe('Mi Smart Scale 2');
    expect(discovered[1].deviceId).toBe('11:22:33:44:55:66');
  });

  it('stops scanning cleanly', async () => {
    vi.spyOn(BleService, 'isNative').mockReturnValue(true);
    await BleService.stopScan();
    expect(BleClient.stopLEScan).toHaveBeenCalled();
  });
});

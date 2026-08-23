import { describe, it, expect, vi } from 'vitest';
import { BaseScaleDriver } from '../src/services/ble/scaleInterface';
import { ScaleManager } from '../src/services/ble/scaleManager';
import { HuaweiScale3Driver } from '../src/services/ble/drivers/huaweiScale3Driver';

describe('Scale Pairing Assistant & Driver Workflow (Mode 1)', () => {
  it('BaseScaleDriver requires subclass to implement pair(device, profile, callbacks)', async () => {
    class IncompleteDriver extends BaseScaleDriver {}
    const driver = new IncompleteDriver();
    await expect(driver.pair({}, {}, {})).rejects.toThrow('Driver must implement pair(device, profile, callbacks)');
  });

  it('HuaweiScale3Driver executes full pairing workflow with valid MAC', async () => {
    const driver = new HuaweiScale3Driver();
    const onStep = vi.fn();
    const onSuccess = vi.fn();
    const onError = vi.fn();

    const device = {
      deviceId: '50:FB:19:F8:0C:21',
      name: 'HUAWEI Scale 3 Pro'
    };

    const profile = {
      gender: 'male',
      age: 32,
      heightCm: 180,
      lastWeightKg: 82.5
    };

    const result = await driver.pair(device, profile, { onStep, onSuccess, onError });

    expect(result).toBeDefined();
    expect(result.deviceId).toBe('50:FB:19:F8:0C:21');
    expect(result.mac).toBe('50:FB:19:F8:0C:21');
    expect(result.type).toBe('huawei_scale_3');
    expect(result.huid).toMatch(/^300330000\d{8}$/);
    expect(result.pairedAt).toBeDefined();

    // Verify step progression
    expect(onStep).toHaveBeenCalledWith(expect.objectContaining({ stepId: 'mac_check', status: 'success' }));
    expect(onStep).toHaveBeenCalledWith(expect.objectContaining({ stepId: 'handshake', status: 'success' }));
    expect(onStep).toHaveBeenCalledWith(expect.objectContaining({ stepId: 'flash_reg' }));
    expect(onStep).toHaveBeenCalledWith(expect.objectContaining({
      stepId: 'tare_weighin',
      status: 'waiting_user_action',
      icon: 'scale'
    }));
    expect(onStep).toHaveBeenCalledWith(expect.objectContaining({ stepId: 'profile_sync', status: 'success' }));
    expect(onSuccess).toHaveBeenCalledWith(result);
    expect(onError).not.toHaveBeenCalled();
  });

  it('HuaweiScale3Driver prompts for physical MAC when deviceId is a random UUID', async () => {
    const driver = new HuaweiScale3Driver();
    const onStep = vi.fn();
    const onRequestMac = vi.fn().mockResolvedValue('50:FB:19:F8:0C:21');

    const device = {
      deviceId: 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX', // CoreBluetooth UUID
      name: 'HaigeBLE'
    };

    const profile = {
      gender: 'female',
      age: 26,
      heightCm: 165
    };

    const result = await driver.pair(device, profile, { onStep, onRequestMac });

    expect(onRequestMac).toHaveBeenCalledWith('XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX');
    expect(result.mac).toBe('50:FB:19:F8:0C:21');
    expect(result.deviceId).toBe('XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX');
  });

  it('HuaweiScale3Driver fails pairing if MAC input is cancelled or invalid', async () => {
    const driver = new HuaweiScale3Driver();
    const onRequestMac = vi.fn().mockResolvedValue(null);
    const onError = vi.fn();

    const device = {
      deviceId: 'INVALID-ID',
      name: 'HaigeBLE'
    };

    await expect(
      driver.pair(device, { gender: 'male', age: 30, heightCm: 175 }, { onRequestMac, onError })
    ).rejects.toThrow(/adresse MAC physique valide/);

    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  it('ScaleManager.pairDevice coordinates driver pairing and lifecycle', async () => {
    const onStep = vi.fn();
    const onSuccess = vi.fn();

    const device = {
      deviceId: '50:FB:19:F8:0C:21',
      name: 'HAG-B19',
      type: 'huawei_scale_3'
    };

    const profile = {
      gender: 'male',
      age: 40,
      heightCm: 185
    };

    const result = await ScaleManager.pairDevice(device, profile, { onStep, onSuccess });

    expect(result).toBeDefined();
    expect(result.type).toBe('huawei_scale_3');
    expect(onSuccess).toHaveBeenCalledWith(result);
  });

  it('ScaleManager.pairDevice throws on unsupported scale device', async () => {
    const onError = vi.fn();

    await expect(
      ScaleManager.pairDevice(
        { deviceId: '11:22:33:44:55:66', name: 'Unsupported Smart Toaster' },
        { gender: 'male', age: 20, heightCm: 170 },
        { onError }
      )
    ).rejects.toThrow(/Aucun pilote compatible trouvé/);

    expect(onError).toHaveBeenCalled();
  });
});

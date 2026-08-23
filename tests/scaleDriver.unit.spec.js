import { describe, it, expect, vi } from 'vitest';
import { BaseScaleDriver } from '../src/services/ble/scaleInterface';
import { ScaleManager } from '../src/services/ble/scaleManager';
import { HuaweiScale3Driver, huaweiScale3Driver } from '../src/services/ble/drivers/huaweiScale3Driver';

describe('Scale Driver Architecture & ScaleManager', () => {
  it('BaseScaleDriver requires subclass to implement contract methods', async () => {
    class IncompleteDriver extends BaseScaleDriver {}
    const driver = new IncompleteDriver();

    expect(() => driver.id).toThrow('Driver must implement get id()');
    expect(() => driver.name).toThrow('Driver must implement get name()');
    expect(() => driver.supportsDevice({})).toThrow('Driver must implement supportsDevice(advertisement)');
    await expect(driver.connect('11:22:33:44:55:66')).rejects.toThrow('Driver must implement connect(deviceId)');
    await expect(driver.disconnect()).rejects.toThrow('Driver must implement disconnect()');
    await expect(driver.sendUserProfile({})).rejects.toThrow('Driver must implement sendUserProfile(profile)');
    await expect(driver.startMeasurement({})).rejects.toThrow('Driver must implement startMeasurement(callbacks)');
  });

  it('HuaweiScale3Driver identifies supported scale model names', () => {
    const driver = new HuaweiScale3Driver();
    expect(driver.id).toBe('huawei_scale_3');
    expect(driver.name).toBe('HUAWEI Scale 3 / Scale 3 Pro');

    expect(driver.supportsDevice({ name: 'HaigeBLE' })).toBe(true);
    expect(driver.supportsDevice({ name: 'HUAWEI Scale 3 Pro' })).toBe(true);
    expect(driver.supportsDevice({ name: 'HAG-B19' })).toBe(true);
    expect(driver.supportsDevice({ name: 'HEM-B19' })).toBe(true);
    expect(driver.supportsDevice({ name: 'Xiaomi Scale 2' })).toBe(false);
    expect(driver.supportsDevice(null)).toBe(false);
  });

  it('ScaleManager finds matching driver for discovered devices', () => {
    const driver = ScaleManager.getDriverForDevice({
      deviceId: '50:FB:19:F8:0C:21',
      name: 'HaigeBLE'
    });

    expect(driver).toBeDefined();
    expect(driver.id).toBe('huawei_scale_3');
  });

  it('ScaleManager orchestrates measurement lifecycle with driver', async () => {
    const onStateChange = vi.fn();
    const onComplete = vi.fn();
    const onError = vi.fn();

    await ScaleManager.startMeasurement(
      { deviceId: '50:FB:19:F8:0C:21', type: 'huawei_scale_3' },
      { gender: 'male', age: 32, heightCm: 178 },
      { onStateChange, onComplete, onError }
    );

    expect(onStateChange).toHaveBeenCalledWith('connecting', expect.any(String));
    expect(onStateChange).toHaveBeenCalledWith('authenticating', expect.any(String));
    expect(onStateChange).toHaveBeenCalledWith('ready_for_step_on', expect.any(String));
  });

  it('ScaleManager handles unsupported device errors gracefully', async () => {
    const onError = vi.fn();

    await expect(
      ScaleManager.startMeasurement(
        { deviceId: 'AA:BB:CC:DD:EE:FF', name: 'Unknown Generic Gadget' },
        { gender: 'female', age: 28, heightCm: 165 },
        { onError }
      )
    ).rejects.toThrow(/Aucun pilote compatible trouvé/);

    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });
});

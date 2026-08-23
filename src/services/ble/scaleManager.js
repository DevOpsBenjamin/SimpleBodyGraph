import { BaseScaleDriver } from './scaleInterface';
import { HuaweiScale3Driver } from './drivers/huaweiScale3Driver';

class ScaleManagerClass {
  constructor() {
    /** @type {Map<string, BaseScaleDriver>} */
    this.drivers = new Map();
    this.initDefaultDrivers();
  }

  /**
   * Initialise les pilotes standards supportés nativement
   */
  initDefaultDrivers() {
    try {
      this.registerDriver(new HuaweiScale3Driver());
    } catch (err) {
      console.warn('Failed to register default HuaweiScale3Driver:', err);
    }
  }

  /**
   * Enregistre un nouveau pilote de balance dans le gestionnaire
   * @param {BaseScaleDriver} driver
   */
  registerDriver(driver) {
    if (!driver || !driver.id) {
      throw new Error('Invalid scale driver: missing id property');
    }
    this.drivers.set(driver.id, driver);
  }

  /**
   * Récupère un driver par son identifiant
   * @param {string} driverId
   * @returns {BaseScaleDriver|null}
   */
  getDriver(driverId) {
    return this.drivers.get(driverId) || null;
  }

  /**
   * Détermine le driver adapté pour un appareil découvert lors du scan BLE
   * @param {{ name?: string; localName?: string; deviceId: string; type?: string; manufacturerData?: any }} device
   * @returns {BaseScaleDriver|null}
   */
  getDriverForDevice(device) {
    for (const driver of this.drivers.values()) {
      try {
        if (driver.supportsDevice(device)) {
          return driver;
        }
      } catch (err) {
        console.warn(`Driver ${driver.id} supportsDevice failed:`, err);
      }
    }
    return null;
  }

  /**
   * Vérifie si un appareil est pris en charge par l'un des pilotes enregistrés
   * @param {{ name?: string; localName?: string; deviceId: string; type?: string }} device
   * @returns {boolean}
   */
  isDeviceSupported(device) {
    return this.getDriverForDevice(device) !== null;
  }

  /**
   * Retourne tous les pilotes enregistrés
   * @returns {BaseScaleDriver[]}
   */
  getAllDrivers() {
    return Array.from(this.drivers.values());
  }

  /**
   * Lance une prise de mesure complète avec un appareil et un profil donnés
   * @param {{ deviceId: string; type?: string }} device
   * @param {import('./scaleInterface').ScaleUserProfile} profile
   * @param {Object} callbacks
   * @param {function(string, string=): void} callbacks.onStateChange
   * @param {function(number): void} [callbacks.onLiveWeight]
   * @param {function(import('./scaleInterface').ScaleMeasurement): void} callbacks.onComplete
   * @param {function(Error): void} callbacks.onError
   */
  async startMeasurement(device, profile, callbacks) {
    const driver = (device.type && this.getDriver(device.type)) || this.getDriverForDevice(device);
    if (!driver) {
      const err = new Error(`Aucun pilote compatible trouvé pour l'appareil ${device.name || device.deviceId}`);
      if (callbacks && typeof callbacks.onError === 'function') {
        callbacks.onError(err);
      }
      throw err;
    }

    try {
      if (callbacks && typeof callbacks.onStateChange === 'function') {
        callbacks.onStateChange('connecting', `Connexion à ${driver.name}...`);
      }
      await driver.connect(device.deviceId);

      if (callbacks && typeof callbacks.onStateChange === 'function') {
        callbacks.onStateChange('authenticating', 'Configuration du profil utilisateur...');
      }
      await driver.sendUserProfile(profile);

      return await driver.startMeasurement(callbacks);
    } catch (error) {
      try {
        await driver.disconnect();
      } catch (e) {
        // ignore disconnect error
      }
      if (callbacks && typeof callbacks.onError === 'function') {
        callbacks.onError(error);
      }
      throw error;
    }
  }

  /**
   * Lance l'assistant d'appairage interactif avec le driver approprié
   * @param {{ deviceId: string; name?: string; type?: string; mac?: string }} device
   * @param {import('./scaleInterface').ScaleUserProfile} profile
   * @param {Object} callbacks
   * @returns {Promise<Object>}
   */
  async pairDevice(device, profile, callbacks) {
    const driver = (device.type && this.getDriver(device.type)) || this.getDriverForDevice(device);
    if (!driver) {
      const err = new Error(`Aucun pilote compatible trouvé pour l'appareil ${device.name || device.deviceId}`);
      if (callbacks && typeof callbacks.onError === 'function') {
        callbacks.onError(err);
      }
      throw err;
    }

    try {
      const result = await driver.pair(device, profile, callbacks);
      if (callbacks && typeof callbacks.onSuccess === 'function') {
        callbacks.onSuccess(result);
      }
      return result;
    } catch (error) {
      try {
        await driver.disconnect();
      } catch (e) {
        // ignore disconnect error
      }
      if (callbacks && typeof callbacks.onError === 'function') {
        callbacks.onError(error);
      }
      throw error;
    }
  }
}

export const ScaleManager = new ScaleManagerClass();


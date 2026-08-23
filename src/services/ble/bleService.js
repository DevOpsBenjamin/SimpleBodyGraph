import { Capacitor } from '@capacitor/core';
import { BleClient } from '@capacitor-community/bluetooth-le';

let isInitialized = false;
let isScanning = false;

export const BleService = {
  /**
   * Check if running on a native device (Android / iOS)
   */
  isNative() {
    return Capacitor.isNativePlatform();
  },

  /**
   * Initialize BLE subsystem
   */
  async initialize() {
    if (isInitialized) return true;
    try {
      if (this.isNative()) {
        await BleClient.initialize({ androidNeverForLocation: false });
      }
      isInitialized = true;
      return true;
    } catch (error) {
      console.error('BLE Initialization Error:', error);
      throw error;
    }
  },

  /**
   * Check if Bluetooth is enabled
   */
  async isEnabled() {
    try {
      await this.initialize();
      if (this.isNative()) {
        return await BleClient.isEnabled();
      }
      return true; // Web preview fallback
    } catch (error) {
      console.warn('Failed to check if Bluetooth is enabled:', error);
      return false;
    }
  },

  /**
   * Request user to enable Bluetooth (Android only)
   */
  async requestEnable() {
    if (this.isNative() && Capacitor.getPlatform() === 'android') {
      try {
        await BleClient.requestEnable();
        return true;
      } catch (error) {
        console.warn('Bluetooth enable request was rejected or failed:', error);
        return false;
      }
    }
    return true;
  },

  /**
   * Start scanning for BLE devices
   * @param {Function} onDeviceFound Callback when a device is advertised
   * @param {Object} options Filter options
   */
  async startScan(onDeviceFound, options = {}) {
    await this.initialize();

    if (this.isNative()) {
      const enabled = await this.isEnabled();
      if (!enabled) {
        const userEnabled = await this.requestEnable();
        if (!userEnabled) {
          throw new Error('Le Bluetooth est désactivé. Veuillez l\'activer pour continuer.');
        }
      }

      isScanning = true;
      const seenDevices = new Set();

      await BleClient.requestLEScan(
        {
          allowDuplicates: false,
          ...options
        },
        (result) => {
          if (!result || !result.device) return;
          const dev = result.device;
          const name = result.localName || dev.name || 'Appareil Bluetooth inconnu';
          const id = dev.deviceId;

          if (!seenDevices.has(id)) {
            seenDevices.add(id);
            if (typeof onDeviceFound === 'function') {
              onDeviceFound({
                deviceId: id,
                name,
                rssi: result.rssi ?? null,
                raw: result
              });
            }
          }
        }
      );
    } else {
      // Web / Browser mode: BLE hardware scan is restricted
      isScanning = false;
      throw new Error("Pour des raisons de compatibilité matérielle (écoute des paquets publicitaires passifs, négociation MTU et protocole propriétaire), la détection et la connexion aux balances connectées nécessitent l'application native Android (APK).");
    }
  },

  /**
   * Stop BLE scanning
   */
  async stopScan() {
    isScanning = false;
    if (this.isNative()) {
      try {
        await BleClient.stopLEScan();
      } catch (error) {
        console.warn('Error stopping BLE scan:', error);
      }
    }
  },

  /**
   * Check if currently scanning
   */
  isScanning() {
    return isScanning;
  }
};

import { BaseScaleDriver } from '../scaleInterface';
import { ScaleManager } from '../scaleManager';

/**
 * Pilote pour HUAWEI Scale 3 / Scale 3 Pro (HAG-B19 / HEM-B19 / HaigeBLE)
 * Encapsule l'authentification AES-128-CTR (Token B), synchronisation BIA et décodage 8 électrodes.
 */
export class HuaweiScale3Driver extends BaseScaleDriver {
  get id() {
    return 'huawei_scale_3';
  }

  get name() {
    return 'HUAWEI Scale 3 / Scale 3 Pro';
  }

  /**
   * Vérifie si le nom publicitaire correspond aux modèles Huawei Scale 3
   */
  supportsDevice(advertisement) {
    if (!advertisement) return false;
    const name = (advertisement.name || '').toLowerCase();
    return (
      name.includes('haigeble') ||
      name.includes('scale 3') ||
      name.includes('scale3') ||
      name.includes('hag-b19') ||
      name.includes('hem-b19') ||
      name.includes('huawei scale')
    );
  }

  /**
   * Connexion GATT au périphérique
   * @param {string} deviceId
   */
  async connect(deviceId) {
    this.deviceId = deviceId;
    this.isConnected = true;
    // Implémentation complète de la connexion GATT Capacitor dans Issue #67
  }

  /**
   * Déconnexion
   */
  async disconnect() {
    this.isConnected = false;
  }

  /**
   * Configuration du profil BIA
   * @param {import('../scaleInterface').ScaleUserProfile} profile
   */
  async sendUserProfile(profile) {
    this.currentProfile = profile;
    // Implémentation de la trame 0x31 69-octets (Sexe, Âge, Taille) dans Issue #67
  }

  /**
   * Démarre la capture de la pesée et le décodage BIA
   */
  async startMeasurement(callbacks) {
    if (callbacks?.onStateChange) {
      callbacks.onStateChange('ready_for_step_on', 'Montez sur la balance pieds nus pour lancer la mesure.');
    }
    // La boucle d'écoute BLE et décodage 0xCD sera implémentée lors de l'Issue #67
  }
}

// Enregistrement par défaut dans le ScaleManager
export const huaweiScale3Driver = new HuaweiScale3Driver();
ScaleManager.registerDriver(huaweiScale3Driver);

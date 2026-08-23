/**
 * @typedef {Object} ScaleMeasurement
 * @property {number} weightKg - Poids mesuré en kg (ex: 104.50)
 * @property {number|null} [fatPercentage] - Taux de masse grasse en % (ex: 26.8)
 * @property {number|null} [heartRateBpm] - Fréquence cardiaque en BPM (ex: 72)
 * @property {Object} [impedances] - Impédances bioélectriques BIA (8 électrodes)
 * @property {number[]} [impedances.feet] - Impédances pieds (basses et hautes fréquences)
 * @property {number[]} [impedances.hands] - Impédances mains / bras
 * @property {number|null} [batteryLevel] - Niveau de batterie en % (ex: 85)
 * @property {string} timestamp - Horodatage ISO-8601 de la pesée
 * @property {any} [rawPayload] - Données brutes pour audit ou debug
 */

/**
 * @typedef {Object} ScaleUserProfile
 * @property {'male'|'female'|null} gender - Sexe biologique
 * @property {number} age - Âge en années calculé depuis la date de naissance
 * @property {number} heightCm - Taille en centimètres
 * @property {number|null} [lastWeightKg] - Dernier poids connu
 * @property {boolean} [isGuest] - Mode invité (contournement d'association permanente)
 */

/**
 * @typedef {'idle'|'connecting'|'authenticating'|'ready_for_step_on'|'measuring_weight'|'measuring_impedance'|'complete'|'disconnected'|'error'} ScaleMeasurementState
 */

/**
 * Interface abstraite / Contrat de base pour tout pilote de balance connectée
 */
export class BaseScaleDriver {
  /**
   * Identifiant unique du driver (ex: 'huawei_scale_3')
   * @type {string}
   */
  get id() {
    throw new Error('Driver must implement get id()');
  }

  /**
   * Nom d'affichage lisible du modèle de balance (ex: 'HUAWEI Scale 3 / Scale 3 Pro')
   * @type {string}
   */
  get name() {
    throw new Error('Driver must implement get name()');
  }

  /**
   * Vérifie si le driver prend en charge l'appareil découvert via son annonce BLE
   * @param {{ name?: string; deviceId: string; manufacturerData?: any }} advertisement
   * @returns {boolean}
   */
  supportsDevice(advertisement) {
    throw new Error('Driver must implement supportsDevice(advertisement)');
  }

  /**
   * Établit la connexion GATT Bluetooth avec le périphérique
   * @param {string} deviceId - Adresse MAC ou UUID du périphérique
   * @returns {Promise<void>}
   */
  async connect(deviceId) {
    throw new Error('Driver must implement connect(deviceId)');
  }

  /**
   * Déconnecte proprement la balance
   * @returns {Promise<void>}
   */
  async disconnect() {
    throw new Error('Driver must implement disconnect()');
  }

  /**
   * Transmet le profil utilisateur à la balance pour ses calculs de bio-impédance
   * @param {ScaleUserProfile} profile
   * @returns {Promise<void>}
   */
  async sendUserProfile(profile) {
    throw new Error('Driver must implement sendUserProfile(profile)');
  }

  /**
   * Démarre la session de mesure et écoute les événements en direct
   * @param {Object} callbacks
   * @param {function(ScaleMeasurementState, string=): void} callbacks.onStateChange
   * @param {function(number): void} [callbacks.onLiveWeight]
   * @param {function(ScaleMeasurement): void} callbacks.onComplete
   * @param {function(Error): void} callbacks.onError
   * @returns {Promise<void>}
   */
  async startMeasurement(callbacks) {
    throw new Error('Driver must implement startMeasurement(callbacks)');
  }
}

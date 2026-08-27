import { BleClient, toUint8Array } from '@capacitor-community/bluetooth-le';
import { BleService } from '../bleService';
import { BaseScaleDriver } from '../scaleInterface';
import {
  deriveRootKey,
  generateAuthTokens,
  generateRandomHuid,
  isValidMac,
  buildUserProfilePayload,
  buildTimeSyncPayload,
  decodeBiaTelemetry,
  buildFramedChunks,
  FrameReassembler,
  encryptAesCtr,
  decryptPayload,
  encryptPayload,
  concatBytes,
  hexToBytes
} from './huaweiScale3Crypto';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// GATT Characteristic UUIDs pour HUAWEI Scale 3 / Scale 3 Pro
export const UUID_STATUS_SENTINEL = 'ba216311-1787-472b-bef6-3eb29e62293e'; // Handle 113 (0x73)
export const UUID_AUTH_REQ        = '02b2a08e-f8b0-4047-b1fd-f4e0efeee679'; // Handle 33 (0x21)
export const UUID_AUTH_TOKEN      = '32330a04-15d9-421a-91c5-2a2d5c7525c9'; // Handle 37 (0x25)
export const UUID_WORK_KEY        = 'a3d330f8-b84f-4f48-a78c-f8d1e33b597a'; // Handle 41 (0x29)
export const UUID_REG_2D          = '42596cbe-d291-4da3-8ca6-d1ae5d1c9174'; // Handle 45 (0x2D)
export const UUID_USER_INFO       = '8cc61d7d-66c0-4802-89c3-38c5a163592e'; // Handle 49 (0x31)
export const UUID_BIND_45         = '4338c65e-ed8e-4085-bbea-a25e33ca6b54'; // Handle 69 (0x45)
export const UUID_TIME_SYNC       = '00002a2b-0000-1000-8000-00805f9b34fb'; // Handle 82 (0x52)
export const UUID_INFO_5A         = '11872f15-a91d-49da-ac89-5107284f3425'; // Handle 90 (0x5A) - SN
export const UUID_INFO_62         = 'bfc36f6e-4150-4a4b-9052-3d359e52962e'; // Handle 98 (0x62)
export const UUID_INFO_7A         = '426f058d-8211-413e-8320-397a890a08bf'; // Handle 122 (0x7A) - Modèle
export const UUID_HISTORY_8F      = '0212f42a-5f19-4bc1-ba52-d7ec7ccb71a4'; // Handle 143 (0x8F)
export const UUID_REALTIME_BIA    = '46797c17-d639-488d-9476-4789e8472878'; // Handle 151 (0x97)
export const UUID_FE01_WRITE      = '0000fe01-0000-1000-8000-00805f9b34fb'; // Handle 215 (0xD7)
export const UUID_FE02_NOTIFY     = '0000fe02-0000-1000-8000-00805f9b34fb'; // Handle 218 (0xDA)

/**
 * Pilote pour HUAWEI Scale 3 / Scale 3 Pro (HAG-B19 / HEM-B19 / HaigeBLE)
 * Encapsule l'assistant d'appairage Mode 1, le handshake AES-128-CTR, et la mesure BIA en direct.
 */
export class HuaweiScale3Driver extends BaseScaleDriver {
  constructor() {
    super();
    this.deviceId = null;
    this.physicalMac = null;
    this.isConnected = false;
    this.currentProfile = null;
    this.rootKey = null;
    this.workKey = null;
    this.huid = null;
    this.charToServiceMap = new Map();
  }

  get id() {
    return 'huawei_scale_3';
  }

  get name() {
    return 'HUAWEI Scale 3 / Scale 3 Pro';
  }

  /**
   * Vérifie si le nom publicitaire ou l'identifiant correspond aux modèles Huawei Scale 3 / Pro
   * @param {{ name?: string; localName?: string; type?: string }} advertisement
   * @returns {boolean}
   */
  supportsDevice(advertisement) {
    if (!advertisement) return false;
    if (advertisement.type === this.id) return true;
    const name = (advertisement.name || advertisement.localName || '').toLowerCase().trim();
    return (
      name.includes('haigeble') ||
      name.includes('scale 3') ||
      name.includes('scale3') ||
      name.includes('scale_3') ||
      name.includes('scale-3') ||
      name.includes('hag-b19') ||
      name.includes('hem-b19') ||
      name.includes('huawei') ||
      name.includes('honor')
    );
  }

  /**
   * Découvre les services GATT du périphérique et associe chaque caractéristique à son service parent
   */
  async resolveGattServices() {
    this.charToServiceMap.clear();
    if (!BleService.isNative()) return;
    try {
      const result = await BleClient.getServices(this.deviceId);
      if (Array.isArray(result)) {
        for (const service of result) {
          if (Array.isArray(service.characteristics)) {
            for (const char of service.characteristics) {
              this.charToServiceMap.set(char.uuid.toLowerCase(), service.uuid.toLowerCase());
            }
          }
        }
      }
    } catch (err) {
      console.warn('Failed to resolve GATT services for device:', err);
    }
  }

  /**
   * Retourne le Service UUID correspondant à une Caractéristique GATT
   * @param {string} charUuid
   * @returns {string}
   */
  getServiceForChar(charUuid) {
    const lower = charUuid.toLowerCase();
    if (this.charToServiceMap.has(lower)) {
      return this.charToServiceMap.get(lower);
    }
    return '0000fee0-0000-1000-8000-00805f9b34fb';
  }

  /**
   * Écriture GATT sécurisée avec repli automatique sur writeWithoutResponse si requis
   */
  async safeWrite(charUuid, dataBytes, preferResponse = true) {
    if (!BleService.isNative()) return;
    const serviceUuid = this.getServiceForChar(charUuid);
    const dataView = new DataView(dataBytes.buffer, dataBytes.byteOffset, dataBytes.byteLength);
    if (preferResponse) {
      try {
        await BleClient.write(this.deviceId, serviceUuid, charUuid, dataView);
      } catch (err) {
        if (err?.message && (err.message.includes('permit') || err.message.includes('not allowed') || err.message.includes('response'))) {
          await BleClient.writeWithoutResponse(this.deviceId, serviceUuid, charUuid, dataView);
        } else {
          throw err;
        }
      }
    } else {
      await BleClient.writeWithoutResponse(this.deviceId, serviceUuid, charUuid, dataView);
    }
  }

  /**
   * Abonnement aux notifications d'une caractéristique GATT
   */
  async startNotify(charUuid, callback) {
    if (!BleService.isNative()) return;
    const serviceUuid = this.getServiceForChar(charUuid);
    await BleClient.startNotifications(this.deviceId, serviceUuid, charUuid, (dataView) => {
      const raw = toUint8Array(dataView);
      if (raw && raw.length > 0) {
        callback(raw);
      }
    });
  }

  /**
   * Arrêt des notifications d'une caractéristique GATT
   */
  async stopNotify(charUuid) {
    if (!BleService.isNative()) return;
    try {
      const serviceUuid = this.getServiceForChar(charUuid);
      await BleClient.stopNotifications(this.deviceId, serviceUuid, charUuid);
    } catch (e) {
      // Ignored
    }
  }

  /**
   * Connexion GATT au périphérique
   * @param {string} deviceId
   */
  async connect(deviceId) {
    this.deviceId = deviceId;
    if (BleService.isNative()) {
      await BleClient.initialize();
      await BleClient.connect(deviceId);
      await this.resolveGattServices();
    }
    this.isConnected = true;
  }

  /**
   * Déconnexion
   */
  async disconnect() {
    this.isConnected = false;
    this.workKey = null;
    if (BleService.isNative() && this.deviceId) {
      try {
        await BleClient.disconnect(this.deviceId);
      } catch (e) {
        // Ignored
      }
    }
  }

  /**
   * Configuration du profil BIA
   * @param {import('../scaleInterface').ScaleUserProfile} profile
   */
  async sendUserProfile(profile) {
    this.currentProfile = profile;
  }

  /**
   * Handshake complet (0x21, 0x25, 0x29) pour établir le canal chiffré WorkKey
   */
  async performHandshake() {
    if (!this.rootKey) {
      throw new Error('Clé racine (RootKey) non initialisée. Adresse MAC physique requise.');
    }

    // 1. Sentinelle & FE02
    try {
      await this.startNotify(UUID_STATUS_SENTINEL, () => {});
      await sleep(100);
      await this.startNotify(UUID_FE02_NOTIFY, () => {});
      await sleep(100);
    } catch (e) {}

    // 2. 0x21 Auth Request (réception de randA 16 octets)
    const randAReassembler = new FrameReassembler();
    let randA = null;
    let authResolve = null;
    const authPromise = new Promise((resolve, reject) => {
      authResolve = resolve;
      setTimeout(() => reject(new Error('Échec réception randA de la balance (délai dépassé 5s)')), 5000);
    });

    await this.startNotify(UUID_AUTH_REQ, (raw) => {
      const res = randAReassembler.feed(raw);
      if (res && res.length >= 16) {
        randA = res.subarray(0, 16);
        if (authResolve) authResolve(randA);
      }
    });
    await sleep(150);

    const authTx = hexToBytes('db0300c140');
    await this.safeWrite(UUID_AUTH_REQ, authTx, true);
    await authPromise;
    await this.stopNotify(UUID_AUTH_REQ);

    // 3. 0x25 Auth Tokens (émission de randB + tokenB)
    const randB = new Uint8Array(16);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(randB);
    } else {
      for (let i = 0; i < 16; i++) randB[i] = Math.floor(Math.random() * 256);
    }

    const { tokenB } = await generateAuthTokens(randA, randB);
    await this.startNotify(UUID_AUTH_TOKEN, () => {});
    await sleep(150);

    const tokenChunks = buildFramedChunks(concatBytes(randB, tokenB), 0xDB);
    for (const chunk of tokenChunks) {
      await this.safeWrite(UUID_AUTH_TOKEN, chunk, true);
      await sleep(20);
    }
    await sleep(300);
    await this.stopNotify(UUID_AUTH_TOKEN);

    // 4. 0x29 WorkKey exchange (chiffrement de la WorkKey avec la RootKey)
    let workKeyResolve = null;
    const workKeyPromise = new Promise((resolve, reject) => {
      workKeyResolve = resolve;
      setTimeout(() => reject(new Error('Échec validation WorkKey sur 0x29 (délai dépassé 4s)')), 4000);
    });

    await this.startNotify(UUID_WORK_KEY, (raw) => {
      const code = raw.length >= 4 ? raw[3] : null;
      if (code === 0 && workKeyResolve) {
        workKeyResolve(code);
      }
    });
    await sleep(150);

    const ivWk = new Uint8Array(16);
    this.workKey = new Uint8Array(16);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(ivWk);
      crypto.getRandomValues(this.workKey);
    } else {
      for (let i = 0; i < 16; i++) {
        ivWk[i] = Math.floor(Math.random() * 256);
        this.workKey[i] = Math.floor(Math.random() * 256);
      }
    }

    const encWk = await encryptAesCtr(this.rootKey, ivWk, this.workKey);
    const wkChunks = buildFramedChunks(concatBytes(ivWk, encWk), 0xDC);
    for (const chunk of wkChunks) {
      await this.safeWrite(UUID_WORK_KEY, chunk, true);
      await sleep(20);
    }

    await workKeyPromise;
    await this.stopNotify(UUID_WORK_KEY);
  }

  /**
   * Démarre la capture de la pesée de routine et le décodage BIA (Mode 2)
   * Orchestre la connexion, la synchro horaire (0x52), le profil (0x31), l'écoute télémétrique (0x97),
   * le déchiffrement du flux 38 octets et le commit post-mesure (0x31 type 2).
   *
   * @param {Object} callbacks
   * @param {function(string, string=): void} [callbacks.onStateChange]
   * @param {function(number): void} [callbacks.onLiveWeight]
   * @param {function(import('../scaleInterface').ScaleMeasurement): void} [callbacks.onComplete]
   * @param {function(Error): void} [callbacks.onError]
   * @returns {Promise<import('../scaleInterface').ScaleMeasurement>}
   */
  async startMeasurement(callbacks) {
    try {
      if (callbacks?.onStateChange) {
        callbacks.onStateChange('connecting', 'Connexion à la balance...');
      }

      if (!this.isConnected) {
        await this.connect(this.deviceId);
      }

      if (callbacks?.onStateChange) {
        callbacks.onStateChange('authenticating', 'Synchronisation de l\'heure et du profil...');
      }

      const physicalMac = this.physicalMac || this.deviceId;
      if (physicalMac && isValidMac(physicalMac)) {
        this.rootKey = await deriveRootKey(physicalMac);
      }

      if (BleService.isNative()) {
        // Mode Réel Matériel Android (GATT BLE)
        await this.performHandshake();

        // 2. Envoi capacités matérielles (0xD7)
        try {
          await this.safeWrite(UUID_FE01_WRITE, hexToBytes('5a000500013701001ca9'), false);
          await sleep(100);
        } catch (e) {}

        // 3. Synchronisation horaire (0x52)
        const timePayload = buildTimeSyncPayload(new Date());
        const timeChunks = buildFramedChunks(timePayload, 0xDB);
        await this.startNotify(UUID_TIME_SYNC, () => {});
        await sleep(150);
        await this.safeWrite(UUID_TIME_SYNC, timeChunks[0], true);
        await sleep(200);
        await this.stopNotify(UUID_TIME_SYNC);

        // 4. Profil utilisateur (0x31, type 0)
        const genderCode = this.currentProfile?.gender === 'female' ? 0 : 1;
        const ageVal = this.currentProfile?.age || 30;
        const heightVal = this.currentProfile?.heightCm || 175;
        const lastWeight = this.currentProfile?.lastWeightKg || 0;

        const profilePayload = buildUserProfilePayload({
          huid: this.huid || '30033000012345678',
          sex: genderCode,
          age: ageVal,
          heightCm: heightVal,
          weightKg: lastWeight,
          userType: 0
        });

        const encProfile = await encryptPayload(this.workKey, profilePayload);
        await this.startNotify(UUID_USER_INFO, () => {});
        await sleep(200);
        for (const chunk of buildFramedChunks(encProfile, 0xDC)) {
          await this.safeWrite(UUID_USER_INFO, chunk, true);
          await sleep(20);
        }
        await sleep(300);
        await this.stopNotify(UUID_USER_INFO);

        // 5. Requêtes hardware (0x7A Modèle, 0x8F Historique)
        for (const u of [UUID_INFO_7A, UUID_HISTORY_8F]) {
          try {
            await this.startNotify(u, () => {});
            await sleep(100);
            await this.safeWrite(u, hexToBytes('db0300c140'), true);
            await sleep(150);
            await this.stopNotify(u);
          } catch (e) {}
        }

        // 6. Profil Refresh (0x31)
        const encProfile2 = await encryptPayload(this.workKey, profilePayload);
        await this.startNotify(UUID_USER_INFO, () => {});
        await sleep(150);
        for (const chunk of buildFramedChunks(encProfile2, 0xDC)) {
          await this.safeWrite(UUID_USER_INFO, chunk, true);
          await sleep(20);
        }
        await sleep(200);
        await this.stopNotify(UUID_USER_INFO);

        // 7. Écoute de la télémétrie 0x97 (BIA Stream) & Décodage
        if (callbacks?.onStateChange) {
          callbacks.onStateChange('ready_for_step_on', 'Montez sur la balance pieds nus pour lancer la mesure.');
        }

        const measReassembler = new FrameReassembler();
        let measurementResolve = null;
        const measurementPromise = new Promise((resolve, reject) => {
          measurementResolve = resolve;
          setTimeout(() => reject(new Error('Délai d\'attente de la pesée dépassé (120s)')), 120000);
        });

        await this.startNotify(UUID_REALTIME_BIA, async (raw) => {
          const res = measReassembler.feed(raw);
          if (res) {
            try {
              const dec = measReassembler.magic === 0xCD ? await decryptPayload(this.workKey, res) : res;
              if (dec && dec.length >= 26) {
                const meas = decodeBiaTelemetry(dec);
                if (callbacks?.onLiveWeight && meas.weightKg > 0) {
                  callbacks.onLiveWeight(meas.weightKg);
                }
                if (meas.weightKg > 0 && measurementResolve) {
                  measurementResolve(meas);
                }
              }
            } catch (err) {
              console.warn('Error decrypting 0x97 BIA frame:', err);
            }
          }
        });
        await sleep(200);

        // Armement du streaming 0x97
        await this.safeWrite(UUID_REALTIME_BIA, hexToBytes('db0300c140'), true);

        if (callbacks?.onStateChange) {
          callbacks.onStateChange('measuring_impedance', 'Analyse bioélectrique BIA (8 électrodes)...');
        }

        const measurementResult = await measurementPromise;
        await this.stopNotify(UUID_REALTIME_BIA);

        // 8. Commit post-mesure (0x31 type 2)
        try {
          const commitPayload = buildUserProfilePayload({
            huid: this.huid || '30033000012345678',
            sex: genderCode,
            age: ageVal,
            heightCm: heightVal,
            weightKg: 0,
            userType: 2
          });
          const encCommit = await encryptPayload(this.workKey, commitPayload);
          for (const chunk of buildFramedChunks(encCommit, 0xDC)) {
            await this.safeWrite(UUID_USER_INFO, chunk, true);
            await sleep(20);
          }
          await sleep(300);
        } catch (e) {}

        if (callbacks?.onStateChange) {
          callbacks.onStateChange('complete', 'Pesée et composition corporelle enregistrées !');
        }

        if (callbacks?.onComplete) {
          callbacks.onComplete(measurementResult);
        }

        return measurementResult;
      } else {
        // Environnement Web / Vitest de test
        if (callbacks?.onStateChange) {
          callbacks.onStateChange('ready_for_step_on', 'Montez sur la balance pieds nus pour lancer la mesure.');
        }

        const lastWeight = this.currentProfile?.lastWeightKg || 80.0;
        if (callbacks?.onLiveWeight) {
          callbacks.onLiveWeight(lastWeight);
        }

        if (callbacks?.onStateChange) {
          callbacks.onStateChange('measuring_impedance', 'Analyse bioélectrique BIA (8 électrodes)...');
        }

        const rawSimulated = new Uint8Array(38);
        const view = new DataView(rawSimulated.buffer);
        view.setUint16(0, Math.round(lastWeight * 100), true);
        view.setUint16(2, 215, true); // 21.5% fat
        const now = new Date();
        view.setUint16(4, now.getFullYear(), true);
        view.setUint8(6, now.getMonth() + 1);
        view.setUint8(7, now.getDate());
        view.setUint8(8, now.getHours());
        view.setUint8(9, now.getMinutes());
        view.setUint8(10, now.getSeconds());
        view.setUint8(11, now.getDay() === 0 ? 7 : now.getDay());
        for (let i = 0; i < 6; i++) view.setUint16(12 + i * 2, 480 + i * 12, true);
        view.setUint16(24, 70, true);
        for (let i = 0; i < 6; i++) view.setUint16(26 + i * 2, 590 + i * 15, true);

        const measurementResult = decodeBiaTelemetry(rawSimulated);

        if (callbacks?.onStateChange) {
          callbacks.onStateChange('complete', 'Pesée et composition corporelle enregistrées !');
        }

        if (callbacks?.onComplete) {
          callbacks.onComplete(measurementResult);
        }

        return measurementResult;
      }
    } catch (error) {
      if (callbacks?.onError) {
        callbacks.onError(error);
      }
      throw error;
    }
  }

  /**
   * Assistant d'appairage Mode 1 (Flash Pairing & Pesée de référence)
   * Le driver pilote de manière autonome ses étapes et ses consignes UX.
   *
   * @param {{ deviceId: string; name?: string; mac?: string }} device
   * @param {import('../scaleInterface').ScaleUserProfile} profile
   * @param {Object} callbacks
   * @param {function(Object): void} [callbacks.onStep]
   * @param {function(string): Promise<string>} [callbacks.onRequestMac]
   * @param {function(Object): void} [callbacks.onSuccess]
   * @param {function(Error): void} [callbacks.onError]
   * @returns {Promise<Object>}
   */
  async pair(device, profile, callbacks) {
    try {
      // 1. Validation de l'adresse MAC physique
      let physicalMac = device.mac || device.deviceId;
      if (!isValidMac(physicalMac)) {
        if (callbacks?.onRequestMac) {
          physicalMac = await callbacks.onRequestMac(device.deviceId);
        }
        if (!physicalMac || !isValidMac(physicalMac)) {
          throw new Error('Une adresse MAC physique valide (XX:XX:XX:XX:XX:XX) est indispensable pour dériver les clés de sécurité.');
        }
      }

      this.physicalMac = physicalMac.replace(/-/g, ':').toUpperCase();

      if (callbacks?.onStep) {
        callbacks.onStep({
          stepId: 'mac_check',
          title: 'Vérification de l\'adresse MAC',
          message: `Adresse MAC physique vérifiée (${this.physicalMac}).`,
          status: 'success'
        });
      }

      // 2. Connexion GATT & Dérivation RootKey
      if (callbacks?.onStep) {
        callbacks.onStep({
          stepId: 'handshake',
          title: 'Connexion & Sécurisation BLE',
          message: 'Établissement de la connexion et dérivation des clés AES-128-CTR...',
          status: 'in_progress'
        });
      }

      await this.connect(device.deviceId);
      this.rootKey = await deriveRootKey(this.physicalMac);

      if (BleService.isNative()) {
        await this.performHandshake();
      }

      if (callbacks?.onStep) {
        callbacks.onStep({
          stepId: 'handshake',
          title: 'Connexion & Sécurisation BLE',
          message: 'Canal chiffré AES-128-CTR établi avec succès.',
          status: 'success'
        });
      }

      // 3. Attribution HUID & Armement Flash (0x45 + 0x2D)
      this.huid = generateRandomHuid();

      if (callbacks?.onStep) {
        callbacks.onStep({
          stepId: 'flash_reg',
          title: 'Enregistrement Utilisateur Flash',
          message: `Génération et gravure de l'identifiant HUID (${this.huid})...`,
          status: 'in_progress'
        });
      }

      let tareWeightKg = profile?.lastWeightKg || 0;

      if (BleService.isNative()) {
        // Armement Bind 0x45 (01)
        const bindChunk = buildFramedChunks(new Uint8Array([0x01]), 0xDB)[0];
        await this.startNotify(UUID_BIND_45, () => {});
        await sleep(150);
        await this.safeWrite(UUID_BIND_45, bindChunk, true);
        await sleep(200);
        await this.stopNotify(UUID_BIND_45);

        // Enregistrement HUID sur 0x2D et écoute de la tare
        const regReassembler = new FrameReassembler();
        let tareResolve = null;
        const tarePromise = new Promise((resolve) => {
          tareResolve = resolve;
          setTimeout(() => resolve(tareWeightKg), 25000);
        });

        await this.startNotify(UUID_REG_2D, async (raw) => {
          const res = regReassembler.feed(raw);
          if (res) {
            try {
              const dec = await decryptPayload(this.workKey, res);
              if (dec && dec.length >= 3) {
                const st = dec[0];
                const view = new DataView(dec.buffer, dec.byteOffset, dec.byteLength);
                const pw = view.getUint16(1, true) / 100.0;
                if (st === 0 && pw > 0) {
                  tareWeightKg = pw;
                  if (tareResolve) tareResolve(pw);
                }
              }
            } catch (e) {}
          }
        });
        await sleep(150);

        const huidBytes = new TextEncoder().encode(this.huid).subarray(0, 30);
        const paddedHuid = new Uint8Array(30);
        paddedHuid.set(huidBytes, 0);
        const encReg = await encryptPayload(this.workKey, paddedHuid);
        for (const chunk of buildFramedChunks(encReg, 0xDC)) {
          await this.safeWrite(UUID_REG_2D, chunk, true);
          await sleep(20);
        }

        // 4. Pesée de référence initiale
        if (callbacks?.onStep) {
          callbacks.onStep({
            stepId: 'tare_weighin',
            title: 'Pesée de Référence Initiale',
            message: 'Montez sur la balance pieds nus et restez stable pour la calibration initiale.',
            status: 'waiting_user_action',
            icon: 'scale',
            actionPrompt: 'Montez sur la balance pieds nus et restez immobile'
          });
        }

        await tarePromise;
        await this.stopNotify(UUID_REG_2D);

        // 5. Synchronisation de l'horloge et Commit profil 0x31
        if (callbacks?.onStep) {
          callbacks.onStep({
            stepId: 'profile_sync',
            title: 'Synchronisation du Profil BIA',
            message: 'Transmission des paramètres physiologiques (sexe, âge, taille)...',
            status: 'in_progress'
          });
        }

        // 0x52 Time Sync
        const timePayload = buildTimeSyncPayload(new Date());
        const timeChunks = buildFramedChunks(timePayload, 0xDB);
        await this.startNotify(UUID_TIME_SYNC, () => {});
        await sleep(150);
        await this.safeWrite(UUID_TIME_SYNC, timeChunks[0], true);
        await sleep(200);
        await this.stopNotify(UUID_TIME_SYNC);

        // Queries HW
        for (const u of [UUID_INFO_5A, UUID_INFO_7A, UUID_INFO_62]) {
          try {
            await this.startNotify(u, () => {});
            await sleep(100);
            await this.safeWrite(u, hexToBytes('db0300c140'), true);
            await sleep(150);
            await this.stopNotify(u);
          } catch (e) {}
        }

        // Profil 0x31
        const genderCode = profile?.gender === 'female' ? 0 : 1;
        const ageVal = profile?.age || 30;
        const heightVal = profile?.heightCm || 175;

        const profilePayload = buildUserProfilePayload({
          huid: this.huid,
          sex: genderCode,
          age: ageVal,
          heightCm: heightVal,
          weightKg: tareWeightKg,
          userType: 0
        });

        const encProfile = await encryptPayload(this.workKey, profilePayload);
        await this.startNotify(UUID_USER_INFO, () => {});
        await sleep(150);
        for (const chunk of buildFramedChunks(encProfile, 0xDC)) {
          await this.safeWrite(UUID_USER_INFO, chunk, true);
          await sleep(20);
        }
        await sleep(200);
        await this.stopNotify(UUID_USER_INFO);

        // Désarmement 0x45
        try {
          await this.safeWrite(UUID_BIND_45, hexToBytes('db0300c140'), true);
          await sleep(150);
        } catch (e) {}
      } else {
        // En mode test / dev
        if (callbacks?.onStep) {
          callbacks.onStep({
            stepId: 'tare_weighin',
            title: 'Pesée de Référence Initiale',
            message: 'Montez sur la balance pieds nus et restez stable pour la calibration initiale.',
            status: 'waiting_user_action',
            icon: 'scale',
            actionPrompt: 'Montez sur la balance pieds nus et restez immobile'
          });
        }
      }

      if (callbacks?.onStep) {
        callbacks.onStep({
          stepId: 'tare_weighin',
          title: 'Pesée de Référence Initiale',
          message: tareWeightKg > 0 ? `Pesée de référence captée : ${tareWeightKg.toFixed(2)} kg.` : 'Pesée de référence validée.',
          status: 'success'
        });
        callbacks.onStep({
          stepId: 'profile_sync',
          title: 'Synchronisation du Profil BIA',
          message: 'Profil synchronisé et verrouillé dans la mémoire de la balance.',
          status: 'success'
        });
      }

      // 6. Construction du descripteur de balance appairée
      const pairedDevice = {
        deviceId: device.deviceId,
        name: device.name || 'HUAWEI Scale 3',
        mac: this.physicalMac,
        type: 'huawei_scale_3',
        huid: this.huid,
        lastWeight: tareWeightKg,
        pairedAt: new Date().toISOString()
      };

      if (callbacks?.onSuccess) {
        callbacks.onSuccess(pairedDevice);
      }

      return pairedDevice;
    } catch (error) {
      if (callbacks?.onError) {
        callbacks.onError(error);
      }
      throw error;
    }
  }
}

export const huaweiScale3Driver = new HuaweiScale3Driver();

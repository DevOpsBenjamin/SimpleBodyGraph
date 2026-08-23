/**
 * Module Cryptographique & Cadrage de Trames pour HUAWEI Scale 3 / Scale 3 Pro
 * Implémente la dérivation RootKey, HMAC-SHA256 (tokenA/tokenB), AES-128-CTR WebCrypto,
 * CRC-16 CCITT et l'assemblage multi-trames pour BLE.
 */

// Constantes statiques du protocole Huawei Scale
export const CAK = hexToBytes('90B96ECA297EF78717E66E491084D3F8');
export const WB1033 = hexToBytes('CA4946D061C9FE534F6044F930EBB69B');
export const WB2033 = hexToBytes('FBCE6E2B4BAF80ED969BA26B4A4B9325');

// Table de correspondance CRC-16 CCITT
export const CRC_TABLE = [
  0, 4129, 8258, 12387, 16516, 20645, 24774, 28903, 33032, 37161, 41290, 45419, 49548, 53677, 57806, 61935,
  4657, 528, 12915, 8786, 21173, 17044, 29431, 25302, 37689, 33560, 45947, 41818, 54205, 50076, 62463, 58334,
  9314, 13379, 1056, 5121, 25830, 29895, 17572, 21637, 42346, 46411, 34088, 38153, 58862, 62927, 50604, 54669,
  13907, 9842, 5649, 1584, 30423, 26358, 22165, 18100, 46939, 42874, 38681, 34616, 63455, 59390, 55197, 51132,
  18628, 22757, 26758, 30887, 2112, 6241, 10242, 14371, 51660, 55789, 59790, 63919, 35144, 39273, 43274, 47403,
  23285, 19156, 31415, 27286, 6769, 2640, 14899, 10770, 56317, 52188, 64447, 60318, 39801, 35672, 47931, 43802,
  27814, 31879, 19684, 23749, 11298, 15363, 3168, 7233, 60846, 64911, 52716, 56781, 44330, 48395, 36200, 40265,
  32407, 28342, 24277, 20212, 15891, 11826, 7761, 3696, 65439, 61374, 57309, 53244, 48923, 44858, 40793, 36728,
  37256, 33193, 45514, 41451, 53516, 49453, 61774, 57711, 4224, 161, 12482, 8419, 20484, 16421, 28742, 24679,
  33721, 37784, 41979, 46042, 49981, 54044, 58239, 62302, 689, 4752, 8947, 13010, 16949, 21012, 25207, 29270,
  46570, 42443, 38312, 34185, 62830, 58703, 54572, 50445, 13538, 9411, 5280, 1153, 29798, 25671, 21540, 17413,
  42971, 47098, 34713, 38840, 59231, 63358, 50973, 55100, 9939, 14066, 1681, 5808, 26199, 30326, 17941, 22068,
  55628, 51565, 63758, 59695, 39368, 35305, 47498, 43435, 22596, 18533, 30726, 26663, 6336, 2273, 14466, 10403,
  52093, 56156, 60223, 64286, 35833, 39896, 43963, 48026, 19061, 23124, 27191, 31254, 2801, 6864, 10931, 14994,
  64814, 60687, 56684, 52557, 48554, 44427, 40424, 36297, 31782, 27655, 23652, 19525, 15522, 11395, 7392, 3265,
  61215, 65342, 53085, 57212, 44955, 49082, 36825, 40952, 28183, 32310, 20053, 24180, 11923, 16050, 3793, 7920
];

/**
 * Convertit une chaîne hexadécimale en Uint8Array
 * @param {string} hex
 * @returns {Uint8Array}
 */
export function hexToBytes(hex) {
  const cleanHex = hex.replace(/[^0-9a-fA-F]/g, '');
  if (cleanHex.length % 2 !== 0) {
    throw new Error(`Chaîne hexadécimale invalide : longueur impaire (${cleanHex})`);
  }
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Convertit un Uint8Array ou ArrayBuffer en chaîne hexadécimale
 * @param {Uint8Array|ArrayBuffer} buffer
 * @returns {string}
 */
export function bytesToHex(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Concatène plusieurs TypedArrays en un seul Uint8Array
 * @param {...Uint8Array} arrays
 * @returns {Uint8Array}
 */
export function concatBytes(...arrays) {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

/**
 * Obtenir l'interface WebCrypto SubtleCrypto de manière portable (Browser/Capacitor/Node)
 */
function getSubtleCrypto() {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
    return globalThis.crypto.subtle;
  }
  throw new Error('WebCrypto API (crypto.subtle) non disponible dans cet environnement');
}

/**
 * Calcule le SHA-256 d'un tampon
 * @param {Uint8Array} data
 * @returns {Promise<Uint8Array>}
 */
export async function sha256(data) {
  const subtle = getSubtleCrypto();
  const hashBuffer = await subtle.digest('SHA-256', data);
  return new Uint8Array(hashBuffer);
}

/**
 * Calcule le HMAC-SHA256
 * @param {Uint8Array} key
 * @param {Uint8Array} data
 * @returns {Promise<Uint8Array>}
 */
export async function hmacSha256(key, data) {
  const subtle = getSubtleCrypto();
  const cryptoKey = await subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await subtle.sign('HMAC', cryptoKey, data);
  return new Uint8Array(signature);
}

/**
 * Dérive la RootKey (16 octets) à partir de la véritable adresse MAC physique
 * @param {string} macAddress - Adresse MAC (ex: '50:FB:19:F8:0C:21')
 * @returns {Promise<Uint8Array>}
 */
export async function deriveRootKey(macAddress) {
  const macClean = (macAddress.replace(/[:-]/g, '') + '0000').toUpperCase();
  const macBytes = new TextEncoder().encode(macClean);

  const b4 = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    b4[i] = ((WB1033[i] << 4) ^ WB2033[i]) & 0xFF;
  }

  const hashB4 = await sha256(b4);
  const bE = hashB4.subarray(0, 16);

  const b5 = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    b5[i] = ((bE[i] >> 6) ^ macBytes[i]) & 0xFF;
  }

  const hashB5 = await sha256(b5);
  return hashB5.subarray(0, 16);
}

/**
 * Génère les tokens d'authentification mutuelle tokenB et tokenA
 * @param {Uint8Array} randA - 16 octets reçus de la balance
 * @param {Uint8Array} randB - 16 octets générés par le client
 * @returns {Promise<{ tokenB: Uint8Array, tokenA: Uint8Array }>}
 */
export async function generateAuthTokens(randA, randB) {
  const randAB = concatBytes(randA, randB);

  const key1 = concatBytes(CAK, new TextEncoder().encode('1123'));
  const h1 = await hmacSha256(key1, randAB);
  const tokenB = await hmacSha256(h1, randAB);

  const key2 = concatBytes(CAK, new TextEncoder().encode('9856'));
  const h2 = await hmacSha256(key2, randAB);
  const tokenA = await hmacSha256(h2, randAB);

  return { tokenB, tokenA };
}

/**
 * Chiffrement AES-128-CTR standard WebCrypto
 * @param {Uint8Array} keyBytes - Clé AES 16 octets (RootKey ou WorkKey)
 * @param {Uint8Array} ivBytes - Vecteur d'initialisation / compteur 16 octets
 * @param {Uint8Array} plainBytes - Données en clair
 * @returns {Promise<Uint8Array>}
 */
export async function encryptAesCtr(keyBytes, ivBytes, plainBytes) {
  const subtle = getSubtleCrypto();
  const cryptoKey = await subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-CTR' },
    false,
    ['encrypt']
  );
  const encrypted = await subtle.encrypt(
    { name: 'AES-CTR', counter: ivBytes, length: 128 },
    cryptoKey,
    plainBytes
  );
  return new Uint8Array(encrypted);
}

/**
 * Déchiffrement AES-128-CTR standard WebCrypto
 * @param {Uint8Array} keyBytes - Clé AES 16 octets (RootKey ou WorkKey)
 * @param {Uint8Array} ivBytes - Vecteur d'initialisation / compteur 16 octets
 * @param {Uint8Array} cipherBytes - Données chiffrées
 * @returns {Promise<Uint8Array>}
 */
export async function decryptAesCtr(keyBytes, ivBytes, cipherBytes) {
  const subtle = getSubtleCrypto();
  const cryptoKey = await subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-CTR' },
    false,
    ['decrypt']
  );
  const decrypted = await subtle.decrypt(
    { name: 'AES-CTR', counter: ivBytes, length: 128 },
    cryptoKey,
    cipherBytes
  );
  return new Uint8Array(decrypted);
}

/**
 * Chiffre un payload applicatif avec la WorkKey : préfixe avec 16 octets IV aléatoires
 * @param {Uint8Array} workKey
 * @param {Uint8Array} plainBytes
 * @param {Uint8Array} [optionalIv] - IV forcé (utile pour les tests déterministes)
 * @returns {Promise<Uint8Array>} [ 16B IV ] + [ Ciphertext ]
 */
export async function encryptPayload(workKey, plainBytes, optionalIv = null) {
  let iv = optionalIv;
  if (!iv) {
    iv = new Uint8Array(16);
    if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
      globalThis.crypto.getRandomValues(iv);
    } else {
      for (let i = 0; i < 16; i++) {
        iv[i] = Math.floor(Math.random() * 256);
      }
    }
  }
  const ciphertext = await encryptAesCtr(workKey, iv, plainBytes);
  return concatBytes(iv, ciphertext);
}

/**
 * Déchiffre un payload reçu : extrait les 16 premiers octets d'IV puis déchiffre le reste
 * @param {Uint8Array} workKey
 * @param {Uint8Array} encryptedPayload - [ 16B IV ] + [ Ciphertext ]
 * @returns {Promise<Uint8Array>}
 */
export async function decryptPayload(workKey, encryptedPayload) {
  if (encryptedPayload.length < 16) {
    throw new Error(`Charge utile chiffrée trop courte (${encryptedPayload.length} octets, min 16)`);
  }
  const iv = encryptedPayload.subarray(0, 16);
  const ciphertext = encryptedPayload.subarray(16);
  return decryptAesCtr(workKey, iv, ciphertext);
}

/**
 * Calcule le CRC-16 CCITT d'une trame avec les 2 derniers octets réservés à zéro
 * @param {Uint8Array} frame - Tableau complet incluant les 2 octets finaux de CRC
 * @returns {number} Valeur uint16 du CRC
 */
export function calculateCrc16(frame) {
  let s = 0;
  for (let i = 0; i < frame.length; i++) {
    const b = frame[i];
    s = ((s << 8) & 0xFFFF) ^ CRC_TABLE[(b ^ (s >> 8)) & 0xFF];
  }
  return s & 0xFFFF;
}

/**
 * Découpe un payload en trames BLE Huawei avec Magic, longueur, séquence et CRC-16
 * @param {Uint8Array} payload - Données à envoyer (en clair ou chiffrées)
 * @param {number} magic - 0xDB (clair hôte->balance) ou 0xDC (chiffré hôte->balance)
 * @returns {Uint8Array[]} Liste des trames complètes à envoyer
 */
export function buildFramedChunks(payload, magic = 0xDB) {
  const payloadBytes = payload instanceof Uint8Array ? payload : new Uint8Array(payload);
  const totalFrames = Math.ceil(payloadBytes.length / 15) || 1;
  const chunks = [];

  for (let i = 0; i < totalFrames; i++) {
    const chunkData = payloadBytes.subarray(i * 15, (i + 1) * 15);
    const length = chunkData.length;
    const frameLength = length + 5;
    const frame = new Uint8Array(frameLength);

    frame[0] = magic;
    frame[1] = length + 3;
    frame[2] = (((totalFrames - 1) & 0x0F) << 4) | (i & 0x0F);
    frame.set(chunkData, 3);

    const crc = calculateCrc16(frame);
    frame[frameLength - 2] = crc & 0xFF;        // CRC-16 Low byte
    frame[frameLength - 1] = (crc >> 8) & 0xFF; // CRC-16 High byte

    chunks.push(frame);
  }

  return chunks;
}

/**
 * Reconstructeur de trames fragmentées en réception (Scale -> Host)
 */
export class FrameReassembler {
  constructor() {
    this.buffer = [];
    this.magic = null;
  }

  /**
   * Injecte un paquet BLE brut reçu
   * @param {Uint8Array} raw
   * @returns {Uint8Array|null} Retourne le payload reconstitué si complet, sinon null
   */
  feed(raw) {
    if (!raw || raw.length < 5) return null;
    const magic = raw[0];
    if (magic !== 0xDB && magic !== 0xDC && magic !== 0xBD && magic !== 0xCD) {
      return null;
    }

    this.magic = magic;
    const length = raw[1] - 3;
    const seq = raw[2];
    const idx = seq & 0x0F;
    const total = ((seq >> 4) & 0x0F) + 1;

    if (idx === 0) {
      this.buffer = [];
    }

    const payloadChunk = raw.subarray(3, 3 + length);
    this.buffer.push(payloadChunk);

    if (idx + 1 === total) {
      const fullPayload = concatBytes(...this.buffer);
      this.buffer = [];
      return fullPayload;
    }

    return null;
  }
}

/**
 * Construit la structure binaire de profil utilisateur (0x31, 69 octets)
 * @param {Object} params
 * @param {string} params.huid - Identifiant HUID (max 30 car.)
 * @param {string} [params.uid=''] - UUID secondaire optionnel (max 32 car.)
 * @param {number} params.sex - 1 = Homme, 0 = Femme
 * @param {number} params.age - Âge en années
 * @param {number} params.heightCm - Taille en cm
 * @param {number} [params.weightKg=0] - Poids estimé en kg (x100)
 * @param {number} [params.userType=0] - 0 = Profil/Mesure, 2 = Commit post-mesure
 * @returns {Uint8Array} Buffer 69 octets
 */
export function buildUserProfilePayload({
  huid,
  uid = '',
  sex,
  age,
  heightCm,
  weightKg = 0,
  userType = 0
}) {
  const buf = new Uint8Array(69);
  const encoder = new TextEncoder();

  // HUID (30 octets)
  const huidBytes = encoder.encode(huid).subarray(0, 30);
  buf.set(huidBytes, 0);

  // UID (32 octets)
  if (uid) {
    const uidBytes = encoder.encode(uid).subarray(0, 32);
    buf.set(uidBytes, 30);
  }

  // Sexe (1 octet) & Âge (1 octet)
  buf[62] = (sex ? 1 : 0) & 0xFF;
  buf[63] = age & 0xFF;

  // Taille en cm (uint16 little endian)
  const height = Math.round(heightCm);
  buf[64] = height & 0xFF;
  buf[65] = (height >> 8) & 0xFF;

  // Poids x 100 (uint16 little endian)
  const weightVal = Math.round(weightKg * 100);
  buf[66] = weightVal & 0xFF;
  buf[67] = (weightVal >> 8) & 0xFF;

  // User type (1 octet)
  buf[68] = userType & 0xFF;

  return buf;
}

/**
 * Génère un identifiant HUID aléatoire de 17 chiffres (préfixe 300330000 + 8 chiffres)
 * @returns {string}
 */
export function generateRandomHuid() {
  const prefix = '300330000';
  let suffix = '';
  for (let i = 0; i < 8; i++) {
    suffix += Math.floor(Math.random() * 10).toString();
  }
  return prefix + suffix;
}

/**
 * Valide le format d'une adresse MAC physique (XX:XX:XX:XX:XX:XX ou XX-XX-XX-XX-XX-XX)
 * @param {string} mac
 * @returns {boolean}
 */
export function isValidMac(mac) {
  if (!mac || typeof mac !== 'string') return false;
  return /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(mac.trim());
}

/**
 * Décode la trame télémétrique de bio-impédance BIA déchiffrée (0x97, 26 à 38 octets)
 * @param {Uint8Array} dec - Données déchiffrées
 * @returns {import('../scaleInterface').ScaleMeasurement}
 */
export function decodeBiaTelemetry(dec) {
  if (!dec || dec.length < 26) {
    throw new Error(`Trame BIA invalide : longueur insuffisante (${dec ? dec.length : 0} octets, min 26)`);
  }

  const view = new DataView(dec.buffer, dec.byteOffset, dec.byteLength);

  // Offset 0..2 : Poids total (uint16_le, x100)
  const weightRaw = view.getUint16(0, true);
  const weightKg = Math.round(weightRaw) / 100.0;

  // Offset 2..4 : Masse grasse (uint16_le, x10)
  const fatRaw = view.getUint16(2, true);
  const fatPercentage = fatRaw > 0 ? Math.round(fatRaw) / 10.0 : null;

  // Offset 4..11 : Horodatage YYYY-MM-DD HH:mm:ss
  const year = view.getUint16(4, true);
  const month = view.getUint8(6);
  const day = view.getUint8(7);
  const hour = view.getUint8(8);
  const minute = view.getUint8(9);
  const second = view.getUint8(10);

  const pad = (n) => String(n).padStart(2, '0');
  const timestamp = `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}`;

  // Offset 12..24 : 6 impédances pieds (6 x uint16_le)
  const feetImpedances = [];
  for (let i = 0; i < 6; i++) {
    feetImpedances.push(view.getUint16(12 + i * 2, true));
  }

  // Offset 24..26 : Fréquence cardiaque (uint16_le, BPM)
  const hrRaw = view.getUint16(24, true);
  const heartRateBpm = hrRaw > 0 ? hrRaw : null;

  // Offset 26..38 : 6 impédances mains/poignée (6 x uint16_le) si trame 38 octets
  const handsImpedances = [];
  if (dec.length >= 38) {
    for (let i = 0; i < 6; i++) {
      handsImpedances.push(view.getUint16(26 + i * 2, true));
    }
  }

  return {
    weightKg,
    fatPercentage,
    heartRateBpm,
    impedances: {
      feet: feetImpedances,
      hands: handsImpedances
    },
    timestamp,
    rawPayload: bytesToHex(dec)
  };
}

/**
 * Construit le payload binaire de synchronisation horaire (0x52)
 * @param {Date} [date=new Date()]
 * @returns {Uint8Array}
 */
export function buildTimeSyncPayload(date = new Date()) {
  const buf = new Uint8Array(8);
  const view = new DataView(buf.buffer);

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  const second = date.getSeconds();
  const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay();

  view.setUint16(0, year, true);
  view.setUint8(2, month);
  view.setUint8(3, day);
  view.setUint8(4, hour);
  view.setUint8(5, minute);
  view.setUint8(6, second);
  view.setUint8(7, dayOfWeek);

  return buf;
}


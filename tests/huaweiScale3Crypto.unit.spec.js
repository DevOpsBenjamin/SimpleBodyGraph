import { describe, it, expect } from 'vitest';
import {
  hexToBytes,
  bytesToHex,
  concatBytes,
  calculateCrc16,
  deriveRootKey,
  generateAuthTokens,
  encryptAesCtr,
  decryptAesCtr,
  encryptPayload,
  decryptPayload,
  buildFramedChunks,
  FrameReassembler,
  buildUserProfilePayload,
  buildTimeSyncPayload,
  decodeBiaTelemetry,
  generateRandomHuid,
  isValidMac,
  CAK
} from '../src/services/ble/drivers/huaweiScale3Crypto';

describe('HUAWEI Scale 3 Crypto & Framing Unit Tests', () => {
  const sampleMac = '50:FB:19:F8:0C:21';
  // RootKey derived in Python reference for MAC 50:FB:19:F8:0C:21
  const expectedRootKeyHex = 'ba296c3fb705efd60ee7c6f813aeee3e';

  // Fixed test vectors
  const randAHex = '0102030405060708090a0b0c0d0e0f10';
  const randBHex = '1112131415161718191a1b1c1d1e1f20';
  // Expected TokenB from Python reference
  const expectedTokenBHex = '1cc07201bd766b5555b4cb85f466733a89602b86e800bfc8457b9acd88fb5b0a';

  it('hexToBytes and bytesToHex convert bidirectionally', () => {
    const hex = 'deadbeef0123456789abcdef';
    const bytes = hexToBytes(hex);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBe(12);
    expect(bytesToHex(bytes)).toBe(hex);
  });

  it('hexToBytes throws on odd length hex string', () => {
    expect(() => hexToBytes('abc')).toThrow(/longueur impaire/);
  });

  it('concatBytes merges multiple Uint8Arrays', () => {
    const a = new Uint8Array([1, 2]);
    const b = new Uint8Array([3, 4, 5]);
    const merged = concatBytes(a, b);
    expect(Array.from(merged)).toEqual([1, 2, 3, 4, 5]);
  });

  it('deriveRootKey derives exact 16-byte key matching Python reference', async () => {
    const rootKey = await deriveRootKey(sampleMac);
    expect(rootKey.length).toBe(16);
    expect(bytesToHex(rootKey)).toBe(expectedRootKeyHex);

    // Test with dash formatted MAC
    const rootKeyDash = await deriveRootKey('50-FB-19-F8-0C-21');
    expect(bytesToHex(rootKeyDash)).toBe(expectedRootKeyHex);
  });

  it('generateAuthTokens computes tokenB and tokenA via double HMAC-SHA256', async () => {
    const randA = hexToBytes(randAHex);
    const randB = hexToBytes(randBHex);
    const tokens = await generateAuthTokens(randA, randB);

    expect(tokens.tokenB.length).toBe(32);
    expect(tokens.tokenA.length).toBe(32);
    expect(bytesToHex(tokens.tokenB)).toBe(expectedTokenBHex);
  });

  it('encryptAesCtr and decryptAesCtr perform symmetrical AES-128-CTR', async () => {
    const key = hexToBytes('00112233445566778899aabbccddeeff');
    const iv = hexToBytes('a0a1a2a3a4a5a6a7a8a9aaabacadaeaf');
    const plainText = new TextEncoder().encode('Hello HUAWEI Scale 3 World!');

    const encrypted = await encryptAesCtr(key, iv, plainText);
    expect(encrypted).not.toEqual(plainText);
    expect(encrypted.length).toBe(plainText.length);

    const decrypted = await decryptAesCtr(key, iv, encrypted);
    expect(new TextDecoder().decode(decrypted)).toBe('Hello HUAWEI Scale 3 World!');
  });

  it('encryptPayload and decryptPayload wrap with 16-byte random IV', async () => {
    const workKey = hexToBytes('0102030405060708090a0b0c0d0e0f10');
    const plainBytes = new Uint8Array([10, 20, 30, 40, 50, 60]);

    const payload = await encryptPayload(workKey, plainBytes);
    expect(payload.length).toBe(16 + plainBytes.length);

    const decrypted = await decryptPayload(workKey, payload);
    expect(Array.from(decrypted)).toEqual(Array.from(plainBytes));
  });

  it('decryptPayload throws when payload is under 16 bytes', async () => {
    const workKey = new Uint8Array(16);
    await expect(decryptPayload(workKey, new Uint8Array(10))).rejects.toThrow(/trop courte/);
  });

  it('buildFramedChunks formats frame with magic, length, sequence and CRC-16', () => {
    // db0300c140 -> 5 bytes payload
    const payload = hexToBytes('db0300c140');
    const chunks = buildFramedChunks(payload, 0xDB);

    expect(chunks.length).toBe(1);
    const frameHex = bytesToHex(chunks[0]);
    // Python output: db0800db0300c140dfcc
    expect(frameHex).toBe('db0800db0300c140dfcc');
  });

  it('buildFramedChunks slices large payload (>15B) into multiple sequential frames', () => {
    // 38 bytes payload -> 3 frames (15 + 15 + 8)
    const largePayload = new Uint8Array(38);
    for (let i = 0; i < 38; i++) largePayload[i] = i + 1;

    const chunks = buildFramedChunks(largePayload, 0xDC);
    expect(chunks.length).toBe(3);

    // Frame 0: total 3 (seq high nibble = 2), index 0 (low nibble = 0) -> seq = 0x20
    expect(chunks[0][0]).toBe(0xDC);
    expect(chunks[0][1]).toBe(15 + 3); // length + 3 = 18
    expect(chunks[0][2]).toBe(0x20);

    // Frame 1: index 1 -> seq = 0x21
    expect(chunks[1][2]).toBe(0x21);

    // Frame 2: index 2 -> seq = 0x22, length = 8 + 3 = 11
    expect(chunks[2][1]).toBe(8 + 3);
    expect(chunks[2][2]).toBe(0x22);
  });

  it('FrameReassembler accurately reconstructs single and multi-frame messages', () => {
    const reassembler = new FrameReassembler();

    // Single frame
    const singlePayload = hexToBytes('db0300c140');
    const singleChunks = buildFramedChunks(singlePayload, 0xBD);
    const result1 = reassembler.feed(singleChunks[0]);
    expect(result1).not.toBeNull();
    expect(bytesToHex(result1)).toBe('db0300c140');

    // Multi-frame (38 bytes)
    const multiPayload = new Uint8Array(38);
    for (let i = 0; i < 38; i++) multiPayload[i] = (i * 7) & 0xFF;
    const multiChunks = buildFramedChunks(multiPayload, 0xCD);

    expect(reassembler.feed(multiChunks[0])).toBeNull();
    expect(reassembler.feed(multiChunks[1])).toBeNull();
    const resultMulti = reassembler.feed(multiChunks[2]);

    expect(resultMulti).not.toBeNull();
    expect(Array.from(resultMulti)).toEqual(Array.from(multiPayload));
  });

  it('buildUserProfilePayload builds exactly 69-byte binary structure (0x31)', () => {
    const profile = {
      huid: '30033000012345678',
      uid: 'my-uuid-12345',
      sex: 1, // Homme
      age: 28,
      heightCm: 180,
      weightKg: 75.5,
      userType: 0
    };

    const buf = buildUserProfilePayload(profile);
    expect(buf.length).toBe(69);

    // Check Sex & Age
    expect(buf[62]).toBe(1);
    expect(buf[63]).toBe(28);

    // Check Height (180 uint16 LE -> 0xB4, 0x00)
    expect(buf[64]).toBe(180 & 0xFF);
    expect(buf[65]).toBe(0);

    // Check Weight (75.5 * 100 = 7550 -> 0x1D7E -> 0x7E, 0x1D)
    expect(buf[66]).toBe(7550 & 0xFF);
    expect(buf[67]).toBe((7550 >> 8) & 0xFF);

    // Check userType
    expect(buf[68]).toBe(0);
  });

  it('generateRandomHuid produces 17-digit string with prefix 300330000', () => {
    const huid = generateRandomHuid();
    expect(huid).toMatch(/^300330000\d{8}$/);
    expect(huid.length).toBe(17);
  });

  it('isValidMac validates physical Bluetooth MAC formats', () => {
    expect(isValidMac('50:FB:19:F8:0C:21')).toBe(true);
    expect(isValidMac('50-fb-19-f8-0c-21')).toBe(true);
    expect(isValidMac('INVALID-MAC')).toBe(false);
    expect(isValidMac('50:FB:19:F8:0C')).toBe(false);
    expect(isValidMac(null)).toBe(false);
  });

  it('buildTimeSyncPayload creates 8-byte LE formatted payload', () => {
    const fixedDate = new Date(2026, 4, 15, 14, 30, 45); // 15 May 2026 14:30:45
    const payload = buildTimeSyncPayload(fixedDate);

    expect(payload.length).toBe(8);
    const view = new DataView(payload.buffer);
    expect(view.getUint16(0, true)).toBe(2026);
    expect(view.getUint8(2)).toBe(5); // May
    expect(view.getUint8(3)).toBe(15);
    expect(view.getUint8(4)).toBe(14);
    expect(view.getUint8(5)).toBe(30);
    expect(view.getUint8(6)).toBe(45);
  });

  it('decodeBiaTelemetry parses 38-byte stream (8 electrodes, feet + hands)', () => {
    const raw = new Uint8Array(38);
    const view = new DataView(raw.buffer);

    // Weight = 84.50 kg (8450)
    view.setUint16(0, 8450, true);
    // Body fat = 22.4 % (224)
    view.setUint16(2, 224, true);
    // Date: 2026-06-20 08:15:30
    view.setUint16(4, 2026, true);
    view.setUint8(6, 6);
    view.setUint8(7, 20);
    view.setUint8(8, 8);
    view.setUint8(9, 15);
    view.setUint8(10, 30);
    view.setUint8(11, 6);
    // 6 feet impedances
    for (let i = 0; i < 6; i++) view.setUint16(12 + i * 2, 500 + i * 10, true);
    // Heart rate = 68 BPM
    view.setUint16(24, 68, true);
    // 6 hands impedances
    for (let i = 0; i < 6; i++) view.setUint16(26 + i * 2, 600 + i * 15, true);

    const decoded = decodeBiaTelemetry(raw);

    expect(decoded.weightKg).toBe(84.50);
    expect(decoded.fatPercentage).toBe(22.4);
    expect(decoded.heartRateBpm).toBe(68);
    expect(decoded.timestamp).toBe('2026-06-20T08:15:30');
    expect(decoded.impedances.feet).toEqual([500, 510, 520, 530, 540, 550]);
    expect(decoded.impedances.hands).toEqual([600, 615, 630, 645, 660, 675]);
    expect(decoded.rawPayload).toBeDefined();
  });

  it('decodeBiaTelemetry parses 26-byte stream (feet-only model) and handles zero heart rate', () => {
    const raw = new Uint8Array(26);
    const view = new DataView(raw.buffer);

    view.setUint16(0, 7230, true); // 72.30 kg
    view.setUint16(2, 0, true);    // 0 -> null
    view.setUint16(4, 2026, true);
    view.setUint8(6, 7);
    view.setUint8(7, 1);
    view.setUint8(8, 7);
    view.setUint8(9, 0);
    view.setUint8(10, 0);
    view.setUint8(11, 3);
    for (let i = 0; i < 6; i++) view.setUint16(12 + i * 2, 450, true);
    view.setUint16(24, 0, true); // 0 BPM -> null

    const decoded = decodeBiaTelemetry(raw);

    expect(decoded.weightKg).toBe(72.30);
    expect(decoded.fatPercentage).toBeNull();
    expect(decoded.heartRateBpm).toBeNull();
    expect(decoded.impedances.feet.length).toBe(6);
    expect(decoded.impedances.hands.length).toBe(0);
  });

  it('decodeBiaTelemetry throws error when payload is too short (<26B)', () => {
    expect(() => decodeBiaTelemetry(new Uint8Array(20))).toThrow(/longueur insuffisante/);
  });
});

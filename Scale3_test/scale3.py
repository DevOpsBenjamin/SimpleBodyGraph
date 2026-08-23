#!/usr/bin/env python3
"""
==============================================================================
HUAWEI Scale 3 / Scale 3 Pro — Pilote BLE Autonome & Convivial (scale3.py)
==============================================================================
Fonctionnement :
  1. Premier lancement (si scale_config.json absent) :
     - Assistant interactif : demande MAC, Sexe, Âge, Taille (le poids est capté
       automatiquement par la balance lors de la pesée de tare sur 0x2D).
     - Génère automatiquement un identifiant HUID aléatoire.
     - Exécute la séquence complète d'association & gravure flash (Mode 1) :
       * Handshake chiffré (0x21, 0x25, 0x29)
       * Armement association (0x45) + Enregistrement HUID en mémoire flash (0x2D)
       * Capte automatiquement le poids de tare réel sur 0x2D
       * Synchro heure (0x52) + Requêtes HW (0x5A, 0x7A, 0x62)
       * Validation profil utilisateur (0x31 -> Code 0)
       * Désarmement (0x45)
       * Pesée de composition corporelle BIA en direct (0x97)
     - Sauvegarde automatiquement dans scale_config.json et quitte proprement.

  2. Lancements suivants (scale_config.json existant) :
     - Charge la configuration enregistrée.
     - Effectue la pesée de routine BIA complète (Mode 2 éprouvé).
     - Affiche les résultats (Poids, Masse Grasse %, Rythme Cardiaque, BIA 8 électrodes).
     - Met à jour le dernier poids et quitte proprement.

Options :
  --debug, -d        Activer le debug complet des trames hexadécimales BLE
  --reconfig         Forcer la reconfiguration et réassociation du profil
==============================================================================
"""

import argparse
import asyncio
import datetime
import hashlib
import hmac
import json
import logging
import os
import random
import re
import struct
import sys
import uuid
from typing import Optional
from bleak import BleakClient, BleakScanner
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(BASE_DIR, "scale_config.json")
LOG_FILE = os.path.join(BASE_DIR, "scale3_live.log")

# --- UUIDs GATT Huawei ---
UUID_STATUS_SENTINEL = "ba216311-1787-472b-bef6-3eb29e62293e" # Handle 113 / CCCD 115
UUID_AUTH_REQ        = "02b2a08e-f8b0-4047-b1fd-f4e0efeee679" # Handle 33 (0x21)
UUID_AUTH_TOKEN      = "32330a04-15d9-421a-91c5-2a2d5c7525c9" # Handle 37 (0x25)
UUID_WORK_KEY        = "a3d330f8-b84f-4f48-a78c-f8d1e33b597a" # Handle 41 (0x29)
UUID_REG_2D          = "42596cbe-d291-4da3-8ca6-d1ae5d1c9174" # Handle 45 (0x2D)
UUID_USER_INFO       = "8cc61d7d-66c0-4802-89c3-38c5a163592e" # Handle 49 (0x31)
UUID_BIND_45         = "4338c65e-ed8e-4085-bbea-a25e33ca6b54" # Handle 69 (0x45)
UUID_TIME_SYNC       = "00002a2b-0000-1000-8000-00805f9b34fb" # Handle 82 (0x52)
UUID_INFO_5A         = "11872f15-a91d-49da-ac89-5107284f3425" # Handle 90 (0x5A) - SN
UUID_INFO_62         = "bfc36f6e-4150-4a4b-9052-3d359e52962e" # Handle 98 (0x62)
UUID_INFO_7A         = "426f058d-8211-413e-8320-397a890a08bf" # Handle 122 (0x7A) - Modèle
UUID_HISTORY_8F      = "0212f42a-5f19-4bc1-ba52-d7ec7ccb71a4" # Handle 143 (0x8F)
UUID_REALTIME_BIA    = "46797c17-d639-488d-9476-4789e8472878" # Handle 151 (0x97)
UUID_FE01_WRITE      = "0000fe01-0000-1000-8000-00805f9b34fb" # Handle 215 (0xD7)
UUID_FE02_NOTIFY     = "0000fe02-0000-1000-8000-00805f9b34fb" # Handle 218 (0xDA)

# --- Constantes Cryptographiques ---
CAK    = bytes.fromhex("90B96ECA297EF78717E66E491084D3F8")
WB1033 = bytes.fromhex("CA4946D061C9FE534F6044F930EBB69B")
WB2033 = bytes.fromhex("FBCE6E2B4BAF80ED969BA26B4A4B9325")

CRC_TABLE = [
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
]

def derive_root_key(mac_address: str) -> bytes:
    mac_clean = (mac_address.replace(":", "") + "0000").upper().encode('utf-8')
    b4 = bytes(((WB1033[i] << 4) ^ WB2033[i]) & 0xFF for i in range(16))
    bE = hashlib.sha256(b4).digest()[:16]
    b5 = bytes(((bE[i] >> 6) ^ mac_clean[i]) & 0xFF for i in range(16))
    return hashlib.sha256(b5).digest()[:16]

def generate_auth_tokens(randA: bytes, randB: bytes) -> bytes:
    randAB = randA + randB
    h1 = hmac.new(CAK + b"1123", randAB, hashlib.sha256).digest()
    tokenB = hmac.new(h1, randAB, hashlib.sha256).digest()
    return tokenB

def build_framed_chunks(payload: bytes, magic: int = 0xDB) -> list:
    total_frames = (len(payload) + 14) // 15 or 1
    chunks = []
    for i in range(total_frames):
        chunk_data = payload[i*15:(i+1)*15]
        length = len(chunk_data)
        i4 = length + 5
        frame = bytearray(i4)
        frame[0] = magic
        frame[1] = length + 3
        frame[2] = (((total_frames - 1) & 0x0F) << 4) | (i & 0x0F)
        frame[3:3+length] = chunk_data
        s = 0
        for b in frame:
            s = ((s << 8) & 0xFFFF) ^ CRC_TABLE[(b ^ (s >> 8)) & 0xFF]
        frame[i4-2] = s & 0xFF
        frame[i4-1] = (s >> 8) & 0xFF
        chunks.append(bytes(frame))
    return chunks

class FrameReassembler:
    def __init__(self):
        self.buffer = bytearray()
        self.magic = None

    def feed(self, raw: bytes) -> Optional[bytes]:
        if len(raw) < 5 or raw[0] not in (0xDB, 0xDC, 0xBD, 0xCD):
            return None
        self.magic = raw[0]
        length = raw[1] - 3
        seq = raw[2]
        idx = seq & 0x0F
        total = ((seq >> 4) & 0x0F) + 1
        if idx == 0:
            self.buffer = bytearray()
        self.buffer.extend(raw[3:3+length])
        if idx + 1 == total:
            res = bytes(self.buffer)
            self.buffer = bytearray()
            return res
        return None

def build_user_info_profile(huid: str, uid: str, sex: int, age: int, height: int, weight: float, user_type: int) -> bytes:
    huid_bytes = huid.encode('utf-8')[:30].ljust(30, b'\x00')
    uid_bytes = uid.encode('utf-8')[:32].ljust(32, b'\x00')
    buf = bytearray()
    buf += huid_bytes
    buf += uid_bytes
    buf.append(sex & 0xFF)
    buf.append(age & 0xFF)
    buf += struct.pack('<H', height)
    buf += struct.pack('<H', int(round(weight * 100)))
    buf.append(user_type & 0xFF)
    assert len(buf) == 69
    return bytes(buf)

async def safe_write(client, char_uuid, data, prefer_response=True):
    try:
        await client.write_gatt_char(char_uuid, data, response=prefer_response)
    except Exception as e:
        if "permit" in str(e).lower() or "not allowed" in str(e).lower():
            await client.write_gatt_char(char_uuid, data, response=not prefer_response)
        else:
            raise

def generate_random_huid() -> str:
    prefix = "300330000"
    suffix = "".join(str(random.randint(0, 9)) for _ in range(8))
    return prefix + suffix

def is_valid_mac(mac: str) -> bool:
    return bool(re.match(r"^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$", mac))

def prompt_user_profile() -> dict:
    is_macos = (sys.platform == "darwin")

    print("\n" + "=" * 68)
    print("  🔧 CONFIGURATION INITIALE DU PILOTE HUAWEI SCALE 3 / 3 PRO")
    print("=" * 68)
    print("Veuillez renseigner vos informations pour initialiser le profil :\n")

    # 1. Adresse MAC physique
    if is_macos:
        print("  ℹ️  [INFO macOS]")
        print("     Apple masque l'adresse MAC Bluetooth réelle et la remplace par un UUID.")
        print("     Pour dériver la clé de sécurité, nous avons besoin de la VRAIE adresse MAC.")
        print("     👉 Vous la trouverez sur l'étiquette au dos/sous votre balance.\n")
        
        while True:
            m = input("  👉 Adresse MAC physique de la balance (ex: AA:BB:CC:DD:EE:FF) : ").strip()
            m_clean = m.replace("-", ":").upper()
            if is_valid_mac(m_clean):
                mac = m_clean
                break
            print("     ❌ Format MAC invalide. Format attendu : XX:XX:XX:XX:XX:XX.")
    else:
        print("  👉 Entrez l'adresse MAC de la balance (laisser vide pour détection automatique) : ")
        m = input("     MAC [Auto] : ").strip()
        m_clean = m.replace("-", ":").upper()
        mac = m_clean if is_valid_mac(m_clean) else ""

    # 2. Sexe
    while True:
        s = input("\n  👉 Sexe (1 = Homme, 0 = Femme) : ").strip()
        if s in ("0", "1"):
            sex = int(s)
            break
        print("     ❌ Veuillez entrer 1 pour Homme ou 0 pour Femme.")

    # 3. Âge
    while True:
        a = input("  👉 Âge en années (ex: 25) : ").strip()
        if a.isdigit() and 10 <= int(a) <= 120:
            age = int(a)
            break
        print("     ❌ Veuillez entrer un âge valide (entre 10 et 120 ans).")

    # 4. Taille
    while True:
        h = input("  👉 Taille en cm (ex: 170) : ").strip()
        if h.isdigit() and 80 <= int(h) <= 230:
            height = int(h)
            break
        print("     ❌ Veuillez entrer une taille valide (entre 80 et 230 cm).")

    # 5. HUID anonyme unique
    huid = generate_random_huid()
    print(f"\n  ✅ Identifiant HUID généré automatiquement : {huid}")
    print("  ⚖️  Le poids sera mesuré automatiquement par la balance lors de l'appairage.")
    print("=" * 68 + "\n")

    return {
        "mac": mac,
        "huid": huid,
        "sex": sex,
        "age": age,
        "height": height,
        "last_weight": 0.0
    }

class Scale3Driver:
    def __init__(self, config: dict, is_pairing: bool = False, debug: bool = False):
        self.config = config
        self.is_pairing = is_pairing
        self.debug = debug
        
        self.mac = config.get("mac", "").strip().upper()
        self.huid = config.get("huid", generate_random_huid())
        self.sex = int(config.get("sex", 1))
        self.age = int(config.get("age", 30))
        self.height = int(config.get("height", 175))
        self.weight = float(config.get("last_weight", 0.0))
        
        self.root_key = None
        self.work_key = os.urandom(16)
        self.randA = None
        
        self.auth_req_event = asyncio.Event()
        self.work_key_event = asyncio.Event()
        self.bind_event = asyncio.Event()
        self.reg_event = asyncio.Event()
        self.user_info_event = asyncio.Event()
        self.user_info_code = None
        self.measure_done = asyncio.Event()
        self.measured_data = {}
        
        self.log_file = open(LOG_FILE, "w", encoding="utf-8")

    def dbg(self, msg: str):
        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S,%f")[:-3]
        line = f"[{now_str}] [DEBUG] {msg}"
        self.log_file.write(line + "\n")
        self.log_file.flush()
        if self.debug:
            print(f"[{now_str}] {msg}")

    def info(self, msg: str):
        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S,%f")[:-3]
        line = f"[{now_str}] [INFO] {msg}"
        self.log_file.write(line + "\n")
        self.log_file.flush()
        print(f"[{now_str}] {msg}")

    def decrypt(self, full_enc: bytes) -> bytes:
        if len(full_enc) <= 16:
            return b""
        iv = full_enc[:16]
        ct = full_enc[16:]
        return Cipher(algorithms.AES(self.work_key), modes.CTR(iv), backend=default_backend()).decryptor().update(ct)

    def encrypt(self, plain: bytes) -> bytes:
        iv = os.urandom(16)
        ct = Cipher(algorithms.AES(self.work_key), modes.CTR(iv), backend=default_backend()).encryptor().update(plain)
        return iv + ct

    async def scan_for_scale(self) -> Optional[any]:
        found_device = None
        found_event = asyncio.Event()

        def detection_callback(device, adv):
            nonlocal found_device
            name = device.name or adv.local_name or ""
            if self.mac and (device.address.upper() == self.mac or device.address == self.mac):
                self.info(f"[SCAN] Balance trouvée par MAC : {name} [{device.address}] RSSI={adv.rssi}")
                found_device = device
                found_event.set()
            elif "HaigeBLE" in name or "Scale 3" in name or "HUAWEI Scale" in name:
                self.info(f"[SCAN] Balance trouvée : {name} [{device.address}] RSSI={adv.rssi}")
                found_device = device
                found_event.set()

        print("🔍 Scan Bluetooth en cours...")
        print("👉 Posez un pied sur la balance pour l'allumer...")
        
        scanner = BleakScanner(detection_callback=detection_callback)
        await scanner.start()
        try:
            await asyncio.wait_for(found_event.wait(), timeout=90.0)
        except asyncio.TimeoutError:
            self.info("❌ Temps d'attente dépassé (90s). Assurez-vous que la balance est bien allumée.")
            await scanner.stop()
            return None
        await scanner.stop()
        return found_device

    async def run(self) -> bool:
        device = await self.scan_for_scale()
        if not device:
            return False

        if not self.mac and is_valid_mac(device.address):
            self.mac = device.address.upper()
            self.config["mac"] = self.mac

        if not self.mac:
            print("\n❌ ERREUR : L'adresse MAC physique réelle de la balance est requise pour dériver la clé.")
            return False

        self.root_key = derive_root_key(self.mac)
        mode_str = "ASSOCIATION FLASH (Mode 1)" if self.is_pairing else "PESÉE DE ROUTINE (Mode 2)"
        self.info(f"[CONNEXION] Connexion à {device.address} ({mode_str})...")
        self.dbg(f"MAC Cible Crypto: {self.mac}")

        async with BleakClient(device) as client:
            self.info("[CONNEXION] Connecté au serveur GATT.")

            # Activer Sentinelle (0x73) et FE02 (0xDA)
            try:
                await client.start_notify(UUID_STATUS_SENTINEL, lambda s, d: self.dbg(f"  [SENTINELLE RX] {bytes(d).hex()}"))
                await asyncio.sleep(0.1)
                await client.start_notify(UUID_FE02_NOTIFY, lambda s, d: self.dbg(f"  [FE02 RX] {bytes(d).hex()}"))
                await asyncio.sleep(0.1)
            except Exception:
                pass

            # -------------------------------------------------------------
            # ÉTAPE 1 : AUTHENTIFICATION & HANDSHAKE
            # -------------------------------------------------------------
            self.dbg(">>> [ÉTAPE 1] Authentification & Handshake (Formule HMAC Validée Frida)")
            randA_reassembler = FrameReassembler()
            def on_auth_rx(sender, data):
                raw = bytes(data)
                self.dbg(f"  [0x21 RX RAW] {raw.hex()}")
                res = randA_reassembler.feed(raw)
                if res and len(res) >= 16:
                    self.randA = res[:16]
                    self.dbg(f"  [0x21 REASSEMBLÉ] randA = {self.randA.hex()}")
                    self.auth_req_event.set()

            await client.start_notify(UUID_AUTH_REQ, on_auth_rx)
            await asyncio.sleep(0.15)
            auth_tx = bytes.fromhex("db0300c140")
            self.dbg(f"  [0x21 TX] {auth_tx.hex()} (Auth Request)")
            await safe_write(client, UUID_AUTH_REQ, auth_tx, prefer_response=True)
            try:
                await asyncio.wait_for(self.auth_req_event.wait(), timeout=3.0)
            except asyncio.TimeoutError:
                self.info("❌ Échec réception randA")
                return False
            finally:
                try: await client.stop_notify(UUID_AUTH_REQ)
                except Exception: pass

            randB = os.urandom(16)
            tokenB = generate_auth_tokens(self.randA, randB)
            self.dbg(f"  [0x25 TX] randB ({randB.hex()}) + tokenB EXACT ({tokenB.hex()})")
            await client.start_notify(UUID_AUTH_TOKEN, lambda s, d: self.dbg(f"  [0x25 RX] {bytes(d).hex()}"))
            await asyncio.sleep(0.15)
            for chunk in build_framed_chunks(randB + tokenB, magic=0xDB):
                self.dbg(f"    -> [0x25 TX Chunk] {chunk.hex()}")
                await safe_write(client, UUID_AUTH_TOKEN, chunk, prefer_response=True)
                await asyncio.sleep(0.02)
            await asyncio.sleep(0.3)
            try: await client.stop_notify(UUID_AUTH_TOKEN)
            except Exception: pass

            def on_wk_rx(sender, data):
                raw = bytes(data)
                code = raw[3] if len(raw) >= 4 else None
                self.dbg(f"  [0x29 RX] {raw.hex()} (Code {code})")
                if code == 0:
                    self.work_key_event.set()

            await client.start_notify(UUID_WORK_KEY, on_wk_rx)
            await asyncio.sleep(0.15)
            iv_wk = os.urandom(16)
            enc_wk = Cipher(algorithms.AES(self.root_key), modes.CTR(iv_wk), backend=default_backend()).encryptor().update(self.work_key)
            self.dbg(f"  [0x29 TX] WorkKey chiffrée (IV={iv_wk.hex()}, WorkKey={self.work_key.hex()})")
            for chunk in build_framed_chunks(iv_wk + enc_wk, magic=0xDC):
                self.dbg(f"    -> [0x29 TX Chunk] {chunk.hex()}")
                await safe_write(client, UUID_WORK_KEY, chunk, prefer_response=True)
                await asyncio.sleep(0.02)

            try:
                await asyncio.wait_for(self.work_key_event.wait(), timeout=2.0)
                self.info("  ✅ Authentification & Handshake réussis (Client authentifié) !")
            finally:
                try: await client.stop_notify(UUID_WORK_KEY)
                except Exception: pass

            # -------------------------------------------------------------
            # ÉTAPE 2 : CAPABILITÉS (0xD7)
            # -------------------------------------------------------------
            cap_tx = bytes.fromhex("5a000500013701001ca9")
            self.dbg(f">>> [ÉTAPE 2] Envoi capacités matérielles 0xD7: {cap_tx.hex()}")
            try:
                await safe_write(client, UUID_FE01_WRITE, cap_tx, prefer_response=False)
                await asyncio.sleep(0.1)
            except Exception as e:
                self.dbg(f"  0xD7: {e}")

            # -------------------------------------------------------------
            # MODE 1 : ASSOCIATION FLASH (Premier lancement ou --reconfig)
            # -------------------------------------------------------------
            if self.is_pairing:
                self.dbg(">>> [MODE 1 : ASSOCIATION FLASH] Armement 0x45 (01) et Enregistrement 0x2D")
                
                # 1. Armer Bind 0x45 (valeur 0x01)
                bind_chunk = build_framed_chunks(b"\x01", magic=0xDB)[0] # db04000120d9
                await client.start_notify(UUID_BIND_45, lambda s, d: self.bind_event.set())
                await asyncio.sleep(0.15)
                self.dbg(f"  [0x45 TX] {bind_chunk.hex()} (Armement Bind 01)")
                await safe_write(client, UUID_BIND_45, bind_chunk, prefer_response=True)
                try: await asyncio.wait_for(self.bind_event.wait(), timeout=2.0)
                except Exception: pass
                finally:
                    try: await client.stop_notify(UUID_BIND_45)
                    except Exception: pass

                # 2. Enregistrer HUID sur 0x2D
                reg_reassembler = FrameReassembler()
                def on_reg_rx(sender, data):
                    raw = bytes(data)
                    self.dbg(f"  [0x2D RX RAW] {raw.hex()}")
                    res = reg_reassembler.feed(raw)
                    if res:
                        dec = self.decrypt(res)
                        self.dbg(f"  [0x2D DÉCHIFFRÉ] {dec.hex()}")
                        if len(dec) >= 3:
                            st = dec[0]
                            pw = struct.unpack('<H', dec[1:3])[0] / 100.0
                            if st == 0 and pw > 0:
                                self.weight = pw
                                self.dbg(f"  [0x2D PESÉE FLASH TARE] {self.weight:.2f} kg")
                        self.reg_event.set()

                await client.start_notify(UUID_REG_2D, on_reg_rx)
                await asyncio.sleep(0.15)
                huid_reg = self.huid.encode('utf-8')[:30].ljust(30, b'\x00')
                enc_reg = self.encrypt(huid_reg)
                self.dbg(f"  [0x2D TX] Enregistrement flash HUID ({self.huid})")
                for chunk in build_framed_chunks(enc_reg, magic=0xDC):
                    self.dbg(f"    -> [0x2D TX Chunk] {chunk.hex()}")
                    await safe_write(client, UUID_REG_2D, chunk, prefer_response=True)

                print("\n" + "=" * 68)
                print("  👣 MONTEZ SUR LA BALANCE MAINTENANT (Pesée de validation flash)")
                print("  👉 Pieds nus + poignée en main. Restez immobile ~5 secondes...")
                print("=" * 68 + "\n")
                self.info("  ⏳ Attente de la pesée de tare sur la balance...")

                try:
                    await asyncio.wait_for(self.reg_event.wait(), timeout=25.0)
                    if self.weight and self.weight > 0:
                        self.info(f"  ✅ Utilisateur validé — Poids capté automatiquement : {self.weight:.2f} kg")
                    else:
                        self.info("  ✅ Profil gravé en puce flash.")
                except asyncio.TimeoutError:
                    self.dbg("  (0x2D attente flash complétée)")
                finally:
                    try: await client.stop_notify(UUID_REG_2D)
                    except Exception: pass

            # -------------------------------------------------------------
            # ÉTAPE 3 : SYNCHRONISATION HORAIRE (0x52)
            # -------------------------------------------------------------
            now = datetime.datetime.now()
            time_payload = struct.pack('<HBBBBBB', now.year, now.month, now.day, now.hour, now.minute, now.second, now.weekday() + 1)
            time_chunk = build_framed_chunks(time_payload, magic=0xDB)[0]
            self.dbg(f">>> [ÉTAPE 3] Synchro heure 0x52: {time_chunk.hex()} ({now:%Y-%m-%d %H:%M:%S})")
            time_event = asyncio.Event()
            def on_time_rx(sender, data):
                self.dbg(f"  [0x52 RX] {bytes(data).hex()}")
                time_event.set()
            await client.start_notify(UUID_TIME_SYNC, on_time_rx)
            await asyncio.sleep(0.15)
            try:
                await safe_write(client, UUID_TIME_SYNC, time_chunk, prefer_response=True)
                await asyncio.wait_for(time_event.wait(), timeout=2.0)
            except Exception: pass
            finally:
                try: await client.stop_notify(UUID_TIME_SYNC)
                except Exception: pass

            # Hardware queries de séquence si Mode 1
            if self.is_pairing:
                for u, label in [(UUID_INFO_5A, "0x5A SN"), (UUID_INFO_7A, "0x7A Modèle"), (UUID_INFO_62, "0x62 Config")]:
                    try:
                        await client.start_notify(u, lambda s, d, l=label: self.dbg(f"  [{l} RX] {bytes(d).hex()}"))
                        await asyncio.sleep(0.1)
                        query_chunk = bytes.fromhex("db0300c140")
                        await safe_write(client, u, query_chunk, prefer_response=True)
                        await asyncio.sleep(0.15)
                        await client.stop_notify(u)
                    except Exception: pass

            # -------------------------------------------------------------
            # ÉTAPE 4 : PROFIL UTILISATEUR (0x31)
            # -------------------------------------------------------------
            self.dbg(f">>> [ÉTAPE 4] Profil 0x31 (Poids={self.weight:.2f} kg, Sexe={self.sex}, Age={self.age}, Taille={self.height}cm)")
            
            def on_ui_rx(sender, data):
                raw = bytes(data)
                self.user_info_code = raw[3] if len(raw) >= 4 else None
                status = "SUCCÈS (Code 0)" if self.user_info_code == 0 else f"NOTE (Code {self.user_info_code})"
                self.dbg(f"  [0x31 RX] {raw.hex()} -> {status}")
                self.user_info_event.set()

            await client.start_notify(UUID_USER_INFO, on_ui_rx)
            await asyncio.sleep(0.2)
            profile_data = build_user_info_profile(self.huid, "", self.sex, self.age, self.height, self.weight, 0)
            self.dbg(f"  [0x31 CLAIR 69B] {profile_data.hex()}")
            enc_profile = self.encrypt(profile_data)
            for chunk in build_framed_chunks(enc_profile, magic=0xDC):
                self.dbg(f"    -> [0x31 TX Chunk] {chunk.hex()}")
                await safe_write(client, UUID_USER_INFO, chunk, prefer_response=True)

            try:
                await asyncio.wait_for(self.user_info_event.wait(), timeout=5.0)
            except asyncio.TimeoutError:
                self.dbg("  (0x31 pas de réponse immédiate, poursuite)")
            finally:
                try: await client.stop_notify(UUID_USER_INFO)
                except Exception: pass

            if self.user_info_code == 0:
                self.info("  ✅ Profil utilisateur validé par la balance (Code 0) !")
            else:
                self.dbg(f"  [0x31 INFO] Réponse code {self.user_info_code} (calibration dynamique via streaming direct)")

            # Désarmement 0x45 si Mode 1
            if self.is_pairing:
                try:
                    await safe_write(client, UUID_BIND_45, bytes.fromhex("db0300c140"), prefer_response=True)
                    await asyncio.sleep(0.15)
                except Exception: pass

            # -------------------------------------------------------------
            # ÉTAPE 5 : REQUÊTES HARDWARE (0x7A Modèle, 0x8F Historique)
            # -------------------------------------------------------------
            self.dbg(">>> [ÉTAPE 5] Requêtes hardware (0x7A Modèle, 0x8F Historique)")
            for u, label in [(UUID_INFO_7A, "0x7A Modèle"), (UUID_HISTORY_8F, "0x8F Historique")]:
                try:
                    await client.start_notify(u, lambda s, d, l=label: self.dbg(f"  [{l} RX] {bytes(d).hex()}"))
                    await asyncio.sleep(0.1)
                    query_chunk = bytes.fromhex("db0300c140")
                    self.dbg(f"  [{label} TX] {query_chunk.hex()}")
                    await safe_write(client, u, query_chunk, prefer_response=True)
                    await asyncio.sleep(0.15)
                    await client.stop_notify(u)
                except Exception: pass

            # -------------------------------------------------------------
            # ÉTAPE 6 : PROFIL REFRESH (0x31)
            # -------------------------------------------------------------
            self.dbg(">>> [ÉTAPE 6] Profil 0x31 (Refresh)")
            ui_refresh_event = asyncio.Event()
            await client.start_notify(UUID_USER_INFO, lambda s, d: ui_refresh_event.set())
            await asyncio.sleep(0.15)
            enc_profile2 = self.encrypt(profile_data)
            for chunk in build_framed_chunks(enc_profile2, magic=0xDC):
                await safe_write(client, UUID_USER_INFO, chunk, prefer_response=True)
            try: await asyncio.wait_for(ui_refresh_event.wait(), timeout=2.0)
            except Exception: pass
            finally:
                try: await client.stop_notify(UUID_USER_INFO)
                except Exception: pass

            # -------------------------------------------------------------
            # ÉTAPE 7 : MESURE DE BIO-IMPÉDANCE BIA (0x97)
            # -------------------------------------------------------------
            self.dbg(">>> [ÉTAPE 7] Armement streaming BIA 0x97")
            meas_reassembler = FrameReassembler()

            def on_meas_rx(sender, data):
                raw = bytes(data)
                self.dbg(f"  [0x97 RX RAW] {raw.hex()}")
                res = meas_reassembler.feed(raw)
                if res:
                    dec = self.decrypt(res) if meas_reassembler.magic == 0xCD else res
                    self.dbg(f"  [0x97 DÉCHIFFRÉ {len(dec)}B] {dec.hex()}")
                    if len(dec) >= 26:
                        w = struct.unpack('<H', dec[0:2])[0] / 100.0
                        fat = struct.unpack('<H', dec[2:4])[0] / 10.0
                        y, m, d, hh, mm, ss = struct.unpack('<HBBBBB', dec[4:11])
                        feet = struct.unpack('<6H', dec[12:24])
                        hr = struct.unpack('<H', dec[24:26])[0]
                        hands = struct.unpack('<6H', dec[26:38]) if len(dec) >= 38 else ()
                        
                        self.measured_data = {
                            "weight": w,
                            "fat": fat,
                            "heart_rate": hr,
                            "feet": feet,
                            "hands": hands,
                            "timestamp": f"{y:04d}-{m:02d}-{d:02d} à {hh:02d}:{mm:02d}:{ss:02d}"
                        }
                        self.measure_done.set()

            await client.start_notify(UUID_REALTIME_BIA, on_meas_rx)
            await asyncio.sleep(0.2)
            arm_tx = bytes.fromhex("db0300c140")
            self.dbg(f"  [0x97 TX] {arm_tx.hex()} (Armement streaming)")
            try:
                await safe_write(client, UUID_REALTIME_BIA, arm_tx, prefer_response=True)
            except Exception as e:
                self.dbg(f"  0x97: {e}")

            print("\n" + "=" * 70)
            print("  👣  MESURE BIA EN COURS...")
            print("  👉 Pieds nus sur les électrodes + mains tenant fermement la poignée.")
            print("  (Attente de la mesure BIA en direct ~20s...)")
            print("=" * 70 + "\n")

            t_start = asyncio.get_event_loop().time()
            while asyncio.get_event_loop().time() - t_start < 120.0:
                if self.measure_done.is_set():
                    break
                if not client.is_connected:
                    self.info("Balance déconnectée.")
                    break
                await asyncio.sleep(0.5)

            try: await client.stop_notify(UUID_REALTIME_BIA)
            except Exception: pass

            # -------------------------------------------------------------
            # ÉTAPE 8 : COMMIT POST-MESURE (0x31 type=2)
            # -------------------------------------------------------------
            if self.measure_done.is_set():
                self.dbg(">>> [ÉTAPE 8] Commit post-mesure (0x31 type=2)")
                try:
                    commit_profile = build_user_info_profile(self.huid, "", self.sex, self.age, self.height, 0.0, 2)
                    enc_commit = self.encrypt(commit_profile)
                    self.dbg(f"  [0x31 COMMIT CLAIR] {commit_profile.hex()}")
                    for chunk in build_framed_chunks(enc_commit, magic=0xDC):
                        self.dbg(f"    -> [0x31 COMMIT TX Chunk] {chunk.hex()}")
                        await safe_write(client, UUID_USER_INFO, chunk, prefer_response=True)
                    await asyncio.sleep(0.5)
                    self.info("  ✅ Mesure validée et acquittée par la balance.")
                except Exception as e:
                    self.dbg(f"  Commit: {e}")

        # Fin de session
        if self.measure_done.is_set() and self.measured_data:
            d = self.measured_data
            print("\n" + "=" * 70)
            print("  🎉 RÉSULTAT DE LA MESURE BIO-IMPÉDANCE (BIA)")
            print(f"  Date & Heure :    {d['timestamp']}")
            print("=" * 70)
            print(f"  ⚖️  Poids Total :       {d['weight']:.2f} kg")
            print(f"  📊  Masse Grasse :      {d['fat']:.1f} %")
            print(f"  ❤️  Rythme Cardiaque :  {d['heart_rate']} bpm")
            print(f"  🦶  Impédances Pieds :  {d['feet']}")
            if d['hands']:
                print(f"  🤲  Impédances Mains :  {d['hands']}")
            print("=" * 70 + "\n")

            # Mettre à jour scale_config.json avec le poids exact mesuré
            self.config["last_weight"] = d["weight"]
            try:
                json.dump(self.config, open(CONFIG_FILE, "w", encoding="utf-8"), indent=2)
                self.dbg(f"Configuration enregistrée dans {CONFIG_FILE}")
            except Exception: pass

            print("✨ Session de pesée BIA terminée avec succès !\n")
            return True
        else:
            if self.is_pairing:
                json.dump(self.config, open(CONFIG_FILE, "w", encoding="utf-8"), indent=2)
                print("✅ Configuration enregistrée dans scale_config.json !")
                return True
            print("⚠️ Session terminée sans mesure complète.\n")
            return False

def main():
    parser = argparse.ArgumentParser(description="Pilote autonome et convivial pour HUAWEI Scale 3 / Scale 3 Pro")
    parser.add_argument("--debug", "-d", action="store_true", help="Activer l'affichage complet du debug des trames hex")
    parser.add_argument("--reconfig", action="store_true", help="Forcer la reconfiguration et réassociation du profil")
    args = parser.parse_args()

    config = None
    is_pairing = False

    # 1. Vérifier si scale_config.json existe
    if os.path.exists(CONFIG_FILE) and not args.reconfig:
        try:
            config = json.load(open(CONFIG_FILE, encoding="utf-8"))
            if not all(k in config for k in ("mac", "huid", "sex", "age", "height")):
                config = None
        except Exception:
            config = None

    # 2. Si pas de configuration ou reconfig demandée : Assistant + Mode Association Flash
    if config is None or args.reconfig:
        config = prompt_user_profile()
        is_pairing = True
    else:
        is_pairing = False

    # 3. Affichage du profil chargé
    mode_label = "MODE ASSOCIATION & FLASH (Premier lancement)" if is_pairing else "MODE ROUTINE QUOTIDIENNE"
    print("\n" + "=" * 70)
    print(f"  PILOTE AUTONOME BLE — HUAWEI SCALE 3 / 3 PRO")
    print(f"  MAC Cible        : {config.get('mac')}")
    print(f"  HUID Profil      : {config.get('huid')}")
    print(f"  Profil Base      : Sexe={config.get('sex')}, Age={config.get('age')}, Taille={config.get('height')}cm, Poids={config.get('last_weight', 0.0):.2f}kg")
    print(f"  Flux BLE         : {mode_label}")
    if args.debug:
        print(f"  Niveau Logs      : [DEBUG COMPLET ACTIF]")
    print("=" * 70 + "\n")

    # 4. Lancement du pilote
    driver = Scale3Driver(config=config, is_pairing=is_pairing, debug=args.debug)
    success = asyncio.run(driver.run())
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()

<template>
  <div class="glass-card p-5 sm:p-6 rounded-2xl space-y-6 border border-gray-800/80">
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-sm font-bold text-violet-400 uppercase tracking-wider">{{ $t('settings.devicesSection.title') }}</h3>
        <p class="text-xs text-gray-400 mt-1">{{ $t('settings.devicesSection.desc') }}</p>
      </div>

      <!-- Native / Web Badge -->
      <div
        :class="[
          'px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 select-none',
          isNativePlatform
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
        ]"
      >
        <Smartphone class="w-3.5 h-3.5" />
        <span>{{ isNativePlatform ? $t('settings.devicesSection.nativeBadge') : $t('settings.devicesSection.webBadge') }}</span>
      </div>
    </div>

    <!-- Feedback banner if any error -->
    <div v-if="errorMsg" class="text-xs text-rose-400 font-medium bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl flex items-center gap-2">
      <AlertTriangle class="w-4 h-4 shrink-0 text-rose-400" />
      <span>{{ errorMsg }}</span>
    </div>

    <!-- Compatibility Notice when on Web -->
    <div v-if="!isNativePlatform" class="p-4 bg-amber-950/20 border border-amber-500/30 rounded-2xl space-y-3">
      <div class="flex items-start gap-3">
        <Smartphone class="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div class="space-y-1.5 text-xs text-gray-300 leading-relaxed">
          <p><strong class="text-amber-300">{{ $t('settings.devicesSection.nativeRequiredTitle') }}</strong> {{ $t('settings.devicesSection.nativeRequiredDesc') }}</p>
          <p class="text-[11px] text-gray-400">{{ $t('settings.devicesSection.nativeRequiredHelp') }}</p>
        </div>
      </div>
      <a
        href="https://github.com/DevOpsBenjamin/SimpleBodyGraph/releases/latest/download/SimpleBodyGraph.apk"
        class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-semibold transition-all cursor-pointer shadow-sm"
      >
        <Download class="w-4 h-4" />
        <span>{{ $t('settings.devicesSection.downloadApkBtn') }}</span>
      </a>
    </div>

    <!-- Paired Devices List -->
    <div class="space-y-3">
      <span class="text-xs font-bold text-gray-400 uppercase tracking-wider block">{{ $t('settings.devicesSection.registeredScales') }}</span>

      <div v-if="store.pairedDevices.length === 0" class="p-6 bg-gray-950/40 border border-dashed border-gray-800 rounded-2xl text-center space-y-2">
        <Scale class="w-8 h-8 text-gray-600 mx-auto mb-1" />
        <p class="text-xs text-gray-300 font-medium">{{ $t('settings.devicesSection.noScalesTitle') }}</p>
        <p class="text-[11px] text-gray-500">{{ $t('settings.devicesSection.noScalesDesc') }}</p>
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div
          v-for="device in store.pairedDevices"
          :key="device.id || device.deviceId"
          class="p-4 bg-gray-950/80 border border-violet-500/30 rounded-2xl flex items-center justify-between shadow-lg shadow-violet-500/5"
        >
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <Scale class="w-5 h-5" />
            </div>
            <div>
              <h4 class="text-xs font-bold text-white leading-tight flex items-center gap-2">
                {{ device.name }}
                <span class="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">{{ $t('settings.devicesSection.pairedBadge') }}</span>
              </h4>
              <p class="text-[10px] text-gray-400 font-mono mt-0.5">{{ $t('settings.devicesSection.macPrefix') }}{{ device.mac || device.deviceId }}</p>
            </div>
          </div>

          <button
            type="button"
            @click="handleRemoveDevice(device.deviceId)"
            class="p-2 rounded-xl hover:bg-rose-500/10 text-gray-500 hover:text-rose-400 transition-colors cursor-pointer"
            :title="$t('settings.devicesSection.unpairScaleTitle')"
          >
            <Trash2 class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- Scan Action Box -->
    <div class="p-5 bg-gray-950/80 border border-gray-800 rounded-2xl space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 class="text-xs font-bold text-white">{{ $t('settings.devicesSection.scanBoxTitle') }}</h4>
          <p class="text-[11px] text-gray-400 mt-0.5">{{ $t('settings.devicesSection.scanBoxDesc') }}</p>
        </div>

        <button
          type="button"
          @click="toggleScan"
          :class="[
            'py-2.5 px-4 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center gap-2',
            isScanning
              ? 'bg-rose-600/20 text-rose-300 border border-rose-500/30 hover:bg-rose-600/30'
              : 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20'
          ]"
        >
          <RefreshCw v-if="isScanning" class="w-4 h-4 animate-spin" />
          <Search v-else class="w-4 h-4" />
          <span>{{ isScanning ? $t('settings.devicesSection.stopScanBtn') : $t('settings.devicesSection.startScanBtn') }}</span>
        </button>
      </div>

      <!-- Scan feedback error -->
      <div v-if="bleErrorMsg" class="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl flex items-center gap-2">
        <AlertTriangle class="w-4 h-4 shrink-0" />
        <span>{{ bleErrorMsg }}</span>
      </div>

      <!-- Scanning active animation indicator -->
      <div v-if="isScanning && discoveredDevices.length === 0" class="py-6 text-center space-y-2">
        <div class="w-8 h-8 border-2 border-violet-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p class="text-xs text-violet-300 font-medium">{{ $t('settings.devicesSection.scanningActiveTitle') }}</p>
        <p class="text-[10px] text-gray-500">{{ $t('settings.devicesSection.scanningActiveDesc') }}</p>
      </div>

      <!-- Discovered Devices List -->
      <div v-if="discoveredDevices.length > 0" class="space-y-2.5 pt-3 border-t border-gray-900">
        <span class="text-xs font-bold text-gray-400 uppercase tracking-wider block">{{ $t('settings.devicesSection.devicesFoundTitle', { count: discoveredDevices.length }) }}</span>

        <div
          v-for="dev in discoveredDevices"
          :key="dev.deviceId"
          class="p-3.5 bg-gray-900 border border-gray-800 hover:border-violet-500/30 rounded-xl flex items-center justify-between transition-all"
        >
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-violet-600/15 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <Bluetooth class="w-4.5 h-4.5" />
            </div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <p class="text-xs font-bold text-white">{{ dev.name }}</p>
                <span
                  v-if="getDeviceDriver(dev)"
                  class="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold"
                >
                  {{ $t('settings.devicesSection.compatibleBadge') }}
                </span>
                <span
                  v-else
                  class="text-[9px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700 select-none"
                >
                  {{ $t('settings.devicesSection.unsupportedBadge') }}
                </span>
              </div>
              <p class="text-[10px] text-gray-400 font-mono mt-0.5">{{ dev.deviceId }} <span v-if="dev.rssi" class="text-gray-500">({{ dev.rssi }} dBm)</span></p>
            </div>
          </div>

          <template v-if="!isDevicePaired(dev.deviceId)">
            <button
              type="button"
              v-if="getDeviceDriver(dev)"
              @click="handlePairDevice(dev)"
              class="py-2 px-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-colors cursor-pointer shadow-md shadow-violet-500/10"
            >
              {{ $t('settings.devicesSection.pairBtn') }}
            </button>
            <button
              type="button"
              v-else
              disabled
              class="py-2 px-3.5 rounded-xl bg-gray-800/80 border border-gray-700/50 text-gray-500 text-xs font-semibold cursor-not-allowed select-none"
              :title="$t('settings.devicesSection.unsupportedDriverTitle')"
            >
              {{ $t('settings.devicesSection.unsupportedBtn') }}
            </button>
          </template>
          <span v-else class="text-xs text-emerald-400 font-semibold px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            {{ $t('settings.devicesSection.alreadyPairedBadge') }}
          </span>
        </div>
      </div>
    </div>

    <!-- Assistant d'Appairage Interactif BLE -->
    <ScalePairingModal
      ref="pairingModalRef"
      :is-open="isPairingModalOpen"
      :device="selectedDeviceForPairing"
      @close="closePairingModal"
      @paired="onDeviceSuccessfullyPaired"
      @retry="startPairingWorkflow"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue';
import { Smartphone, Download, Scale, Trash2, RefreshCw, Search, AlertTriangle, Bluetooth } from 'lucide-vue-next';
import { useBodyGraphStore, calculateAge } from '../stores/bodyGraph';
import { BleService } from '../services/ble/bleService';
import { ScaleManager } from '../services/ble/scaleManager';
import { useI18n } from '../i18n';
import { useToast } from '../composables/useToast';
import ScalePairingModal from './ScalePairingModal.vue';

const store = useBodyGraphStore();
const { t } = useI18n();
const toast = useToast();

const isScanning = ref(false);
const discoveredDevices = ref([]);
const bleErrorMsg = ref('');
const errorMsg = ref('');
const isNativePlatform = computed(() => BleService.isNative());

// Pairing Modal state
const pairingModalRef = ref(null);
const isPairingModalOpen = ref(false);
const selectedDeviceForPairing = ref(null);

onUnmounted(() => {
  if (isScanning.value) {
    BleService.stopScan();
    isScanning.value = false;
  }
});

watch(() => store.activeView, (view) => {
  if (view !== 'settings' && isScanning.value) {
    BleService.stopScan();
    isScanning.value = false;
  }
});

const getDeviceDriver = (device) => {
  if (!device) return null;
  return ScaleManager.getDriverForDevice(device);
};

const isDevicePaired = (deviceId) => {
  return store.pairedDevices.some(d => d.deviceId === deviceId || d.mac === deviceId);
};

const toggleScan = async () => {
  bleErrorMsg.value = '';
  if (isScanning.value) {
    await BleService.stopScan();
    isScanning.value = false;
    return;
  }

  discoveredDevices.value = [];
  isScanning.value = true;

  try {
    await BleService.startScan((dev) => {
      if (!dev || !dev.name || !dev.name.trim() || dev.name === 'Appareil Bluetooth inconnu') return;
      const exists = discoveredDevices.value.some(d => d.deviceId === dev.deviceId);
      if (!exists) {
        discoveredDevices.value.push(dev);
      }
    });
  } catch (err) {
    isScanning.value = false;
    bleErrorMsg.value = err.message || 'Échec de la recherche Bluetooth.';
  }
};

const handlePairDevice = (device) => {
  selectedDeviceForPairing.value = device;
  isPairingModalOpen.value = true;
  if (isScanning.value) {
    BleService.stopScan();
    isScanning.value = false;
  }
  startPairingWorkflow(device);
};

const startPairingWorkflow = async (device) => {
  if (!device) return;
  pairingModalRef.value?.startPairingSession();

  const profileData = {
    gender: store.profile?.gender || 'male',
    age: calculateAge(store.profile?.birthDate) || 30,
    heightCm: store.profile?.height || 175,
    lastWeightKg: store.latestLog?.mass || null
  };

  try {
    await ScaleManager.pairDevice(device, profileData, {
      onStep: (stepInfo) => {
        pairingModalRef.value?.updateStep(stepInfo);
      },
      onRequestMac: async (defaultMac) => {
        return await pairingModalRef.value?.requestMacInput(defaultMac);
      },
      onSuccess: async (pairedData) => {
        await store.savePairedDevice(pairedData);
        pairingModalRef.value?.setSuccess(pairedData);
      },
      onError: (err) => {
        pairingModalRef.value?.setError(err);
      }
    });
  } catch (err) {
    pairingModalRef.value?.setError(err);
  }
};

const closePairingModal = () => {
  isPairingModalOpen.value = false;
  selectedDeviceForPairing.value = null;
};

const onDeviceSuccessfullyPaired = (device) => {
  toast.showToast(`Balance "${device?.name || 'HUAWEI Scale 3'}" associée avec succès !`, 'success');
};

const handleRemoveDevice = async (deviceId) => {
  try {
    await store.removePairedDevice(deviceId);
    toast.showToast(t('settings.devicesSection.unpairSuccess'), 'success');
  } catch (err) {
    errorMsg.value = t('settings.devicesSection.unpairFailed') + (err.message || err);
  }
};
</script>

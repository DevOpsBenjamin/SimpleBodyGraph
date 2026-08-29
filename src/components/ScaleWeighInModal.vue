<template>
  <div 
    v-if="store.showLiveWeighInModal" 
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
    @click.self="handleClose"
    role="dialog"
    aria-modal="true"
    aria-labelledby="weighin-modal-title"
  >
    <div 
      ref="modalContainer"
      class="w-full max-w-lg bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-2xl shadow-violet-950/40 space-y-6 relative overflow-hidden focus:outline-none"
      tabindex="-1"
    >
      <!-- Background Ambient Glow -->
      <div class="absolute -top-24 -right-24 w-52 h-52 bg-violet-600/15 rounded-full blur-3xl pointer-events-none"></div>

      <!-- Header -->
      <div class="flex items-center justify-between relative z-10">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
            <Scale class="w-5 h-5" />
          </div>
          <div>
            <h3 id="weighin-modal-title" class="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
              {{ $t('scaleWeighIn.title') }}
              <span class="text-[9px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-semibold border border-violet-500/30">
                {{ $t('scaleWeighIn.mode2') }}
              </span>
            </h3>
            <p class="text-xs text-gray-400">
              {{ activeScale?.name || $t('pairing.defaultDeviceName') }}
            </p>
          </div>
        </div>

        <button 
          type="button" 
          @click="handleClose"
          class="p-2 rounded-xl text-gray-500 hover:text-gray-300 hover:bg-gray-800/60 transition-colors cursor-pointer"
          :title="$t('common.close')"
          :aria-label="$t('common.close')"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Device Selector (if multiple scales paired) -->
      <div v-if="store.pairedDevices.length > 1 && !isMeasuring" class="space-y-1.5 relative z-10">
        <label for="scale-select" class="text-xs font-bold text-gray-400 uppercase tracking-wider block">
          {{ $t('scaleWeighIn.selectScale') }}
        </label>
        <select
          id="scale-select"
          v-model="selectedDeviceId"
          @change="restartMeasurement"
          class="w-full px-3.5 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-xs text-white focus:border-violet-500"
        >
          <option v-for="dev in store.pairedDevices" :key="dev.id || dev.deviceId" :value="dev.deviceId">
            {{ dev.name }} ({{ dev.mac || dev.deviceId }})
          </option>
        </select>
      </div>

      <!-- No Paired Device Warning -->
      <div v-if="store.pairedDevices.length === 0" class="p-6 bg-amber-950/20 border border-amber-500/30 rounded-2xl text-center space-y-3 relative z-10">
        <Scale class="w-10 h-10 text-amber-400 mx-auto" />
        <div>
          <h4 class="text-sm font-bold text-white">{{ $t('scaleWeighIn.noPairedScaleTitle') }}</h4>
          <p class="text-xs text-gray-300 mt-1">{{ $t('scaleWeighIn.noPairedScaleDesc') }}</p>
        </div>
        <button
          type="button"
          @click="goToSettings"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-all cursor-pointer shadow-lg shadow-violet-500/20"
        >
          <span>{{ $t('scaleWeighIn.openSettings') }}</span>
        </button>
      </div>

      <!-- Main Measuring & Results Flow -->
      <div v-else class="space-y-5 relative z-10">
        <!-- Live Status & Weight Card -->
        <div 
          :class="[
            'p-5 rounded-2xl border transition-all duration-300 space-y-4 text-center',
            state === 'complete'
              ? 'bg-emerald-950/20 border-emerald-500/40 shadow-lg shadow-emerald-500/5'
              : state === 'error'
                ? 'bg-rose-950/20 border-rose-500/40'
                : 'bg-gray-950/60 border-gray-800'
          ]"
        >
          <!-- Dynamic Center Icon / Animation -->
          <div class="flex justify-center">
            <div 
              :class="[
                'w-16 h-16 rounded-3xl flex items-center justify-center border transition-all',
                state === 'complete'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : state === 'error'
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                    : state === 'ready_for_step_on'
                      ? 'bg-violet-600/20 text-violet-400 border-violet-500/30 animate-pulse'
                      : 'bg-gray-800/60 text-violet-400 border-gray-700/60'
              ]"
            >
              <CheckCircle v-if="state === 'complete'" class="w-8 h-8 text-emerald-400" />
              <AlertTriangle v-else-if="state === 'error'" class="w-8 h-8 text-rose-400" />
              <Scale v-else-if="state === 'ready_for_step_on'" class="w-8 h-8 text-violet-300" />
              <Activity v-else-if="state === 'measuring_impedance'" class="w-8 h-8 text-amber-300 animate-bounce" />
              <RefreshCw v-else class="w-8 h-8 animate-spin text-violet-400" />
            </div>
          </div>

          <!-- Status Headline & Live Message -->
          <div class="space-y-1">
            <h4 class="text-sm font-bold text-white tracking-tight">
              {{ statusTitle }}
            </h4>
            <p class="text-xs text-gray-300 max-w-sm mx-auto leading-relaxed">
              {{ statusMessage }}
            </p>
          </div>

          <!-- Big Live Weight Counter -->
          <div class="py-2">
            <div class="text-4xl sm:text-5xl font-black text-white tracking-tight font-sans flex items-baseline justify-center gap-2">
              <span>{{ displayWeight }}</span>
              <span class="text-base sm:text-lg font-normal text-gray-400">{{ $t('common.kg') }}</span>
            </div>
          </div>

          <!-- Highlight Instruction Banner -->
          <div 
            v-if="state === 'ready_for_step_on'" 
            class="p-3 bg-violet-500/10 border border-violet-500/20 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold text-violet-200"
          >
            <Sparkles class="w-4 h-4 text-violet-400 shrink-0" />
            <span>{{ $t('scaleWeighIn.stepOnTip') }}</span>
          </div>
        </div>

        <!-- Detailed Metrics Overview (when complete) -->
        <div v-if="state === 'complete' && measurement" class="space-y-3">
          <span class="text-xs font-bold text-gray-400 uppercase tracking-wider block">{{ $t('scaleWeighIn.resultsTitle') }}</span>
          
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <!-- Poids Card -->
            <div class="p-3.5 bg-gray-950/80 border border-gray-800 rounded-xl space-y-1">
              <span class="text-[10px] text-gray-400 font-medium">{{ $t('scaleWeighIn.bodyMass') }}</span>
              <div class="text-lg font-extrabold text-white">{{ measurement.weightKg.toFixed(2) }} <span class="text-xs font-normal text-gray-400">{{ $t('common.kg') }}</span></div>
            </div>

            <!-- Masse Grasse Card -->
            <div class="p-3.5 bg-gray-950/80 border border-gray-800 rounded-xl space-y-1">
              <span class="text-[10px] text-amber-400/80 font-medium">{{ $t('scaleWeighIn.fatRate') }}</span>
              <div class="text-lg font-extrabold text-amber-300">
                {{ measurement.fatPercentage !== null ? measurement.fatPercentage.toFixed(1) + '%' : '--' }}
              </div>
            </div>

            <!-- Rythme Cardiaque -->
            <div class="p-3.5 bg-gray-950/80 border border-gray-800 rounded-xl space-y-1">
              <span class="text-[10px] text-rose-400/80 font-medium flex items-center gap-1">
                <Heart class="w-3 h-3 text-rose-400" />
                <span>{{ $t('scaleWeighIn.heartRate') }}</span>
              </span>
              <div class="text-lg font-extrabold text-rose-300">
                {{ measurement.heartRateBpm !== null ? measurement.heartRateBpm + ' ' + $t('scaleWeighIn.bpm') : '--' }}
              </div>
            </div>

            <!-- Masse Grasse en kg -->
            <div v-if="measurement.fatPercentage !== null" class="p-3.5 bg-gray-950/80 border border-gray-800 rounded-xl space-y-1">
              <span class="text-[10px] text-gray-400 font-medium">{{ $t('history.fatMass') }}</span>
              <div class="text-sm font-bold text-gray-200">
                {{ (measurement.weightKg * measurement.fatPercentage / 100).toFixed(2) }} {{ $t('common.kg') }}
              </div>
            </div>

            <!-- Masse Maigre en kg -->
            <div v-if="measurement.fatPercentage !== null" class="p-3.5 bg-gray-950/80 border border-gray-800 rounded-xl space-y-1">
              <span class="text-[10px] text-gray-400 font-medium">{{ $t('history.leanMass') }}</span>
              <div class="text-sm font-bold text-gray-200">
                {{ (measurement.weightKg * (1 - measurement.fatPercentage / 100)).toFixed(2) }} {{ $t('common.kg') }}
              </div>
            </div>

            <!-- Impédances BIA -->
            <div class="p-3.5 bg-gray-950/80 border border-gray-800 rounded-xl space-y-1">
              <span class="text-[10px] text-violet-400/80 font-medium">{{ $t('scaleWeighIn.biaImpedances') }}</span>
              <div class="text-xs font-bold text-violet-300">
                {{ $t('scaleWeighIn.channelsCaptured', { count: totalImpedanceChannels }) }}
              </div>
            </div>
          </div>

          <!-- Date Selector -->
          <div class="p-3.5 bg-gray-950/60 border border-gray-800/80 rounded-xl flex items-center justify-between gap-3">
            <span class="text-xs font-medium text-gray-300">{{ $t('scaleWeighIn.recordDateLabel') }}</span>
            <input
              type="date"
              v-model="recordDate"
              class="px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 text-xs text-white focus:border-violet-500"
            />
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-2 pt-2">
          <template v-if="state === 'complete'">
            <button
              type="button"
              @click="handleSave"
              :disabled="isSaving"
              class="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5"
            >
              <CheckCircle class="w-4 h-4" />
              <span>{{ isSaving ? $t('scaleWeighIn.saving') : $t('scaleWeighIn.saveToHistory') }}</span>
            </button>
            <button
              type="button"
              @click="restartMeasurement"
              class="py-3 px-3.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold transition-all cursor-pointer"
              :title="$t('scaleWeighIn.restartWeighIn')"
              :aria-label="$t('scaleWeighIn.restartWeighIn')"
            >
              <RefreshCw class="w-4 h-4" />
            </button>
          </template>

          <template v-else-if="state === 'error'">
            <button
              type="button"
              @click="restartMeasurement"
              class="flex-1 py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-all cursor-pointer shadow-lg shadow-violet-500/20 flex items-center justify-center gap-1.5"
            >
              <RefreshCw class="w-3.5 h-3.5" />
              <span>{{ $t('pairing.retry') }}</span>
            </button>
            <button
              type="button"
              @click="handleClose"
              class="flex-1 py-2.5 px-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold transition-all cursor-pointer"
            >
              {{ $t('common.close') }}
            </button>
          </template>

          <template v-else>
            <button
              type="button"
              @click="handleClose"
              class="w-full py-2.5 px-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold transition-all cursor-pointer"
            >
              {{ $t('common.cancel') }}
            </button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { Scale, Bluetooth, CheckCircle, AlertTriangle, RefreshCw, X, Sparkles, Heart, Activity } from 'lucide-vue-next';
import { useBodyGraphStore, calculateAge } from '../stores/bodyGraph';
import { ScaleManager } from '../services/ble/scaleManager';
import { useModalAccessibility } from '../composables/useModalAccessibility';
import { useToast } from '../composables/useToast';
import { useI18n } from '../i18n';

const store = useBodyGraphStore();
const { showToast } = useToast();
const { t } = useI18n();

const modalContainer = ref(null);
const selectedDeviceId = ref('');
const state = ref('idle'); // 'idle' | 'connecting' | 'authenticating' | 'ready_for_step_on' | 'measuring_impedance' | 'complete' | 'error'
const liveWeight = ref(null);
const measurement = ref(null);
const errorMessage = ref('');
const isSaving = ref(false);
const recordDate = ref(new Date().toISOString().split('T')[0]);

const activeScale = computed(() => {
  if (selectedDeviceId.value) {
    return store.pairedDevices.find(d => d.deviceId === selectedDeviceId.value) || store.pairedDevices[0] || null;
  }
  return store.pairedDevices[0] || null;
});

const isMeasuring = computed(() => {
  return state.value !== 'idle' && state.value !== 'complete' && state.value !== 'error';
});

const displayWeight = computed(() => {
  if (measurement.value?.weightKg) {
    return measurement.value.weightKg.toFixed(2);
  }
  if (liveWeight.value !== null) {
    return liveWeight.value.toFixed(2);
  }
  return '--.--';
});

const totalImpedanceChannels = computed(() => {
  const imp = measurement.value?.impedances;
  if (!imp) return 0;
  // feet/hands are legacy misnomers for the 50 kHz / 250 kHz bands, still read
  // so logs recorded by earlier versions keep displaying correctly.
  const lowFreq = (imp.r_50k || imp.feet)?.length || 0;
  const highFreq = (imp.r_250k || imp.hands)?.length || 0;
  return lowFreq + highFreq;
});

const statusTitle = computed(() => {
  switch (state.value) {
    case 'connecting': return t('scaleWeighIn.statusConnectingTitle');
    case 'authenticating': return t('scaleWeighIn.statusAuthenticatingTitle');
    case 'ready_for_step_on': return t('scaleWeighIn.statusReadyTitle');
    case 'measuring_impedance': return t('scaleWeighIn.statusMeasuringTitle');
    case 'complete': return t('scaleWeighIn.statusCompleteTitle');
    case 'error': return t('scaleWeighIn.statusErrorTitle');
    default: return t('scaleWeighIn.statusInitTitle');
  }
});

const statusMessage = computed(() => {
  switch (state.value) {
    case 'connecting': return t('scaleWeighIn.statusConnectingMsg', { name: activeScale.value?.name || t('pairing.defaultDeviceName') });
    case 'authenticating': return t('scaleWeighIn.statusAuthenticatingMsg');
    case 'ready_for_step_on': return t('scaleWeighIn.statusReadyMsg');
    case 'measuring_impedance': return t('scaleWeighIn.statusMeasuringMsg');
    case 'complete': return t('scaleWeighIn.statusCompleteMsg');
    case 'error': return errorMessage.value || t('scaleWeighIn.statusErrorMsg');
    default: return t('scaleWeighIn.statusInitMsg');
  }
});

useModalAccessibility({
  isOpen: computed(() => store.showLiveWeighInModal),
  modalRef: modalContainer,
  onClose: () => {
    handleClose();
  }
});

const startWeighIn = async () => {
  const scale = activeScale.value;
  if (!scale) return;

  state.value = 'connecting';
  liveWeight.value = null;
  measurement.value = null;
  errorMessage.value = '';
  recordDate.value = new Date().toISOString().split('T')[0];

  const profileData = {
    gender: store.profile?.gender || 'male',
    age: calculateAge(store.profile?.birthDate) || 30,
    heightCm: store.profile?.height || 175,
    lastWeightKg: store.latestLog?.mass || null
  };

  try {
    await ScaleManager.startMeasurement(
      scale,
      profileData,
      {
        onStateChange: (newState, msg) => {
          state.value = newState;
        },
        onLiveWeight: (w) => {
          liveWeight.value = w;
        },
        onComplete: (meas) => {
          measurement.value = meas;
          state.value = 'complete';
        },
        onError: (err) => {
          state.value = 'error';
          errorMessage.value = err.message || t('scaleWeighIn.errorMeasure');
        }
      }
    );
  } catch (err) {
    state.value = 'error';
    errorMessage.value = err.message || t('scaleWeighIn.errorCommunication');
  }
};

const restartMeasurement = () => {
  startWeighIn();
};

const handleSave = async () => {
  if (!measurement.value) return;
  isSaving.value = true;
  try {
    const rawMeas = JSON.parse(JSON.stringify(measurement.value));
    await store.saveLogEntry({
      date: recordDate.value,
      mass: rawMeas.weightKg,
      bodyFat: rawMeas.fatPercentage,
      measuredAt: rawMeas.timestamp,
      heartRate: rawMeas.heartRateBpm,
      impedances: rawMeas.impedances,
      scaleDeviceId: activeScale.value?.deviceId || null
    });
    showToast(t('scaleWeighIn.saveSuccessToast'), 'success');
    store.showLiveWeighInModal = false;
  } catch (err) {
    showToast(t('scaleWeighIn.saveErrorToast') + (err.message || err), 'error');
  } finally {
    isSaving.value = false;
  }
};

const handleClose = () => {
  store.showLiveWeighInModal = false;
  state.value = 'idle';
  liveWeight.value = null;
  measurement.value = null;
};

const goToSettings = () => {
  store.showLiveWeighInModal = false;
  store.activeView = 'settings';
};

watch(() => store.showLiveWeighInModal, (isOpen) => {
  if (isOpen) {
    if (store.pairedDevices.length > 0) {
      if (!selectedDeviceId.value) {
        selectedDeviceId.value = store.pairedDevices[0].deviceId;
      }
      startWeighIn();
    }
  } else {
    state.value = 'idle';
  }
});
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.2s ease-out forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.98); }
  to { opacity: 1; transform: scale(1); }
}
</style>

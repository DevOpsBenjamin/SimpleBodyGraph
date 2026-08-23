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
              Pesée en Direct (BLE)
              <span class="text-[9px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-semibold border border-violet-500/30">
                Mode 2
              </span>
            </h3>
            <p class="text-xs text-gray-400">
              {{ activeScale?.name || 'Balance Connectée' }}
            </p>
          </div>
        </div>

        <button 
          type="button" 
          @click="handleClose"
          class="p-2 rounded-xl text-gray-500 hover:text-gray-300 hover:bg-gray-800/60 transition-colors cursor-pointer"
          title="Fermer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Device Selector (if multiple scales paired) -->
      <div v-if="store.pairedDevices.length > 1 && !isMeasuring" class="space-y-1.5 relative z-10">
        <label for="scale-select" class="text-xs font-bold text-gray-400 uppercase tracking-wider block">
          Sélectionner la balance
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
          <h4 class="text-sm font-bold text-white">Aucune balance associée</h4>
          <p class="text-xs text-gray-300 mt-1">Vous devez d'abord associer votre balance dans les Paramètres pour lancer une pesée automatique.</p>
        </div>
        <button
          type="button"
          @click="goToSettings"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-all cursor-pointer shadow-lg shadow-violet-500/20"
        >
          <span>Ouvrir les Paramètres</span>
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
              <span class="text-base sm:text-lg font-normal text-gray-400">kg</span>
            </div>
          </div>

          <!-- Highlight Instruction Banner -->
          <div 
            v-if="state === 'ready_for_step_on'" 
            class="p-3 bg-violet-500/10 border border-violet-500/20 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold text-violet-200"
          >
            <Sparkles class="w-4 h-4 text-violet-400 shrink-0" />
            <span>Pieds nus sur les électrodes — mains tenant fermement la poignée</span>
          </div>
        </div>

        <!-- Detailed Metrics Overview (when complete) -->
        <div v-if="state === 'complete' && measurement" class="space-y-3">
          <span class="text-xs font-bold text-gray-400 uppercase tracking-wider block">Résultats de la composition corporelle</span>
          
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <!-- Poids Card -->
            <div class="p-3.5 bg-gray-950/80 border border-gray-800 rounded-xl space-y-1">
              <span class="text-[10px] text-gray-400 font-medium">Masse corporelle</span>
              <div class="text-lg font-extrabold text-white">{{ measurement.weightKg.toFixed(2) }} <span class="text-xs font-normal text-gray-400">kg</span></div>
            </div>

            <!-- Masse Grasse Card -->
            <div class="p-3.5 bg-gray-950/80 border border-gray-800 rounded-xl space-y-1">
              <span class="text-[10px] text-amber-400/80 font-medium">Taux de masse grasse</span>
              <div class="text-lg font-extrabold text-amber-300">
                {{ measurement.fatPercentage !== null ? measurement.fatPercentage.toFixed(1) + '%' : '--' }}
              </div>
            </div>

            <!-- Rythme Cardiaque -->
            <div class="p-3.5 bg-gray-950/80 border border-gray-800 rounded-xl space-y-1">
              <span class="text-[10px] text-rose-400/80 font-medium flex items-center gap-1">
                <Heart class="w-3 h-3 text-rose-400" />
                <span>Rythme Cardiaque</span>
              </span>
              <div class="text-lg font-extrabold text-rose-300">
                {{ measurement.heartRateBpm !== null ? measurement.heartRateBpm + ' BPM' : '--' }}
              </div>
            </div>

            <!-- Masse Grasse en kg -->
            <div v-if="measurement.fatPercentage !== null" class="p-3.5 bg-gray-950/80 border border-gray-800 rounded-xl space-y-1">
              <span class="text-[10px] text-gray-400 font-medium">Masse grasse</span>
              <div class="text-sm font-bold text-gray-200">
                {{ (measurement.weightKg * measurement.fatPercentage / 100).toFixed(2) }} kg
              </div>
            </div>

            <!-- Masse Maigre en kg -->
            <div v-if="measurement.fatPercentage !== null" class="p-3.5 bg-gray-950/80 border border-gray-800 rounded-xl space-y-1">
              <span class="text-[10px] text-gray-400 font-medium">Masse maigre</span>
              <div class="text-sm font-bold text-gray-200">
                {{ (measurement.weightKg * (1 - measurement.fatPercentage / 100)).toFixed(2) }} kg
              </div>
            </div>

            <!-- Impédances BIA -->
            <div class="p-3.5 bg-gray-950/80 border border-gray-800 rounded-xl space-y-1">
              <span class="text-[10px] text-violet-400/80 font-medium">Impédances BIA</span>
              <div class="text-xs font-bold text-violet-300">
                {{ totalImpedanceChannels }} voies captées
              </div>
            </div>
          </div>

          <!-- Date Selector -->
          <div class="p-3.5 bg-gray-950/60 border border-gray-800/80 rounded-xl flex items-center justify-between gap-3">
            <span class="text-xs font-medium text-gray-300">Date d'enregistrement :</span>
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
              <span>{{ isSaving ? 'Enregistrement...' : 'Enregistrer dans mon historique' }}</span>
            </button>
            <button
              type="button"
              @click="restartMeasurement"
              class="py-3 px-3.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold transition-all cursor-pointer"
              title="Recommencer la pesée"
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
              <span>Réessayer</span>
            </button>
            <button
              type="button"
              @click="handleClose"
              class="flex-1 py-2.5 px-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold transition-all cursor-pointer"
            >
              Fermer
            </button>
          </template>

          <template v-else>
            <button
              type="button"
              @click="handleClose"
              class="w-full py-2.5 px-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold transition-all cursor-pointer"
            >
              Annuler
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

const store = useBodyGraphStore();
const { showToast } = useToast();

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
  if (!measurement.value?.impedances) return 0;
  const feet = measurement.value.impedances.feet?.length || 0;
  const hands = measurement.value.impedances.hands?.length || 0;
  return feet + hands;
});

const statusTitle = computed(() => {
  switch (state.value) {
    case 'connecting': return 'Connexion en cours...';
    case 'authenticating': return 'Synchronisation du profil...';
    case 'ready_for_step_on': return 'Prêt pour la pesée';
    case 'measuring_impedance': return 'Analyse BIA en cours...';
    case 'complete': return 'Pesée validée avec succès !';
    case 'error': return 'Échec de la pesée';
    default: return 'Initialisation...';
  }
});

const statusMessage = computed(() => {
  switch (state.value) {
    case 'connecting': return `Recherche et connexion à ${activeScale.value?.name || 'la balance'}...`;
    case 'authenticating': return 'Transmission des données physiologiques (sexe, âge, taille)...';
    case 'ready_for_step_on': return 'Montez sur la balance pieds nus et restez stable.';
    case 'measuring_impedance': return 'Ne bougez pas, calcul des impédances bioélectriques 8 électrodes...';
    case 'complete': return 'Mesure complète et enregistrable dans votre historique.';
    case 'error': return errorMessage.value || 'La balance s\'est déconnectée ou n\'a pas répondu.';
    default: return 'Préparation de la session Bluetooth...';
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
          errorMessage.value = err.message || 'Erreur lors de la prise de mesure.';
        }
      }
    );
  } catch (err) {
    state.value = 'error';
    errorMessage.value = err.message || 'Erreur de communication avec la balance.';
  }
};

const restartMeasurement = () => {
  startWeighIn();
};

const handleSave = async () => {
  if (!measurement.value) return;
  isSaving.value = true;
  try {
    await store.saveLogEntry({
      date: recordDate.value,
      mass: measurement.value.weightKg,
      bodyFat: measurement.value.fatPercentage,
      measuredAt: measurement.value.timestamp,
      heartRate: measurement.value.heartRateBpm,
      impedances: measurement.value.impedances,
      scaleDeviceId: activeScale.value?.deviceId || null
    });
    showToast('Pesée enregistrée avec succès dans vos logs !', 'success');
    store.showLiveWeighInModal = false;
  } catch (err) {
    showToast('Échec de l\'enregistrement : ' + (err.message || err), 'error');
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

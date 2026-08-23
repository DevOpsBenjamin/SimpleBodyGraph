<template>
  <div 
    v-if="isOpen" 
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
    @click.self="handleCancel"
    role="dialog"
    aria-modal="true"
    aria-labelledby="pairing-modal-title"
  >
    <div 
      ref="modalContainer"
      class="w-full max-w-md bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-2xl shadow-violet-950/40 space-y-6 relative overflow-hidden focus:outline-none"
      tabindex="-1"
    >
      <!-- Background Ambient Glow -->
      <div class="absolute -top-24 -right-24 w-48 h-48 bg-violet-600/15 rounded-full blur-3xl pointer-events-none"></div>

      <!-- Header -->
      <div class="flex items-center justify-between relative z-10">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
            <Bluetooth class="w-5 h-5" />
          </div>
          <div>
            <h3 id="pairing-modal-title" class="text-base font-extrabold text-white tracking-tight">
              Assistant d'Appairage
            </h3>
            <p class="text-xs text-gray-400">{{ device?.name || 'Balance Connectée' }}</p>
          </div>
        </div>

        <button 
          type="button" 
          @click="handleCancel"
          class="p-2 rounded-xl text-gray-500 hover:text-gray-300 hover:bg-gray-800/60 transition-colors cursor-pointer"
          title="Fermer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- MAC Input Step Fallback (if requested by driver) -->
      <div v-if="needsMacInput" class="space-y-4 relative z-10">
        <div class="p-4 bg-violet-950/20 border border-violet-500/30 rounded-2xl space-y-2">
          <div class="flex items-center gap-2 text-xs font-bold text-violet-300">
            <HelpCircle class="w-4 h-4" />
            <span>Adresse MAC physique requise</span>
          </div>
          <p class="text-xs text-gray-300 leading-relaxed">
            Pour dériver la clé cryptographique unique de votre balance, veuillez confirmer ou saisir l'adresse MAC inscrite sur l'étiquette au dos de l'appareil.
          </p>
        </div>

        <div class="space-y-1.5">
          <label for="mac-address-input" class="text-xs font-bold text-gray-400 uppercase tracking-wider block">
            Adresse MAC (Format XX:XX:XX:XX:XX:XX)
          </label>
          <input
            id="mac-address-input"
            type="text"
            v-model="inputMac"
            placeholder="ex: 50:FB:19:F8:0C:21"
            class="w-full px-3.5 py-2.5 rounded-xl bg-gray-950 border border-gray-800 focus:border-violet-500 text-xs text-white font-mono uppercase"
          />
          <p v-if="macError" class="text-[11px] text-rose-400 font-medium">{{ macError }}</p>
        </div>

        <div class="flex gap-2 pt-2">
          <button
            type="button"
            @click="handleCancel"
            class="flex-1 py-2.5 px-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold transition-all cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="button"
            @click="submitMac"
            :disabled="!inputMac"
            class="flex-1 py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
          >
            Continuer
          </button>
        </div>
      </div>

      <!-- Main Step Progress Display -->
      <div v-else class="space-y-5 relative z-10">
        <!-- Current Step Card -->
        <div 
          :class="[
            'p-5 rounded-2xl border transition-all duration-300 space-y-3.5',
            isComplete
              ? 'bg-emerald-950/20 border-emerald-500/40 shadow-lg shadow-emerald-500/5'
              : isError
                ? 'bg-rose-950/20 border-rose-500/40'
                : currentStep?.status === 'waiting_user_action'
                  ? 'bg-amber-950/20 border-amber-500/40 shadow-lg shadow-amber-500/5'
                  : 'bg-gray-950/60 border-gray-800'
          ]"
        >
          <div class="flex items-start gap-3.5">
            <!-- Dynamic Status Icon -->
            <div 
              :class="[
                'w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border transition-all',
                isComplete
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : isError
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                    : currentStep?.status === 'waiting_user_action'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-bounce'
                      : 'bg-violet-600/20 text-violet-400 border-violet-500/30'
              ]"
            >
              <CheckCircle v-if="isComplete" class="w-6 h-6 text-emerald-400" />
              <AlertTriangle v-else-if="isError" class="w-6 h-6 text-rose-400" />
              <Scale v-else-if="currentStep?.icon === 'scale' || currentStep?.status === 'waiting_user_action'" class="w-6 h-6 text-amber-300" />
              <RefreshCw v-else class="w-6 h-6 animate-spin text-violet-400" />
            </div>

            <!-- Step Details -->
            <div class="space-y-1 flex-1 min-w-0">
              <div class="flex items-center justify-between">
                <h4 class="text-sm font-bold text-white tracking-tight truncate">
                  {{ isComplete ? 'Appairage Terminé !' : isError ? 'Erreur d\'appairage' : currentStep?.title || 'Initialisation...' }}
                </h4>
                <span 
                  :class="[
                    'text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider',
                    isComplete 
                      ? 'bg-emerald-500/20 text-emerald-400' 
                      : isError 
                        ? 'bg-rose-500/20 text-rose-400' 
                        : currentStep?.status === 'waiting_user_action'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-violet-500/20 text-violet-400'
                  ]"
                >
                  {{ isComplete ? 'Succès' : isError ? 'Échec' : currentStep?.status === 'waiting_user_action' ? 'Action Requise' : 'En cours' }}
                </span>
              </div>
              <p class="text-xs text-gray-300 leading-relaxed">
                {{ isComplete ? 'Votre balance est désormais configurée et étalonnée. Vous pouvez réaliser vos pesées quotidiennes.' : isError ? errorMessage : currentStep?.message }}
              </p>
            </div>
          </div>

          <!-- Highlight Action Banner (e.g. Montez sur la balance) -->
          <div 
            v-if="currentStep?.actionPrompt && !isComplete && !isError"
            class="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2 text-xs font-semibold text-amber-200"
          >
            <Sparkles class="w-4 h-4 text-amber-400 shrink-0" />
            <span>{{ currentStep.actionPrompt }}</span>
          </div>
        </div>

        <!-- History of completed steps -->
        <div v-if="completedSteps.length > 0" class="space-y-2 pt-2 border-t border-gray-800/80">
          <span class="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Étapes validées</span>
          <div class="space-y-1.5">
            <div 
              v-for="step in completedSteps" 
              :key="step.stepId"
              class="flex items-center gap-2 text-xs text-gray-400"
            >
              <CheckCircle class="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span class="text-gray-300">{{ step.title }}</span>
            </div>
          </div>
        </div>

        <!-- Action Footer -->
        <div class="flex gap-2 pt-2">
          <button
            v-if="!isComplete && !isError"
            type="button"
            @click="handleCancel"
            class="w-full py-2.5 px-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold transition-all cursor-pointer"
          >
            Annuler l'appairage
          </button>

          <button
            v-if="isError"
            type="button"
            @click="handleRetry"
            class="flex-1 py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-all cursor-pointer shadow-lg shadow-violet-500/20 flex items-center justify-center gap-1.5"
          >
            <RefreshCw class="w-3.5 h-3.5" />
            <span>Réessayer</span>
          </button>
          <button
            v-if="isError"
            type="button"
            @click="handleCancel"
            class="flex-1 py-2.5 px-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold transition-all cursor-pointer"
          >
            Fermer
          </button>

          <button
            v-if="isComplete"
            type="button"
            @click="handleDone"
            class="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
          >
            Terminer et Enregistrer
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { Bluetooth, Scale, CheckCircle, AlertTriangle, RefreshCw, X, HelpCircle, Sparkles } from 'lucide-vue-next';
import { useModalAccessibility } from '../composables/useModalAccessibility';
import { isValidMac } from '../services/ble/drivers/huaweiScale3Crypto';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  device: { type: Object, default: null }
});

const emit = defineEmits(['close', 'paired']);

const modalContainer = ref(null);
const currentStep = ref(null);
const completedSteps = ref([]);
const isComplete = ref(false);
const isError = ref(false);
const errorMessage = ref('');

// MAC input fallback state
const needsMacInput = ref(false);
const inputMac = ref('');
const macError = ref('');
let macResolver = null;

useModalAccessibility({
  isOpen: computed(() => props.isOpen),
  modalRef: modalContainer,
  onClose: () => {
    handleCancel();
  }
});

const startPairingSession = () => {
  currentStep.value = {
    stepId: 'init',
    title: 'Initialisation...',
    message: 'Préparation de la session BLE et vérification des paramètres...',
    status: 'in_progress'
  };
  completedSteps.value = [];
  isComplete.value = false;
  isError.value = false;
  errorMessage.value = '';
  needsMacInput.value = false;
  inputMac.value = '';
  macError.value = '';
};

const updateStep = (stepInfo) => {
  if (currentStep.value && currentStep.value.stepId !== stepInfo.stepId) {
    if (!completedSteps.value.some(s => s.stepId === currentStep.value.stepId)) {
      completedSteps.value.push(currentStep.value);
    }
  }
  currentStep.value = stepInfo;
};

const requestMacInput = (defaultMac) => {
  needsMacInput.value = true;
  inputMac.value = defaultMac || '';
  return new Promise((resolve) => {
    macResolver = resolve;
  });
};

const setSuccess = (pairedData) => {
  if (currentStep.value && !completedSteps.value.some(s => s.stepId === currentStep.value.stepId)) {
    completedSteps.value.push(currentStep.value);
  }
  isComplete.value = true;
  isError.value = false;
};

const setError = (error) => {
  isError.value = true;
  errorMessage.value = error.message || 'Une erreur inattendue est survenue lors de l\'appairage.';
};

const submitMac = () => {
  const cleanMac = inputMac.value.trim().toUpperCase().replace(/-/g, ':');
  if (!isValidMac(cleanMac)) {
    macError.value = 'Format MAC invalide (attendu : XX:XX:XX:XX:XX:XX)';
    return;
  }
  macError.value = '';
  needsMacInput.value = false;
  if (macResolver) {
    macResolver(cleanMac);
    macResolver = null;
  }
};

const handleCancel = () => {
  if (macResolver) {
    macResolver(null);
    macResolver = null;
  }
  emit('close');
};

const handleRetry = () => {
  emit('retry', props.device);
};

const handleDone = () => {
  emit('paired', props.device);
  emit('close');
};

defineExpose({
  startPairingSession,
  updateStep,
  requestMacInput,
  setSuccess,
  setError
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

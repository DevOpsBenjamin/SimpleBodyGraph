<template>
  <div 
    v-if="store.showSettingsModal" 
    class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all duration-300"
  >
    <!-- Backdrop -->
    <div 
      @click="closeModal" 
      class="absolute inset-0 bg-black/60 backdrop-blur-sm"
    ></div>

    <!-- Modal Card -->
    <div 
      class="w-full sm:max-w-md bg-gray-900 border-t sm:border border-gray-800 rounded-t-3xl sm:rounded-3xl p-6 relative z-10 shadow-2xl shadow-black max-h-[90vh] overflow-y-auto transform translate-y-0 transition-all duration-300 animate-fade-in"
    >
      <!-- Modal Header -->
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-bold text-white flex items-center gap-2 font-sans">
          <Settings class="w-5 h-5 text-violet-400" />
          Settings & Goals
        </h2>
        <button 
          @click="closeModal"
          class="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-750 text-gray-400 hover:text-white transition-all duration-200 cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Goals Form -->
      <form @submit.prevent="handleSave" class="space-y-5">
        <!-- Target Mass (Weight) -->
        <div class="space-y-1.5">
          <label for="settings-mass" class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 font-sans">
            <Scale class="w-3.5 h-3.5 text-violet-400" /> Target Weight (kg)
          </label>
          <div class="relative">
            <input 
              id="settings-mass"
              type="number" 
              step="0.01" 
              min="0"
              max="999"
              v-model="targetMass"
              placeholder="ex: 70.0"
              class="w-full px-4 py-2.5 rounded-xl glass-input text-xs text-white"
            />
            <span class="absolute inset-y-0 right-4 flex items-center text-xs text-gray-500 font-medium select-none pointer-events-none font-sans">
              kg
            </span>
          </div>
          <p class="text-[10px] text-gray-500 font-sans">Leave blank to disable the weight goal line.</p>
        </div>

        <!-- Target Body Fat -->
        <div class="space-y-1.5">
          <label for="settings-fat" class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 font-sans">
            <Percent class="w-3.5 h-3.5 text-emerald-400" /> Target Body Fat (%)
          </label>
          <div class="relative">
            <input 
              id="settings-fat"
              type="number" 
              step="0.1" 
              min="0"
              max="100"
              v-model="targetFat"
              placeholder="ex: 12.0"
              class="w-full px-4 py-2.5 rounded-xl glass-input text-xs text-white"
            />
            <span class="absolute inset-y-0 right-4 flex items-center text-xs text-gray-500 font-medium select-none pointer-events-none font-sans">
              %
            </span>
          </div>
          <p class="text-[10px] text-gray-500 font-sans">Leave blank to disable the body fat goal line.</p>
        </div>

        <!-- Feedback Messages -->
        <div v-if="errorMsg" class="text-xs text-rose-400 font-medium bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl font-sans">
          {{ errorMsg }}
        </div>
        <div v-if="successMsg" class="text-xs text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl font-sans">
          {{ successMsg }}
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-3 pt-2">
          <button 
            type="button"
            @click="clearGoals"
            class="flex-1 py-2.5 px-4 rounded-xl bg-gray-800 hover:bg-gray-750 text-gray-400 hover:text-white transition-all duration-200 text-xs font-semibold cursor-pointer border border-gray-700/30 font-sans"
          >
            Clear Goals
          </button>
          
          <button 
            type="submit"
            :disabled="loading"
            class="flex-1 py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-[0.98] text-white font-semibold text-xs transition-all duration-200 cursor-pointer shadow-lg shadow-violet-500/10 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed font-sans"
          >
            {{ loading ? 'Saving...' : 'Save Goals' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { Settings, X, Scale, Percent } from 'lucide-vue-next';
import { useBodyGraphStore } from '../stores/bodyGraph';

const store = useBodyGraphStore();

const targetMass = ref(store.targetMass !== null ? store.targetMass : '');
const targetFat = ref(store.targetFat !== null ? store.targetFat : '');
const loading = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

// Watch store state changes to sync values in inputs
watch(() => store.showSettingsModal, (isOpen) => {
  if (isOpen) {
    targetMass.value = store.targetMass !== null ? store.targetMass : '';
    targetFat.value = store.targetFat !== null ? store.targetFat : '';
    errorMsg.value = '';
    successMsg.value = '';
  }
});

const closeModal = () => {
  store.showSettingsModal = false;
};

const handleSave = async () => {
  loading.value = true;
  errorMsg.value = '';
  successMsg.value = '';

  const massVal = targetMass.value === '' ? null : Number(targetMass.value);
  const fatVal = targetFat.value === '' ? null : Number(targetFat.value);

  // Simple checks
  if (massVal !== null && (isNaN(massVal) || massVal <= 0)) {
    errorMsg.value = 'Weight must be a positive number';
    loading.value = false;
    return;
  }
  if (fatVal !== null && (isNaN(fatVal) || fatVal < 0 || fatVal > 100)) {
    errorMsg.value = 'Body fat must be a percentage between 0 and 100';
    loading.value = false;
    return;
  }

  try {
    await store.updateGoals(massVal, fatVal);
    successMsg.value = 'Goals updated successfully!';
    setTimeout(() => {
      closeModal();
    }, 800);
  } catch (error) {
    errorMsg.value = 'Failed to save goals: ' + error.message;
  } finally {
    loading.value = false;
  }
};

const clearGoals = async () => {
  targetMass.value = '';
  targetFat.value = '';
  await handleSave();
};
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.2s ease-out forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>

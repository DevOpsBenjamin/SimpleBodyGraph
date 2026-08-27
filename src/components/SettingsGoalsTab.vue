<template>
  <div class="glass-card p-5 sm:p-6 rounded-2xl space-y-5 border border-gray-800/80">
    <div>
      <h3 class="text-sm font-bold text-violet-400 uppercase tracking-wider">{{ $t('settings.goalsSection.title') }}</h3>
      <p class="text-xs text-gray-400 mt-1">{{ $t('settings.goalsSection.desc') }}</p>
    </div>

    <!-- Feedback banner if any local error -->
    <div v-if="errorMsg" class="text-xs text-rose-400 font-medium bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl flex items-center gap-2">
      <AlertTriangle class="w-4 h-4 shrink-0 text-rose-400" />
      <span>{{ errorMsg }}</span>
    </div>

    <form @submit.prevent="handleSaveGoals" class="space-y-4">
      <div v-if="paliers.length === 0" class="text-center py-8 text-xs text-gray-500 border border-dashed border-gray-800 rounded-2xl space-y-2">
        <Target class="w-8 h-8 text-gray-600 mx-auto mb-1" />
        <p class="text-gray-400 font-medium">{{ $t('settings.goalsSection.emptyTitle') }}</p>
        <p class="text-[11px] text-gray-600">{{ $t('settings.goalsSection.emptyDesc') }}</p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="(palier, index) in paliers"
          :key="palier.id || index"
          :class="[
            'p-4 rounded-2xl border transition-all duration-200 space-y-3',
            palier.validated
              ? 'bg-emerald-950/20 border-emerald-800/30'
              : 'bg-gray-950/60 border-gray-800'
          ]"
        >
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-gray-300 flex items-center gap-2">
              <span class="w-5 h-5 rounded-full bg-violet-600/20 text-violet-400 border border-violet-500/30 flex items-center justify-center text-[10px]">
                {{ index + 1 }}
              </span>
              {{ $t('settings.goalsSection.stageLabel', { index: index + 1 }) }}
            </span>

            <div class="flex items-center gap-2">
              <button
                type="button"
                @click="toggleValidation(index)"
                :class="[
                  'px-2.5 py-1 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 cursor-pointer border',
                  palier.validated
                    ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30'
                    : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-gray-200'
                ]"
              >
                <CheckCircle class="w-3.5 h-3.5" :class="{ 'text-emerald-400': palier.validated }" />
                <span>{{ palier.validated ? $t('settings.goalsSection.validated') : $t('settings.goalsSection.notValidated') }}</span>
              </button>

              <button
                type="button"
                @click="removePalier(index)"
                class="p-1.5 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
                :title="$t('settings.goalsSection.deleteStageTitle')"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">{{ $t('settings.goalsSection.targetWeightLabel') }}</label>
              <div class="relative">
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  :placeholder="$t('settings.goalsSection.targetWeightPlaceholder')"
                  v-model="palier.mass"
                  class="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-gray-900 border border-gray-800 focus:border-violet-500/50 text-xs text-white"
                />
                <span class="absolute inset-y-0 right-3.5 flex items-center text-xs text-gray-500 font-semibold pointer-events-none">kg</span>
              </div>
            </div>

            <div class="space-y-1">
              <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">{{ $t('settings.goalsSection.targetFatLabel') }} <span class="text-gray-600 font-normal">{{ $t('settings.goalsSection.optional') }}</span></label>
              <div class="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  :placeholder="$t('settings.goalsSection.targetFatPlaceholder')"
                  v-model="palier.fat"
                  class="w-full pl-3.5 pr-8 py-2.5 rounded-xl bg-gray-900 border border-gray-800 focus:border-violet-500/50 text-xs text-white"
                />
                <span class="absolute inset-y-0 right-3 flex items-center text-xs text-gray-500 font-semibold pointer-events-none">%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          type="button"
          @click="addPalier"
          class="flex-1 py-3 px-4 rounded-xl bg-gray-900 hover:bg-gray-800 active:scale-[0.98] text-gray-200 border border-gray-800 text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5"
        >
          <Plus class="w-4 h-4 text-violet-400" />
          <span>{{ $t('settings.goalsSection.addStageBtn') }}</span>
        </button>

        <button
          type="submit"
          :disabled="goalsLoading"
          class="flex-1 py-3 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-[0.98] text-white font-semibold text-xs transition-all duration-200 cursor-pointer shadow-lg shadow-violet-500/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          {{ goalsLoading ? $t('settings.goalsSection.savingBtn') : $t('settings.goalsSection.saveStagesBtn') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { Target, CheckCircle, Trash2, Plus, AlertTriangle } from 'lucide-vue-next';
import { useBodyGraphStore } from '../stores/bodyGraph';
import { useI18n } from '../i18n';
import { useToast } from '../composables/useToast';

const store = useBodyGraphStore();
const { t } = useI18n();
const toast = useToast();

const paliers = ref([]);
const goalsLoading = ref(false);
const errorMsg = ref('');

const loadPaliers = () => {
  paliers.value = store.paliers.map(p => ({
    id: p.id || crypto.randomUUID(),
    mass: p.mass !== null && p.mass !== undefined ? p.mass : '',
    fat: p.fat !== null && p.fat !== undefined ? p.fat : '',
    validated: !!p.validated
  }));
};

onMounted(() => {
  loadPaliers();
});

watch(() => store.paliers, () => {
  loadPaliers();
}, { deep: true });

const addPalier = () => {
  paliers.value.push({
    id: crypto.randomUUID(),
    mass: '',
    fat: '',
    validated: false
  });
};

const removePalier = (index) => {
  paliers.value.splice(index, 1);
};

const toggleValidation = (index) => {
  paliers.value[index].validated = !paliers.value[index].validated;
};

const handleSaveGoals = async () => {
  goalsLoading.value = true;
  errorMsg.value = '';

  const formattedPaliers = [];
  for (let i = 0; i < paliers.value.length; i++) {
    const p = paliers.value[i];
    const massVal = p.mass === '' ? null : Number(p.mass);
    const fatVal = p.fat === '' ? null : Number(p.fat);

    if (massVal !== null && (isNaN(massVal) || massVal <= 0)) {
      errorMsg.value = t('settings.goalsSection.weightPositiveError', { index: i + 1 });
      goalsLoading.value = false;
      return;
    }
    if (fatVal !== null && (isNaN(fatVal) || fatVal < 0 || fatVal > 100)) {
      errorMsg.value = t('settings.goalsSection.fatRangeError', { index: i + 1 });
      goalsLoading.value = false;
      return;
    }

    formattedPaliers.push({
      id: p.id,
      mass: massVal,
      fat: fatVal,
      validated: p.validated
    });
  }

  try {
    await store.updatePaliers(formattedPaliers);
    toast.showToast(t('settings.goalsSection.saveSuccess'), 'success');
  } catch (error) {
    errorMsg.value = t('settings.goalsSection.saveFailed') + error.message;
  } finally {
    goalsLoading.value = false;
  }
};
</script>

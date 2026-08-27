<template>
  <div class="space-y-6">
    <!-- Section 1 : Cartes de Synthèse (Haut de page) -->
    <div class="glass-card p-5 sm:p-6 rounded-3xl space-y-4">
      <div class="flex items-center justify-between pb-3 border-b border-gray-800/80">
        <div>
          <h3 class="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <LayoutGrid class="w-4 h-4 text-violet-400" />
            {{ $t('settingsDisplay.cardsSectionTitle') }}
          </h3>
          <p class="text-xs text-gray-400 mt-0.5">
            {{ $t('settingsDisplay.cardsSectionDesc') }}
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <!-- 1. Poids Total -->
        <label class="flex items-center justify-between p-3.5 rounded-2xl bg-gray-950/60 border border-gray-800/80 hover:border-violet-500/30 transition-all cursor-pointer select-none">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-xl bg-violet-600/20 text-violet-400 flex items-center justify-center">
              <Scale class="w-4 h-4" />
            </div>
            <div>
              <span class="text-xs font-bold text-white block">{{ $t('settingsDisplay.cardMassTitle') }}</span>
              <span class="text-[10px] text-gray-400">{{ $t('settingsDisplay.cardMassDesc') }}</span>
            </div>
          </div>
          <input 
            type="checkbox" 
            v-model="localPrefs.cards.mass" 
            @change="savePreferences"
            class="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 focus:ring-offset-gray-900 cursor-pointer accent-violet-600"
          />
        </label>

        <!-- 2. Masse Grasse (kg) -->
        <label class="flex items-center justify-between p-3.5 rounded-2xl bg-gray-950/60 border border-gray-800/80 hover:border-amber-500/30 transition-all cursor-pointer select-none">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center">
              <Flame class="w-4 h-4" />
            </div>
            <div>
              <span class="text-xs font-bold text-white block">{{ $t('settingsDisplay.cardFatMassTitle') }}</span>
              <span class="text-[10px] text-gray-400">{{ $t('settingsDisplay.cardFatMassDesc') }}</span>
            </div>
          </div>
          <input 
            type="checkbox" 
            v-model="localPrefs.cards.fatMass" 
            @change="savePreferences"
            class="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 focus:ring-offset-gray-900 cursor-pointer accent-amber-500"
          />
        </label>

        <!-- 3. % de Masse Grasse -->
        <label class="flex items-center justify-between p-3.5 rounded-2xl bg-gray-950/60 border border-gray-800/80 hover:border-blue-500/30 transition-all cursor-pointer select-none">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <Percent class="w-4 h-4" />
            </div>
            <div>
              <span class="text-xs font-bold text-white block">{{ $t('settingsDisplay.cardBodyFatTitle') }}</span>
              <span class="text-[10px] text-gray-400">{{ $t('settingsDisplay.cardBodyFatDesc') }}</span>
            </div>
          </div>
          <input 
            type="checkbox" 
            v-model="localPrefs.cards.bodyFat" 
            @change="savePreferences"
            class="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 focus:ring-offset-gray-900 cursor-pointer accent-blue-500"
          />
        </label>

        <!-- 4. Masse Maigre (kg) -->
        <label class="flex items-center justify-between p-3.5 rounded-2xl bg-gray-950/60 border border-gray-800/80 hover:border-emerald-500/30 transition-all cursor-pointer select-none">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
              <Dumbbell class="w-4 h-4" />
            </div>
            <div>
              <span class="text-xs font-bold text-white block">{{ $t('settingsDisplay.cardLeanMassTitle') }}</span>
              <span class="text-[10px] text-gray-400">{{ $t('settingsDisplay.cardLeanMassDesc') }}</span>
            </div>
          </div>
          <input 
            type="checkbox" 
            v-model="localPrefs.cards.leanMass" 
            @change="savePreferences"
            class="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 focus:ring-offset-gray-900 cursor-pointer accent-emerald-500"
          />
        </label>
      </div>
    </div>

    <!-- Section 2 : Graphiques de Tendance -->
    <div class="glass-card p-5 sm:p-6 rounded-3xl space-y-4">
      <div class="flex items-center justify-between pb-3 border-b border-gray-800/80">
        <div>
          <h3 class="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <LineChart class="w-4 h-4 text-violet-400" />
            {{ $t('settingsDisplay.chartsSectionTitle') }}
          </h3>
          <p class="text-xs text-gray-400 mt-0.5">
            {{ $t('settingsDisplay.chartsSectionDesc') }}
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        <!-- Courbe Poids -->
        <label class="flex items-center justify-between p-3 rounded-2xl bg-gray-950/60 border border-gray-800/80 cursor-pointer select-none">
          <span class="text-xs font-semibold text-gray-200 flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-violet-400"></span>
            {{ $t('settingsDisplay.cardMassTitle') }}
          </span>
          <input 
            type="checkbox" 
            v-model="localPrefs.charts.showMass" 
            @change="savePreferences"
            class="w-4 h-4 rounded text-violet-600 accent-violet-600"
          />
        </label>

        <!-- Courbe Masse Grasse (kg) -->
        <label class="flex items-center justify-between p-3 rounded-2xl bg-gray-950/60 border border-gray-800/80 cursor-pointer select-none">
          <span class="text-xs font-semibold text-gray-200 flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            {{ $t('history.fatMass') }}
          </span>
          <input 
            type="checkbox" 
            v-model="localPrefs.charts.showFatMass" 
            @change="savePreferences"
            class="w-4 h-4 rounded text-amber-500 accent-amber-500"
          />
        </label>

        <!-- Courbe Masse Maigre (kg) -->
        <label class="flex items-center justify-between p-3 rounded-2xl bg-gray-950/60 border border-gray-800/80 cursor-pointer select-none">
          <span class="text-xs font-semibold text-gray-200 flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            {{ $t('history.leanMass') }}
          </span>
          <input 
            type="checkbox" 
            v-model="localPrefs.charts.showLeanMass" 
            @change="savePreferences"
            class="w-4 h-4 rounded text-emerald-500 accent-emerald-500"
          />
        </label>
      </div>

      <!-- Graphiques secondaires optionnels -->
      <div class="pt-3 border-t border-gray-800/60 space-y-3">
        <label class="flex items-center justify-between p-3.5 rounded-2xl bg-gray-950/60 border border-gray-800/80 hover:border-violet-500/30 transition-all cursor-pointer select-none">
          <div>
            <span class="text-xs font-bold text-white block">{{ $t('settingsDisplay.secondaryFatChartTitle') }}</span>
            <span class="text-[10px] text-gray-400">{{ $t('settingsDisplay.secondaryFatChartDesc') }}</span>
          </div>
          <input 
            type="checkbox" 
            v-model="localPrefs.charts.showFatPercentChart" 
            @change="savePreferences"
            class="w-4 h-4 rounded text-violet-600 accent-violet-600"
          />
        </label>

        <!-- BIA Muscle Segmental -->
        <label class="flex items-center justify-between p-3.5 rounded-2xl bg-gray-950/60 border border-gray-800/80 hover:border-emerald-500/30 transition-all cursor-pointer select-none">
          <div>
            <span class="text-xs font-bold text-white block">{{ $t('settingsDisplay.biaMuscleChartTitle') }}</span>
            <span class="text-[10px] text-gray-400">{{ $t('settingsDisplay.biaMuscleChartDesc') }}</span>
          </div>
          <input 
            type="checkbox" 
            v-model="localPrefs.charts.showBiaMuscleChart" 
            @change="savePreferences"
            class="w-4 h-4 rounded text-emerald-600 accent-emerald-500"
          />
        </label>

        <!-- BIA Fat Segmental -->
        <label class="flex items-center justify-between p-3.5 rounded-2xl bg-gray-950/60 border border-gray-800/80 hover:border-amber-500/30 transition-all cursor-pointer select-none">
          <div>
            <span class="text-xs font-bold text-white block">{{ $t('settingsDisplay.biaFatChartTitle') }}</span>
            <span class="text-[10px] text-gray-400">{{ $t('settingsDisplay.biaFatChartDesc') }}</span>
          </div>
          <input 
            type="checkbox" 
            v-model="localPrefs.charts.showBiaFatChart" 
            @change="savePreferences"
            class="w-4 h-4 rounded text-amber-600 accent-amber-500"
          />
        </label>
      </div>
    </div>

    <!-- Section 3 : Couleurs & Segments BIA Muscle -->
    <div class="glass-card p-5 sm:p-6 rounded-3xl space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-800/80">
        <div>
          <h3 class="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <Palette class="w-4 h-4 text-emerald-400" />
            {{ $t('settingsDisplay.biaCustomizationTitle') }}
          </h3>
          <p class="text-xs text-gray-400 mt-0.5">
            {{ $t('settingsDisplay.biaCustomizationDesc') }}
          </p>
        </div>

        <button
          type="button"
          @click="resetMuscleColors"
          class="text-[11px] font-semibold text-gray-400 hover:text-white px-3 py-1.5 rounded-xl bg-gray-800/50 hover:bg-gray-800 border border-gray-700/60 transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <RotateCcw class="w-3.5 h-3.5" />
          {{ $t('settingsDisplay.resetColors') }}
        </button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <!-- Segment Item Loops -->
        <div 
          v-for="seg in muscleSegments" 
          :key="seg.key"
          class="flex items-center justify-between p-3.5 rounded-2xl bg-gray-950/60 border border-gray-800/80 hover:border-gray-700/80 transition-colors"
        >
          <!-- Left: Checkbox + Label -->
          <label class="flex items-center gap-3 cursor-pointer select-none">
            <input 
              type="checkbox" 
              v-model="localPrefs.segmentalVisibility.muscle[seg.key]" 
              @change="savePreferences"
              class="w-4 h-4 rounded text-violet-600 accent-violet-600"
            />
            <div>
              <span class="text-xs font-bold text-white block">{{ seg.label }}</span>
              <span class="text-[10px] text-gray-400">{{ seg.desc }}</span>
            </div>
          </label>

          <!-- Right: Color Picker with Swatch Preview -->
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-mono text-gray-400 uppercase">
              {{ localPrefs.segmentalColors.muscle[seg.key] }}
            </span>
            <div class="relative w-7 h-7 rounded-xl border border-white/20 shadow-inner overflow-hidden cursor-pointer">
              <input 
                type="color" 
                v-model="localPrefs.segmentalColors.muscle[seg.key]" 
                @change="savePreferences"
                class="absolute -inset-2 w-12 h-12 cursor-pointer opacity-0"
              />
              <div 
                class="w-full h-full rounded-xl"
                :style="{ backgroundColor: localPrefs.segmentalColors.muscle[seg.key] }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed, watch } from 'vue';
import { LayoutGrid, Scale, Flame, Percent, Dumbbell, LineChart, Palette, RotateCcw } from 'lucide-vue-next';
import { useBodyGraphStore, DEFAULT_DISPLAY_PREFERENCES } from '../stores/bodyGraph';
import { useToast } from '../composables/useToast';
import { useI18n } from '../i18n';

const store = useBodyGraphStore();
const toast = useToast();
const { t } = useI18n();

const muscleSegments = computed(() => [
  { key: 'total', label: t('settingsDisplay.segmentLabels.total'), desc: t('settingsDisplay.segmentDescs.total') },
  { key: 'trunk', label: t('settingsDisplay.segmentLabels.trunk'), desc: t('settingsDisplay.segmentDescs.trunk') },
  { key: 'rightArm', label: t('settingsDisplay.segmentLabels.rightArm'), desc: t('settingsDisplay.segmentDescs.rightArm') },
  { key: 'leftArm', label: t('settingsDisplay.segmentLabels.leftArm'), desc: t('settingsDisplay.segmentDescs.leftArm') },
  { key: 'rightLeg', label: t('settingsDisplay.segmentLabels.rightLeg'), desc: t('settingsDisplay.segmentDescs.rightLeg') },
  { key: 'leftLeg', label: t('settingsDisplay.segmentLabels.leftLeg'), desc: t('settingsDisplay.segmentDescs.leftLeg') }
]);

const localPrefs = reactive({
  cards: { ...store.displayPreferences.cards },
  charts: { ...store.displayPreferences.charts },
  segmentalColors: {
    muscle: { ...store.displayPreferences.segmentalColors.muscle },
    fat: { ...store.displayPreferences.segmentalColors.fat }
  },
  segmentalVisibility: {
    muscle: { ...store.displayPreferences.segmentalVisibility.muscle },
    fat: { ...store.displayPreferences.segmentalVisibility.fat }
  }
});

watch(() => store.displayPreferences, (newPrefs) => {
  localPrefs.cards = { ...newPrefs.cards };
  localPrefs.charts = { ...newPrefs.charts };
  localPrefs.segmentalColors = {
    muscle: { ...newPrefs.segmentalColors.muscle },
    fat: { ...newPrefs.segmentalColors.fat }
  };
  localPrefs.segmentalVisibility = {
    muscle: { ...newPrefs.segmentalVisibility.muscle },
    fat: { ...newPrefs.segmentalVisibility.fat }
  };
}, { deep: true });

const resetMuscleColors = async () => {
  localPrefs.segmentalColors.muscle = { ...DEFAULT_DISPLAY_PREFERENCES.segmentalColors.muscle };
  await savePreferences();
  toast.showToast(t('settingsDisplay.resetColorsSuccess'), 'info');
};

const savePreferences = async () => {
  try {
    await store.updateDisplayPreferences(localPrefs);
    toast.showToast(t('settingsDisplay.saveSuccess'), 'success');
  } catch (err) {
    toast.showToast(t('settingsDisplay.saveError'), 'error');
  }
};
</script>

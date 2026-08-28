<template>
  <div 
    v-if="computedPeriodBia"
    class="glass-card-violet p-4 sm:p-5 rounded-3xl space-y-3 border border-violet-500/30"
  >
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-xl bg-violet-600/30 text-violet-300 flex items-center justify-center">
          <Zap class="w-4 h-4" />
        </div>
        <div>
          <h4 class="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
            {{ $t('bia.summaryTitle', { period: periodLabel }) }}
            <span class="text-[10px] px-2 py-0.5 rounded-md bg-violet-500/20 text-violet-300 font-normal">
              {{ biaLogsCount > 1 ? $t('bia.measurementsCountPlural', { count: biaLogsCount }) : $t('bia.measurementsCount', { count: biaLogsCount }) }}
            </span>
          </h4>
          <p class="text-[11px] text-gray-400">{{ $t('bia.dexaMetricsSmoothed') }}</p>
        </div>
      </div>

      <button
        type="button"
        @click="isModalOpen = true"
        class="py-1.5 px-3 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-95 text-white font-bold text-xs cursor-pointer transition-all duration-150 shadow-md shadow-violet-600/20 flex items-center gap-1.5 shrink-0"
      >
        <span>{{ $t('bia.fullReport') }}</span>
        <ChevronRight class="w-3.5 h-3.5" />
      </button>
    </div>

    <!-- Quick Stats Grid -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
      <div class="p-2.5 rounded-xl bg-gray-950/60 border border-gray-800/80">
        <span class="text-[10px] text-gray-400 block">{{ $t('bia.smmMuscle') }}</span>
        <span class="text-sm font-bold text-violet-300">{{ computedPeriodBia.body_composition?.skeletal_muscle_mass_kg }} {{ $t('common.kg') }}</span>
      </div>
      <div class="p-2.5 rounded-xl bg-gray-950/60 border border-gray-800/80">
        <span class="text-[10px] text-gray-400 block">{{ $t('bia.totalWater') }}</span>
        <span class="text-sm font-bold text-blue-300">{{ computedPeriodBia.body_composition?.total_water_kg }} {{ $t('common.kg') }}</span>
      </div>
      <div class="p-2.5 rounded-xl bg-gray-950/60 border border-gray-800/80">
        <span class="text-[10px] text-gray-400 block">{{ $t('bia.visceralFat') }}</span>
        <span class="text-sm font-bold text-amber-300">{{ $t('bia.visceralLevel', { level: computedPeriodBia.body_composition?.visceral_fat_level }) }}</span>
      </div>
      <div class="p-2.5 rounded-xl bg-gray-950/60 border border-gray-800/80">
        <span class="text-[10px] text-gray-400 block">{{ $t('bia.scoreAndAge') }}</span>
        <span class="text-sm font-bold text-emerald-300">{{ $t('bia.scoreAgeDisplay', { score: computedPeriodBia.body_composition?.health_body_score, age: computedPeriodBia.body_composition?.metabolic_body_age }) }}</span>
      </div>
    </div>

    <!-- Full BIA Modal -->
    <BiaDetailModal
      :is-open="isModalOpen"
      :title="$t('bia.summaryTitle', { period: periodLabel })"
      :bia-data="computedPeriodBia"
      @close="isModalOpen = false"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { Zap, ChevronRight } from 'lucide-vue-next';
import { useBodyGraphStore, calculateMedian } from '../stores/bodyGraph';
import { defaultBiaEngine, extractBiaResistances } from '../services/bia/biaCalculator';
import BiaDetailModal from './BiaDetailModal.vue';

const props = defineProps({
  periodItem: {
    type: Object,
    default: null
  },
  periodLabel: {
    type: String,
    default: ''
  }
});

const store = useBodyGraphStore();
const isModalOpen = ref(false);

const periodLogs = computed(() => {
  if (!props.periodItem) return [];
  // Find all logs matching this period's dates
  if (props.periodItem.logs) return props.periodItem.logs;
  
  if (props.periodItem.startDate && props.periodItem.endDate) {
    return store.logs.filter(l => l.date >= props.periodItem.startDate && l.date <= props.periodItem.endDate);
  }
  return [];
});

const biaLogs = computed(() => {
  return periodLogs.value
    .map(l => {
      const res = extractBiaResistances(l.impedances);
      return res ? { log: l, r_50k: res.r_50k, r_250k: res.r_250k } : null;
    })
    .filter(Boolean);
});

const biaLogsCount = computed(() => biaLogs.value.length);

const computedPeriodBia = computed(() => {
  const items = biaLogs.value;
  if (items.length === 0) return null;

  // Calculate median resistances across the period's BIA logs
  const lf_medians = [0, 1, 2, 3, 4, 5].map(idx => {
    return calculateMedian(items.map(item => Number(item.r_50k[idx])));
  });

  const hf_medians = [0, 1, 2, 3, 4, 5].map(idx => {
    return calculateMedian(items.map(item => Number(item.r_250k[idx])));
  });

  const medianWeight = props.periodItem.medianMass || calculateMedian(items.map(item => Number(item.log.mass)));
  const medianFat = props.periodItem.medianFat || calculateMedian(items.map(item => Number(item.log.body_fat)));
  const medianHR = calculateMedian(items.filter(item => item.log.heart_rate).map(item => Number(item.log.heart_rate))) || 80;

  const sex = store.profile?.gender === 'female' ? 0 : 1;
  const age = store.userAge || 34;
  const height_cm = store.profile?.height ? Number(store.profile.height) : 175.0;

  return defaultBiaEngine.analyze({
    sex,
    age,
    height_cm,
    weight_kg: medianWeight,
    resistances_50k: lf_medians,
    resistances_250k: hf_medians,
    raw_fat_rate: medianFat,
    heart_rate_bpm: medianHR
  });
});
</script>

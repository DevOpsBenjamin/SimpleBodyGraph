<template>
  <!-- Empty State -->
  <div v-if="store.logs.length === 0" class="glass-card p-10 rounded-3xl text-center flex flex-col items-center justify-center">
    <div class="w-16 h-16 bg-gray-950 rounded-2xl flex items-center justify-center border border-gray-800/60 text-gray-500 mb-4">
      <Scale class="w-8 h-8" />
    </div>
    <h3 class="text-lg font-semibold text-white mb-1">{{ $t('charts.emptyTitle') }}</h3>
    <p class="text-sm text-gray-400 max-w-xs mb-6">{{ $t('charts.emptyDesc') }}</p>
    <button 
      @click="store.showAddModal = true"
      class="px-4 py-2 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white font-medium rounded-xl transition-all duration-200 flex items-center gap-2 cursor-pointer shadow-lg shadow-violet-500/10"
    >
      <Plus class="w-4 h-4" /> {{ $t('charts.addLog') }}
    </button>
  </div>

  <div v-else class="space-y-6">
    <!-- DATE RANGE FILTER BAR -->
    <YearRangeSelector />

    <!-- 1. MONTHLY VIEW -->
    <div 
      v-show="store.activeTab === 'monthly'"
      class="space-y-6 animate-fade-in"
      @touchstart="handleTouchStart"
      @touchend="handleTouchEnd"
    >
      <!-- MONTH NAVIGATION BAR -->
      <PeriodFocusBar
        v-if="store.activeMonth"
        :title="$t('focusBar.selectedMonth')"
        :label="localizedActiveMonthLabel"
        period-name="month"
        :can-prev="store.selectedMonthIndex < store.groupedMonths.length - 1"
        :can-next="store.selectedMonthIndex > 0"
        @prev="store.goToPreviousMonth"
        @next="store.goToNextMonth"
      />

      <!-- Touch Swipe tip -->
      <p class="text-center text-[10px] text-gray-500 select-none">{{ $t('focusBar.swipeTipMonth') }}</p>

      <!-- BIA PERIOD SUMMARY (IF BIA DATA PRESENT) -->
      <BiaPeriodSummaryCard
        v-if="store.activeMonth"
        :period-item="store.activeMonth"
        :period-label="localizedActiveMonthLabel"
      />

      <!-- HEVY SYNC HELPER FOR ACTIVE MONTH -->
      <HevyFocusCard
        :item="store.activeMonth"
        :period-label="$t('nav.monthly')"
      />

      <!-- UNIFIED COMPOSITION CHART (MONTHLY) -->
      <UnifiedCompositionChart
        :title="$t('charts.monthlyTitle')"
        :mass-data="monthlyChartData.weight.median"
        :fat-mass-data="monthlyChartData.fatMass.median"
        :lean-mass-data="monthlyChartData.lean.median"
        :time-scale-options="commonMonthlyTimeScaleOptions"
      />

      <!-- BIA SEGMENTAL MUSCLE CHART (MONTHLY) -->
      <BiaSegmentalChart
        v-if="store.displayPreferences?.charts?.showBiaMuscleChart && monthlyBiaSegmentalData.length > 0"
        :title="$t('charts.segmentalMuscleMonthly')"
        type="muscle"
        :data="monthlyBiaSegmentalData"
        :time-scale-options="commonMonthlyTimeScaleOptions"
      />

      <!-- BIA SEGMENTAL FAT CHART (MONTHLY) -->
      <BiaSegmentalChart
        v-if="store.displayPreferences?.charts?.showBiaFatChart && monthlyBiaSegmentalData.length > 0"
        :title="$t('charts.segmentalFatMonthly')"
        type="fat"
        :data="monthlyBiaSegmentalData"
        :time-scale-options="commonMonthlyTimeScaleOptions"
      />

      <!-- BIA RECALCULATED & FAT COMPARISON CHART (MONTHLY) -->
      <BiaRecalculatedChart
        v-if="store.displayPreferences?.charts?.showBiaRecalculatedChart && monthlyBiaRecalculatedData.length > 0"
        :title="$t('charts.biaRecalculatedMonthlyTitle')"
        :data="monthlyBiaRecalculatedData"
        :time-scale-options="commonMonthlyTimeScaleOptions"
      />

      <!-- BODY FAT % CHART (MEDIAN VS RECALCULATED BIA) -->
      <div v-if="store.displayPreferences?.charts?.showFatPercentChart" class="pt-2">
        <MetricChartCard
          :title="$t('charts.fatPercentMonthlyTitle')"
          metric-type="fat"
          color-type="emerald"
          unit="%"
          :median-label="$t('charts.rawFatPercentMedian')"
          :average-label="$t('charts.recalcFatPercentBia')"
          :median-data="monthlyChartData.fat.median"
          :average-data="monthlyFatRecalculatedData"
          :paliers="store.paliersSorted"
          :active-palier="store.activePalier"
          :time-scale-options="commonMonthlyTimeScaleOptions"
        />
      </div>

      <!-- HEVY SYNC UTILITY (MONTHLY) -->
      <HevySyncList
        :items="store.groupedMonths"
        period-type="monthly"
      />
    </div>

    <!-- 2. WEEKLY VIEW -->
    <div 
      v-show="store.activeTab === 'weekly'"
      class="space-y-6 animate-fade-in"
      @touchstart="handleTouchStart"
      @touchend="handleTouchEnd"
    >
      <!-- WEEK NAVIGATION BAR -->
      <PeriodFocusBar
        v-if="store.activeWeek"
        :title="$t('focusBar.selectedWeek')"
        :label="localizedActiveWeekLabel"
        period-name="week"
        :can-prev="store.selectedWeekIndex < store.groupedWeeks.length - 1"
        :can-next="store.selectedWeekIndex > 0"
        @prev="store.goToPreviousWeek"
        @next="store.goToNextWeek"
      />

      <!-- Touch Swipe tip -->
      <p class="text-center text-[10px] text-gray-500 select-none">{{ $t('focusBar.swipeTipWeek') }}</p>

      <!-- BIA PERIOD SUMMARY (IF BIA DATA PRESENT) -->
      <BiaPeriodSummaryCard
        v-if="store.activeWeek"
        :period-item="store.activeWeek"
        :period-label="localizedActiveWeekLabel"
      />

      <!-- HEVY SYNC HELPER FOR ACTIVE WEEK -->
      <HevyFocusCard
        :item="store.activeWeek"
        :period-label="$t('nav.weekly')"
      />

      <!-- UNIFIED COMPOSITION CHART (WEEKLY) -->
      <UnifiedCompositionChart
        :title="$t('charts.weeklyTitle')"
        :mass-data="weeklyChartData.weight.median"
        :fat-mass-data="weeklyChartData.fatMass.median"
        :lean-mass-data="weeklyChartData.lean.median"
        :time-scale-options="commonWeeklyTimeScaleOptions"
      />

      <!-- BIA SEGMENTAL MUSCLE CHART (WEEKLY) -->
      <BiaSegmentalChart
        v-if="store.displayPreferences?.charts?.showBiaMuscleChart && weeklyBiaSegmentalData.length > 0"
        :title="$t('charts.segmentalMuscleWeekly')"
        type="muscle"
        :data="weeklyBiaSegmentalData"
        :time-scale-options="commonWeeklyTimeScaleOptions"
      />

      <!-- BIA SEGMENTAL FAT CHART (WEEKLY) -->
      <BiaSegmentalChart
        v-if="store.displayPreferences?.charts?.showBiaFatChart && weeklyBiaSegmentalData.length > 0"
        :title="$t('charts.segmentalFatWeekly')"
        type="fat"
        :data="weeklyBiaSegmentalData"
        :time-scale-options="commonWeeklyTimeScaleOptions"
      />

      <!-- BIA RECALCULATED & FAT COMPARISON CHART (WEEKLY) -->
      <BiaRecalculatedChart
        v-if="store.displayPreferences?.charts?.showBiaRecalculatedChart && weeklyBiaRecalculatedData.length > 0"
        :title="$t('charts.biaRecalculatedWeeklyTitle')"
        :data="weeklyBiaRecalculatedData"
        :time-scale-options="commonWeeklyTimeScaleOptions"
      />

      <!-- BODY FAT % CHART (MEDIAN VS RECALCULATED BIA) -->
      <div v-if="store.displayPreferences?.charts?.showFatPercentChart" class="pt-2">
        <MetricChartCard
          :title="$t('charts.fatPercentWeeklyTitle')"
          metric-type="fat"
          color-type="emerald"
          unit="%"
          :median-label="$t('charts.rawFatPercentMedian')"
          :average-label="$t('charts.recalcFatPercentBia')"
          :median-data="weeklyChartData.fat.median"
          :average-data="weeklyFatRecalculatedData"
          :paliers="store.paliersSorted"
          :active-palier="store.activePalier"
          :time-scale-options="commonWeeklyTimeScaleOptions"
        />
      </div>

      <!-- HEVY SYNC UTILITY (WEEKLY) -->
      <HevySyncList
        :items="store.groupedWeeks"
        period-type="weekly"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { Scale, Plus } from 'lucide-vue-next';
import { useBodyGraphStore, calculateMedian } from '../stores/bodyGraph';
import { useI18n } from '../i18n';
import YearRangeSelector from './YearRangeSelector.vue';
import PeriodFocusBar from './PeriodFocusBar.vue';
import HevyFocusCard from './HevyFocusCard.vue';
import HevySyncList from './HevySyncList.vue';
import MetricChartCard from './MetricChartCard.vue';
import UnifiedCompositionChart from './UnifiedCompositionChart.vue';
import BiaPeriodSummaryCard from './BiaPeriodSummaryCard.vue';
import BiaSegmentalChart from './BiaSegmentalChart.vue';
import BiaRecalculatedChart from './BiaRecalculatedChart.vue';
import { defaultBiaEngine, extractBiaResistances } from '../services/bia/biaCalculator';
import { 
  commonMonthlyTimeScaleOptions, 
  commonWeeklyTimeScaleOptions 
} from '../utils/chartHelpers';

const store = useBodyGraphStore();
const { formatMonthYear, formatWeekRange } = useI18n();

const localizedActiveMonthLabel = computed(() => {
  if (!store.activeMonth) return '';
  return formatMonthYear(store.activeMonth.startDate);
});

const localizedActiveWeekLabel = computed(() => {
  if (!store.activeWeek) return '';
  return formatWeekRange(store.activeWeek.monday, store.activeWeek.sunday);
});

// Swipe navigation controls
let touchStartX = 0;
let touchStartY = 0;

const handleTouchStart = (e) => {
  touchStartX = e.changedTouches[0].pageX;
  touchStartY = e.changedTouches[0].pageY;
};

const handleTouchEnd = (e) => {
  const touchEndX = e.changedTouches[0].pageX;
  const touchEndY = e.changedTouches[0].pageY;
  
  const deltaX = touchEndX - touchStartX;
  const deltaY = touchEndY - touchStartY;

  if (Math.abs(deltaX) > 60 && Math.abs(deltaY) < 40) {
    if (deltaX > 0) {
      if (store.activeTab === 'monthly') {
        store.goToPreviousMonth();
      } else {
        store.goToPreviousWeek();
      }
    } else {
      if (store.activeTab === 'monthly') {
        store.goToNextMonth();
      } else {
        store.goToNextWeek();
      }
    }
  }
};

// Computed chart datasets for Monthly view (chronological order)
const monthlyChartData = computed(() => {
  const sorted = [...store.groupedMonths].reverse();
  return {
    weight: {
      median: sorted.map(m => ({ x: m.startDate, y: m.medianMass })),
      avg: sorted.map(m => ({ x: m.startDate, y: m.avgMass }))
    },
    lean: {
      median: sorted.map(m => ({ x: m.startDate, y: m.medianLeanMass })),
      avg: sorted.map(m => ({ x: m.startDate, y: m.avgLeanMass }))
    },
    fat: {
      median: sorted.map(m => ({ x: m.startDate, y: m.medianFat })),
      avg: sorted.map(m => ({ x: m.startDate, y: m.avgFat }))
    },
    fatMass: {
      median: sorted.map(m => ({ x: m.startDate, y: m.medianFatMass })),
      avg: sorted.map(m => ({ x: m.startDate, y: m.avgFatMass }))
    }
  };
});

// Computed chart datasets for Weekly view (chronological order)
const weeklyChartData = computed(() => {
  const sorted = [...store.groupedWeeks].reverse();
  return {
    weight: {
      median: sorted.map(w => ({ x: w.monday, y: w.medianMass })),
      avg: sorted.map(w => ({ x: w.monday, y: w.avgMass }))
    },
    lean: {
      median: sorted.map(w => ({ x: w.monday, y: w.medianLeanMass })),
      avg: sorted.map(w => ({ x: w.monday, y: w.avgLeanMass }))
    },
    fat: {
      median: sorted.map(w => ({ x: w.monday, y: w.medianFat })),
      avg: sorted.map(w => ({ x: w.monday, y: w.avgFat }))
    },
    fatMass: {
      median: sorted.map(w => ({ x: w.monday, y: w.medianFatMass })),
      avg: sorted.map(w => ({ x: w.monday, y: w.avgFatMass }))
    }
  };
});

// Computed Fat % Recalculated datasets for 2-line Fat% chart
const monthlyFatRecalculatedData = computed(() => {
  const recalcMap = new Map(monthlyBiaRecalculatedData.value.map(d => [d.date, d.recalcFatPercent]));
  const sorted = [...store.groupedMonths].reverse();
  return sorted.map(m => ({
    x: m.startDate,
    y: recalcMap.has(m.startDate) ? recalcMap.get(m.startDate) : m.medianFat
  }));
});

const weeklyFatRecalculatedData = computed(() => {
  const recalcMap = new Map(weeklyBiaRecalculatedData.value.map(d => [d.date, d.recalcFatPercent]));
  const sorted = [...store.groupedWeeks].reverse();
  return sorted.map(w => ({
    x: w.monday,
    y: recalcMap.has(w.monday) ? recalcMap.get(w.monday) : w.medianFat
  }));
});

// Computed BIA Segmental datasets for Monthly view
const monthlyBiaSegmentalData = computed(() => {
  const sorted = [...store.groupedMonths].reverse();
  const points = [];

  for (const m of sorted) {
    const biaItems = (m.logs || [])
      .map(l => {
        const res = extractBiaResistances(l.impedances);
        return res ? { log: l, r_50k: res.r_50k, r_250k: res.r_250k } : null;
      })
      .filter(Boolean);

    if (biaItems.length === 0) continue;

    const lf = [0, 1, 2, 3, 4, 5].map(idx => calculateMedian(biaItems.map(item => Number(item.r_50k[idx]))));
    const hf = [0, 1, 2, 3, 4, 5].map(idx => calculateMedian(biaItems.map(item => Number(item.r_250k[idx]))));
    const mass = m.medianMass || calculateMedian(biaItems.map(item => Number(item.log.mass)));
    const fat = m.medianFat || calculateMedian(biaItems.map(item => Number(item.log.body_fat)));
    const hrLogs = biaItems.filter(item => item.log.heart_rate).map(item => Number(item.log.heart_rate));
    const hr = hrLogs.length > 0 ? calculateMedian(hrLogs) : 80;

    const sex = store.profile?.gender === 'female' ? 0 : 1;
    const age = store.userAge || 34;
    const height = store.profile?.height ? Number(store.profile.height) : 175.0;

    const res = defaultBiaEngine.analyze({
      sex,
      age,
      height_cm: height,
      weight_kg: mass,
      resistances_50k: lf,
      resistances_250k: hf,
      raw_fat_rate: fat,
      heart_rate_bpm: hr
    });

    if (res && res.segmental_analysis) {
      points.push({
        date: m.startDate,
        muscle: {
          total: res.segmental_analysis.muscle_mass.total_smm_kg,
          trunk: res.segmental_analysis.muscle_mass.trunk_kg,
          rightArm: res.segmental_analysis.muscle_mass.right_arm_kg,
          leftArm: res.segmental_analysis.muscle_mass.left_arm_kg,
          rightLeg: res.segmental_analysis.muscle_mass.right_leg_kg,
          leftLeg: res.segmental_analysis.muscle_mass.left_leg_kg
        },
        fat: {
          total: res.segmental_analysis.fat_mass.total_fat_kg,
          trunk: res.segmental_analysis.fat_mass.trunk_kg,
          rightArm: res.segmental_analysis.fat_mass.right_arm_kg,
          leftArm: res.segmental_analysis.fat_mass.left_arm_kg,
          rightLeg: res.segmental_analysis.fat_mass.right_leg_kg,
          leftLeg: res.segmental_analysis.fat_mass.left_leg_kg
        }
      });
    }
  }

  return points;
});

// Computed BIA Segmental datasets for Weekly view
const weeklyBiaSegmentalData = computed(() => {
  const sorted = [...store.groupedWeeks].reverse();
  const points = [];

  for (const w of sorted) {
    const biaItems = (w.logs || [])
      .map(l => {
        const res = extractBiaResistances(l.impedances);
        return res ? { log: l, r_50k: res.r_50k, r_250k: res.r_250k } : null;
      })
      .filter(Boolean);

    if (biaItems.length === 0) continue;

    const lf = [0, 1, 2, 3, 4, 5].map(idx => calculateMedian(biaItems.map(item => Number(item.r_50k[idx]))));
    const hf = [0, 1, 2, 3, 4, 5].map(idx => calculateMedian(biaItems.map(item => Number(item.r_250k[idx]))));
    const mass = w.medianMass || calculateMedian(biaItems.map(item => Number(item.log.mass)));
    const fat = w.medianFat || calculateMedian(biaItems.map(item => Number(item.log.body_fat)));
    const hrLogs = biaItems.filter(item => item.log.heart_rate).map(item => Number(item.log.heart_rate));
    const hr = hrLogs.length > 0 ? calculateMedian(hrLogs) : 80;

    const sex = store.profile?.gender === 'female' ? 0 : 1;
    const age = store.userAge || 34;
    const height = store.profile?.height ? Number(store.profile.height) : 175.0;

    const res = defaultBiaEngine.analyze({
      sex,
      age,
      height_cm: height,
      weight_kg: mass,
      resistances_50k: lf,
      resistances_250k: hf,
      raw_fat_rate: fat,
      heart_rate_bpm: hr
    });

    if (res && res.segmental_analysis) {
      points.push({
        date: w.monday,
        muscle: {
          total: res.segmental_analysis.muscle_mass.total_smm_kg,
          trunk: res.segmental_analysis.muscle_mass.trunk_kg,
          rightArm: res.segmental_analysis.muscle_mass.right_arm_kg,
          leftArm: res.segmental_analysis.muscle_mass.left_arm_kg,
          rightLeg: res.segmental_analysis.muscle_mass.right_leg_kg,
          leftLeg: res.segmental_analysis.muscle_mass.left_leg_kg
        },
        fat: {
          total: res.segmental_analysis.fat_mass.total_fat_kg,
          trunk: res.segmental_analysis.fat_mass.trunk_kg,
          rightArm: res.segmental_analysis.fat_mass.right_arm_kg,
          leftArm: res.segmental_analysis.fat_mass.left_arm_kg,
          rightLeg: res.segmental_analysis.fat_mass.right_leg_kg,
          leftLeg: res.segmental_analysis.fat_mass.left_leg_kg
        }
      });
    }
  }

  return points;
});

// Computed BIA Recalculated datasets for Monthly view
const monthlyBiaRecalculatedData = computed(() => {
  const sorted = [...store.groupedMonths].reverse();
  const points = [];

  for (const m of sorted) {
    const biaItems = (m.logs || [])
      .map(l => {
        const res = extractBiaResistances(l.impedances);
        return res ? { log: l, r_50k: res.r_50k, r_250k: res.r_250k } : null;
      })
      .filter(Boolean);

    if (biaItems.length === 0) continue;

    const lf = [0, 1, 2, 3, 4, 5].map(idx => calculateMedian(biaItems.map(item => Number(item.r_50k[idx]))));
    const hf = [0, 1, 2, 3, 4, 5].map(idx => calculateMedian(biaItems.map(item => Number(item.r_250k[idx]))));
    const mass = m.medianMass || calculateMedian(biaItems.map(item => Number(item.log.mass)));
    const fat = m.medianFat || calculateMedian(biaItems.map(item => Number(item.log.body_fat)));
    const hrLogs = biaItems.filter(item => item.log.heart_rate).map(item => Number(item.log.heart_rate));
    const hr = hrLogs.length > 0 ? calculateMedian(hrLogs) : 80;

    const sex = store.profile?.gender === 'female' ? 0 : 1;
    const age = store.userAge || 34;
    const height = store.profile?.height ? Number(store.profile.height) : 175.0;

    const res = defaultBiaEngine.analyze({
      sex,
      age,
      height_cm: height,
      weight_kg: mass,
      resistances_50k: lf,
      resistances_250k: hf,
      raw_fat_rate: fat,
      heart_rate_bpm: hr
    });

    if (res && res.body_composition) {
      points.push({
        date: m.startDate,
        mass,
        rawFatPercent: fat,
        recalcFatPercent: res.body_composition.recalculated_body_fat_percent,
        rawFatMass: m.medianFatMass || Number((mass * (fat / 100)).toFixed(2)),
        recalcFatMass: res.body_composition.recalculated_fat_mass_kg,
        recalcFfm: res.body_composition.recalculated_ffm_kg,
        recalcSmm: res.body_composition.skeletal_muscle_mass_kg,
        recalcWater: res.body_composition.total_water_kg,
        recalcIcw: res.body_composition.intracellular_water_kg,
        recalcEcw: res.body_composition.extracellular_water_kg,
        medianZ50: res.impedances_50k_ohms.z_body_avg,
        medianZ250: res.impedances_250k_ohms.z_body_avg
      });
    }
  }

  return points;
});

// Computed BIA Recalculated datasets for Weekly view
const weeklyBiaRecalculatedData = computed(() => {
  const sorted = [...store.groupedWeeks].reverse();
  const points = [];

  for (const w of sorted) {
    const biaItems = (w.logs || [])
      .map(l => {
        const res = extractBiaResistances(l.impedances);
        return res ? { log: l, r_50k: res.r_50k, r_250k: res.r_250k } : null;
      })
      .filter(Boolean);

    if (biaItems.length === 0) continue;

    const lf = [0, 1, 2, 3, 4, 5].map(idx => calculateMedian(biaItems.map(item => Number(item.r_50k[idx]))));
    const hf = [0, 1, 2, 3, 4, 5].map(idx => calculateMedian(biaItems.map(item => Number(item.r_250k[idx]))));
    const mass = w.medianMass || calculateMedian(biaItems.map(item => Number(item.log.mass)));
    const fat = w.medianFat || calculateMedian(biaItems.map(item => Number(item.log.body_fat)));
    const hrLogs = biaItems.filter(item => item.log.heart_rate).map(item => Number(item.log.heart_rate));
    const hr = hrLogs.length > 0 ? calculateMedian(hrLogs) : 80;

    const sex = store.profile?.gender === 'female' ? 0 : 1;
    const age = store.userAge || 34;
    const height = store.profile?.height ? Number(store.profile.height) : 175.0;

    const res = defaultBiaEngine.analyze({
      sex,
      age,
      height_cm: height,
      weight_kg: mass,
      resistances_50k: lf,
      resistances_250k: hf,
      raw_fat_rate: fat,
      heart_rate_bpm: hr
    });

    if (res && res.body_composition) {
      points.push({
        date: w.monday,
        mass,
        rawFatPercent: fat,
        recalcFatPercent: res.body_composition.recalculated_body_fat_percent,
        rawFatMass: w.medianFatMass || Number((mass * (fat / 100)).toFixed(2)),
        recalcFatMass: res.body_composition.recalculated_fat_mass_kg,
        recalcFfm: res.body_composition.recalculated_ffm_kg,
        recalcSmm: res.body_composition.skeletal_muscle_mass_kg,
        recalcWater: res.body_composition.total_water_kg,
        recalcIcw: res.body_composition.intracellular_water_kg,
        recalcEcw: res.body_composition.extracellular_water_kg,
        medianZ50: res.impedances_50k_ohms.z_body_avg,
        medianZ250: res.impedances_250k_ohms.z_body_avg
      });
    }
  }

  return points;
});
</script>

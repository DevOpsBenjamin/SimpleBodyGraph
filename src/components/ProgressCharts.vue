<template>
  <!-- Empty State -->
  <div v-if="store.logs.length === 0" class="glass-card p-10 rounded-3xl text-center flex flex-col items-center justify-center">
    <div class="w-16 h-16 bg-gray-950 rounded-2xl flex items-center justify-center border border-gray-800/60 text-gray-500 mb-4">
      <Scale class="w-8 h-8" />
    </div>
    <h3 class="text-lg font-semibold text-white mb-1">Aucune donnée disponible</h3>
    <p class="text-sm text-gray-400 max-w-xs mb-6">Commencez par ajouter ou synchroniser des pesées pour afficher vos graphiques de progression.</p>
    <button 
      @click="store.showAddModal = true"
      class="px-4 py-2 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white font-medium rounded-xl transition-all duration-200 flex items-center gap-2 cursor-pointer shadow-lg shadow-violet-500/10"
    >
      <Plus class="w-4 h-4" /> Ajouter une pesée
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
        title="Mois sélectionné"
        :label="store.activeMonth.label"
        period-name="month"
        :can-prev="store.selectedMonthIndex < store.groupedMonths.length - 1"
        :can-next="store.selectedMonthIndex > 0"
        @prev="store.goToPreviousMonth"
        @next="store.goToNextMonth"
      />

      <!-- Touch Swipe tip -->
      <p class="text-center text-[10px] text-gray-500 select-none">💡 Glissez vers la gauche/droite pour naviguer entre les mois</p>

      <!-- BIA PERIOD SUMMARY (IF BIA DATA PRESENT) -->
      <BiaPeriodSummaryCard
        v-if="store.activeMonth"
        :period-item="store.activeMonth"
        :period-label="store.activeMonth.label"
      />

      <!-- HEVY SYNC HELPER FOR ACTIVE MONTH -->
      <HevyFocusCard
        :item="store.activeMonth"
        period-label="Monthly"
      />

      <!-- UNIFIED COMPOSITION CHART (MONTHLY) -->
      <UnifiedCompositionChart
        title="Progression Mensuelle (Médianes)"
        :mass-data="monthlyChartData.weight.median"
        :fat-mass-data="monthlyChartData.fatMass.median"
        :lean-mass-data="monthlyChartData.lean.median"
        :time-scale-options="commonMonthlyTimeScaleOptions"
      />

      <!-- OPTIONAL BODY FAT % CHART -->
      <div v-if="store.displayPreferences?.charts?.showFatPercentChart" class="pt-2">
        <MetricChartCard
          title="Taux de Masse Grasse Mensuel (%)"
          metric-type="fat"
          color-type="emerald"
          unit="%"
          median-label="Médiane Mensuelle"
          average-label="Moyenne Mensuelle"
          :median-data="monthlyChartData.fat.median"
          :average-data="monthlyChartData.fat.avg"
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
        title="Semaine sélectionnée"
        :label="store.activeWeek.label"
        period-name="week"
        :can-prev="store.selectedWeekIndex < store.groupedWeeks.length - 1"
        :can-next="store.selectedWeekIndex > 0"
        @prev="store.goToPreviousWeek"
        @next="store.goToNextWeek"
      />

      <!-- Touch Swipe tip -->
      <p class="text-center text-[10px] text-gray-500 select-none">💡 Glissez vers la gauche/droite pour naviguer entre les semaines</p>

      <!-- BIA PERIOD SUMMARY (IF BIA DATA PRESENT) -->
      <BiaPeriodSummaryCard
        v-if="store.activeWeek"
        :period-item="store.activeWeek"
        :period-label="store.activeWeek.label"
      />

      <!-- HEVY SYNC HELPER FOR ACTIVE WEEK -->
      <HevyFocusCard
        :item="store.activeWeek"
        period-label="Weekly"
      />

      <!-- UNIFIED COMPOSITION CHART (WEEKLY) -->
      <UnifiedCompositionChart
        title="Progression Hebdomadaire (Médianes 7j)"
        :mass-data="weeklyChartData.weight.median"
        :fat-mass-data="weeklyChartData.fatMass.median"
        :lean-mass-data="weeklyChartData.lean.median"
        :time-scale-options="commonWeeklyTimeScaleOptions"
      />

      <!-- OPTIONAL BODY FAT % CHART -->
      <div v-if="store.displayPreferences?.charts?.showFatPercentChart" class="pt-2">
        <MetricChartCard
          title="Taux de Masse Grasse Hebdomadaire (%)"
          metric-type="fat"
          color-type="emerald"
          unit="%"
          median-label="Médiane Hebdomadaire"
          average-label="Moyenne Hebdomadaire"
          :median-data="weeklyChartData.fat.median"
          :average-data="weeklyChartData.fat.avg"
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
import { useBodyGraphStore } from '../stores/bodyGraph';
import YearRangeSelector from './YearRangeSelector.vue';
import PeriodFocusBar from './PeriodFocusBar.vue';
import HevyFocusCard from './HevyFocusCard.vue';
import HevySyncList from './HevySyncList.vue';
import MetricChartCard from './MetricChartCard.vue';
import UnifiedCompositionChart from './UnifiedCompositionChart.vue';
import BiaPeriodSummaryCard from './BiaPeriodSummaryCard.vue';
import { 
  commonMonthlyTimeScaleOptions, 
  commonWeeklyTimeScaleOptions 
} from '../utils/chartHelpers';

const store = useBodyGraphStore();

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
</script>

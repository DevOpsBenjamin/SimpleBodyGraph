<template>
  <!-- Empty State -->
  <div v-if="store.logs.length === 0" class="glass-card p-10 rounded-3xl text-center flex flex-col items-center justify-center">
    <div class="w-16 h-16 bg-gray-950 rounded-2xl flex items-center justify-center border border-gray-800/60 text-gray-500 mb-4">
      <Scale class="w-8 h-8" />
    </div>
    <h3 class="text-lg font-semibold text-white mb-1">No Data Available</h3>
    <p class="text-sm text-gray-400 max-w-xs mb-6">Start logging your body mass and body fat percentage to render your progress charts.</p>
    <button 
      @click="store.showAddModal = true"
      class="px-4 py-2 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white font-medium rounded-xl transition-all duration-200 flex items-center gap-2 cursor-pointer shadow-lg shadow-violet-500/10"
    >
      <Plus class="w-4 h-4" /> Add Your First Log
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
        title="Active Month Focus"
        :label="store.activeMonth.label"
        period-name="month"
        :can-prev="store.selectedMonthIndex < store.groupedMonths.length - 1"
        :can-next="store.selectedMonthIndex > 0"
        @prev="store.goToPreviousMonth"
        @next="store.goToNextMonth"
      />

      <!-- Touch Swipe tip -->
      <p class="text-center text-[10px] text-gray-500 select-none">💡 Swipe left/right on cards to navigate months</p>

      <!-- HEVY SYNC HELPER FOR ACTIVE MONTH -->
      <HevyFocusCard
        :item="store.activeMonth"
        period-label="Monthly"
      />

      <!-- Monthly Charts Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Monthly Weight -->
        <MetricChartCard
          title="Monthly Weight: Median vs Average (kg)"
          metric-type="weight"
          color-type="violet"
          unit=" kg"
          median-label="Monthly Median"
          average-label="Monthly Average"
          :median-data="monthlyChartData.weight.median"
          :average-data="monthlyChartData.weight.avg"
          :paliers="store.paliersSorted"
          :active-palier="store.activePalier"
          :time-scale-options="commonMonthlyTimeScaleOptions"
        />

        <!-- Monthly Lean Mass -->
        <MetricChartCard
          title="Monthly Lean Mass: Median vs Average (kg)"
          metric-type="lean"
          color-type="blue"
          unit=" kg"
          median-label="Monthly Median"
          average-label="Monthly Average"
          :median-data="monthlyChartData.lean.median"
          :average-data="monthlyChartData.lean.avg"
          :paliers="store.paliersSorted"
          :active-palier="store.activePalier"
          :time-scale-options="commonMonthlyTimeScaleOptions"
        />

        <!-- Monthly Body Fat -->
        <MetricChartCard
          title="Monthly Body Fat: Median vs Average (%)"
          metric-type="fat"
          color-type="emerald"
          unit="%"
          median-label="Monthly Median"
          average-label="Monthly Average"
          :median-data="monthlyChartData.fat.median"
          :average-data="monthlyChartData.fat.avg"
          :paliers="store.paliersSorted"
          :active-palier="store.activePalier"
          :time-scale-options="commonMonthlyTimeScaleOptions"
        />

        <!-- Monthly Fat Mass -->
        <MetricChartCard
          title="Monthly Fat Mass: Median vs Average (kg)"
          metric-type="fat_mass"
          color-type="amber"
          unit=" kg"
          median-label="Monthly Median"
          average-label="Monthly Average"
          :median-data="monthlyChartData.fatMass.median"
          :average-data="monthlyChartData.fatMass.avg"
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
        title="Active Week Focus"
        :label="store.activeWeek.label"
        period-name="week"
        :can-prev="store.selectedWeekIndex < store.groupedWeeks.length - 1"
        :can-next="store.selectedWeekIndex > 0"
        @prev="store.goToPreviousWeek"
        @next="store.goToNextWeek"
      />

      <!-- Touch Swipe tip -->
      <p class="text-center text-[10px] text-gray-500 select-none">💡 Swipe left/right on cards to navigate weeks</p>

      <!-- HEVY SYNC HELPER FOR ACTIVE WEEK -->
      <HevyFocusCard
        :item="store.activeWeek"
        period-label="Weekly"
      />

      <!-- Weekly Charts Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Weekly Weight -->
        <MetricChartCard
          title="Weekly Weight: Median vs Average (kg)"
          metric-type="weight"
          color-type="violet"
          unit=" kg"
          median-label="Weekly Median"
          average-label="Weekly Average"
          :median-data="weeklyChartData.weight.median"
          :average-data="weeklyChartData.weight.avg"
          :paliers="store.paliersSorted"
          :active-palier="store.activePalier"
          :time-scale-options="commonWeeklyTimeScaleOptions"
        />

        <!-- Weekly Lean Mass -->
        <MetricChartCard
          title="Weekly Lean Mass: Median vs Average (kg)"
          metric-type="lean"
          color-type="blue"
          unit=" kg"
          median-label="Weekly Median"
          average-label="Weekly Average"
          :median-data="weeklyChartData.lean.median"
          :average-data="weeklyChartData.lean.avg"
          :paliers="store.paliersSorted"
          :active-palier="store.activePalier"
          :time-scale-options="commonWeeklyTimeScaleOptions"
        />

        <!-- Weekly Body Fat -->
        <MetricChartCard
          title="Weekly Body Fat: Median vs Average (%)"
          metric-type="fat"
          color-type="emerald"
          unit="%"
          median-label="Weekly Median"
          average-label="Weekly Average"
          :median-data="weeklyChartData.fat.median"
          :average-data="weeklyChartData.fat.avg"
          :paliers="store.paliersSorted"
          :active-palier="store.activePalier"
          :time-scale-options="commonWeeklyTimeScaleOptions"
        />

        <!-- Weekly Fat Mass -->
        <MetricChartCard
          title="Weekly Fat Mass: Median vs Average (kg)"
          metric-type="fat_mass"
          color-type="amber"
          unit=" kg"
          median-label="Weekly Median"
          average-label="Weekly Average"
          :median-data="weeklyChartData.fatMass.median"
          :average-data="weeklyChartData.fatMass.avg"
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

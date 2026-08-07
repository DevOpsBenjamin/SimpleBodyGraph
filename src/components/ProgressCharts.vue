<template>
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
    
    <!-- 1. MONTHLY VIEW -->
    <div 
      v-show="store.activeTab === 'monthly'"
      class="space-y-6 animate-fade-in"
      @touchstart="handleTouchStart"
      @touchend="handleTouchEnd"
    >
      <!-- MONTH NAVIGATION BAR -->
      <div v-if="store.activeMonth" class="flex items-center justify-between glass-card p-3 rounded-2xl max-w-sm mx-auto shadow-md">
        <!-- Prev month button -->
        <button
          @click="store.goToPreviousMonth"
          :disabled="store.selectedMonthIndex >= store.groupedMonths.length - 1"
          class="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors duration-200"
        >
          <ChevronLeft class="w-5 h-5" />
        </button>

        <!-- Current month display label -->
        <div class="text-center select-none">
          <div class="text-xs text-violet-400 font-semibold uppercase tracking-wider">Active Month Focus</div>
          <div class="text-sm font-bold text-white mt-0.5">{{ store.activeMonth.label }}</div>
        </div>

        <!-- Next month button -->
        <button
          @click="store.goToNextMonth"
          :disabled="store.selectedMonthIndex <= 0"
          class="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors duration-200"
        >
          <ChevronRight class="w-5 h-5" />
        </button>
      </div>

      <!-- Touch Swipe tip -->
      <p class="text-center text-[10px] text-gray-500 select-none">💡 Swipe left/right on cards to navigate months</p>

      <!-- HEVY SYNC HELPER FOR ACTIVE MONTH -->
      <div
        v-if="store.activeMonth"
        class="glass-card p-4 rounded-3xl max-w-md mx-auto shadow-lg flex items-center justify-between border border-gray-800/40 hover:border-gray-700/60 transition-all duration-300"
      >
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-xl bg-violet-600/10 border border-violet-500/15 flex-shrink-0">
            <Copy class="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h4 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>Hevy Helper</span>
            </h4>
            <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1.5 text-[11px] text-gray-400">
              <span class="flex items-center gap-0.5">W: <strong class="text-white">{{ store.activeMonth.medianMass.toFixed(2) }} kg</strong></span>
              <span class="text-gray-700">|</span>
              <span class="flex items-center gap-0.5">Lean: <strong class="text-blue-400">{{ store.activeMonth.medianLeanMass.toFixed(2) }} kg</strong></span>
              <span class="text-gray-700">|</span>
              <span class="flex items-center gap-0.5">Fat: <strong class="text-emerald-400">{{ store.activeMonth.medianFat.toFixed(1) }}%</strong></span>
              <span class="text-gray-700">|</span>
              <span class="flex items-center gap-0.5">Fat kg: <strong class="text-amber-400">{{ store.activeMonth.medianFatMass.toFixed(2) }} kg</strong></span>
            </div>
          </div>
        </div>

        <button
          @click="copyAverage(store.activeMonth)"
          class="p-2 px-3 rounded-xl bg-gray-800 hover:bg-gray-750 text-gray-400 hover:text-white transition-all duration-200 cursor-pointer border border-gray-700/30 flex-shrink-0 flex items-center gap-1.5 text-xs font-medium"
          title="Copy Monthly Medians"
        >
          <Check v-if="copiedId === store.activeMonth.id" class="w-4 h-4 text-emerald-400 animate-bounce" />
          <Copy v-else class="w-4 h-4 text-violet-400" />
          <span>{{ copiedId === store.activeMonth.id ? 'Copied!' : 'Copy' }}</span>
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Weight Average Chart -->
        <div class="glass-card p-4 sm:p-5 rounded-3xl shadow-lg">
          <h3 class="text-xs font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-violet-500 animate-pulse"></span> Monthly Weight: Median vs Average (kg)
          </h3>
          <div class="relative h-[240px] w-full">
            <canvas ref="weightMonthlyCanvas"></canvas>
          </div>
        </div>

        <!-- Lean Mass Average Chart -->
        <div class="glass-card p-4 sm:p-5 rounded-3xl shadow-lg">
          <h3 class="text-xs font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span> Monthly Lean Mass: Median vs Average (kg)
          </h3>
          <div class="relative h-[240px] w-full">
            <canvas ref="leanMonthlyCanvas"></canvas>
          </div>
        </div>

        <!-- Fat Average Chart -->
        <div class="glass-card p-4 sm:p-5 rounded-3xl shadow-lg">
          <h3 class="text-xs font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Monthly Body Fat: Median vs Average (%)
          </h3>
          <div class="relative h-[240px] w-full">
            <canvas ref="fatMonthlyCanvas"></canvas>
          </div>
        </div>

        <!-- Fat Mass Average Chart -->
        <div class="glass-card p-4 sm:p-5 rounded-3xl shadow-lg">
          <h3 class="text-xs font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> Monthly Fat Mass: Median vs Average (kg)
          </h3>
          <div class="relative h-[240px] w-full">
            <canvas ref="fatMassMonthlyCanvas"></canvas>
          </div>
        </div>
      </div>

      <!-- HEVY SYNC UTILITY (MONTHLY) -->
      <div class="glass-card p-5 rounded-3xl max-w-2xl mx-auto shadow-xl">
        <div class="flex items-center gap-2 mb-2">
          <Copy class="w-4.5 h-4.5 text-violet-400" />
          <h3 class="text-sm font-bold text-white">Hevy Sync Helper</h3>
        </div>
        <p class="text-xs text-gray-400 mb-4">
          Click the copy button to copy your monthly median values to enter them directly into your Hevy logs.
        </p>

        <!-- Averages List -->
        <div class="space-y-2.5">
          <div
            v-for="month in store.groupedMonths"
            :key="month.id"
            class="flex items-center justify-between p-3 rounded-xl bg-gray-900/60 border border-gray-800/40 hover:border-gray-700/60 transition-colors duration-200"
          >
            <div>
              <div class="text-xs font-semibold text-white flex items-center gap-1.5">
                <span>{{ month.label }}</span>
              </div>
              <div class="text-[10px] text-gray-500 mt-0.5">Based on {{ month.logs.length }} records</div>
            </div>

            <div class="flex items-center gap-5 sm:gap-6 flex-wrap sm:flex-nowrap">
              <div class="text-right">
                <span class="text-[10px] text-gray-400 block leading-none">Med Weight</span>
                <span class="text-sm font-bold text-white mt-0.5 block">{{ month.medianMass.toFixed(2) }} kg</span>
              </div>
              <div class="text-right">
                <span class="text-[10px] text-blue-400 block leading-none">Med Lean</span>
                <span class="text-sm font-bold text-blue-400 mt-0.5 block">{{ month.medianLeanMass.toFixed(2) }} kg</span>
              </div>
              <div class="text-right">
                <span class="text-[10px] text-emerald-400 block leading-none">Med Fat %</span>
                <span class="text-sm font-bold text-emerald-400 mt-0.5 block">{{ month.medianFat.toFixed(1) }}%</span>
              </div>
              <div class="text-right">
                <span class="text-[10px] text-amber-400 block leading-none">Med Fat kg</span>
                <span class="text-sm font-bold text-amber-400 mt-0.5 block">{{ month.medianFatMass.toFixed(2) }} kg</span>
              </div>

              <!-- Copy trigger -->
              <button
                @click="copyAverage(month)"
                class="p-2 rounded-lg bg-gray-800 hover:bg-gray-750 text-gray-400 hover:text-white transition-all duration-200 cursor-pointer border border-gray-700/30 flex-shrink-0"
                title="Copy Monthly Averages"
              >
                <Check v-if="copiedId === month.id" class="w-4 h-4 text-emerald-400 animate-pulse" />
                <Copy v-else class="w-4 h-4 text-violet-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. WEEKLY VIEW (WITH HEVY HELPER) -->
    <div
      v-show="store.activeTab === 'weekly'"
      class="space-y-6"
      @touchstart="handleTouchStart"
      @touchend="handleTouchEnd"
    >
      <!-- WEEK NAVIGATION BAR -->
      <div v-if="store.activeWeek" class="flex items-center justify-between glass-card p-3 rounded-2xl max-w-sm mx-auto shadow-md">
        <!-- Prev week button -->
        <button 
          @click="store.goToPreviousWeek" 
          :disabled="store.selectedWeekIndex >= store.groupedWeeks.length - 1"
          class="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors duration-200"
        >
          <ChevronLeft class="w-5 h-5" />
        </button>

        <!-- Current week display label -->
        <div class="text-center select-none">
          <div class="text-xs text-violet-400 font-semibold uppercase tracking-wider">Active Week Focus</div>
          <div class="text-sm font-bold text-white mt-0.5">{{ store.activeWeek.label }}</div>
        </div>

        <!-- Next week button -->
        <button 
          @click="store.goToNextWeek" 
          :disabled="store.selectedWeekIndex <= 0"
          class="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors duration-200"
        >
          <ChevronRight class="w-5 h-5" />
        </button>
      </div>

      <!-- Touch Swipe tip -->
      <p class="text-center text-[10px] text-gray-500 select-none">💡 Swipe left/right on cards to navigate weeks</p>

      <!-- HEVY SYNC HELPER FOR ACTIVE WEEK -->
      <div 
        v-if="store.activeWeek" 
        class="glass-card p-4 rounded-3xl max-w-md mx-auto shadow-lg flex items-center justify-between border border-gray-800/40 hover:border-gray-700/60 transition-all duration-300"
      >
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-xl bg-violet-600/10 border border-violet-500/15 flex-shrink-0">
            <Copy class="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h4 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>Hevy Helper</span>
            </h4>
            <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1.5 text-[11px] text-gray-400">
              <span class="flex items-center gap-0.5">W: <strong class="text-white">{{ store.activeWeek.medianMass.toFixed(2) }} kg</strong></span>
              <span class="text-gray-700">|</span>
              <span class="flex items-center gap-0.5">Lean: <strong class="text-blue-400">{{ store.activeWeek.medianLeanMass.toFixed(2) }} kg</strong></span>
              <span class="text-gray-700">|</span>
              <span class="flex items-center gap-0.5">Fat: <strong class="text-emerald-400">{{ store.activeWeek.medianFat.toFixed(1) }}%</strong></span>
              <span class="text-gray-700">|</span>
              <span class="flex items-center gap-0.5">Fat kg: <strong class="text-amber-400">{{ store.activeWeek.medianFatMass.toFixed(2) }} kg</strong></span>
            </div>
          </div>
        </div>

        <button 
          @click="copyAverage(store.activeWeek)"
          class="p-2 px-3 rounded-xl bg-gray-800 hover:bg-gray-750 text-gray-400 hover:text-white transition-all duration-200 cursor-pointer border border-gray-700/30 flex-shrink-0 flex items-center gap-1.5 text-xs font-medium"
          title="Copy Weekly Medians"
        >
          <Check v-if="copiedId === store.activeWeek.id" class="w-4 h-4 text-emerald-400 animate-bounce" />
          <Copy v-else class="w-4 h-4 text-violet-400" />
          <span>{{ copiedId === store.activeWeek.id ? 'Copied!' : 'Copy' }}</span>
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Weight Average Chart -->
        <div class="glass-card p-4 sm:p-5 rounded-3xl shadow-lg">
          <h3 class="text-xs font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-violet-500 animate-pulse"></span> Weekly Weight: Median vs Average (kg)
          </h3>
          <div class="relative h-[240px] w-full">
            <canvas ref="weightAvgCanvas"></canvas>
          </div>
        </div>

        <!-- Lean Mass Average Chart -->
        <div class="glass-card p-4 sm:p-5 rounded-3xl shadow-lg">
          <h3 class="text-xs font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span> Weekly Lean Mass: Median vs Average (kg)
          </h3>
          <div class="relative h-[240px] w-full">
            <canvas ref="leanAvgCanvas"></canvas>
          </div>
        </div>

        <!-- Fat Average Chart -->
        <div class="glass-card p-4 sm:p-5 rounded-3xl shadow-lg">
          <h3 class="text-xs font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Weekly Body Fat: Median vs Average (%)
          </h3>
          <div class="relative h-[240px] w-full">
            <canvas ref="fatAvgCanvas"></canvas>
          </div>
        </div>

        <!-- Fat Mass Average Chart -->
        <div class="glass-card p-4 sm:p-5 rounded-3xl shadow-lg">
          <h3 class="text-xs font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> Weekly Fat Mass: Median vs Average (kg)
          </h3>
          <div class="relative h-[240px] w-full">
            <canvas ref="fatMassAvgCanvas"></canvas>
          </div>
        </div>
      </div>

      <!-- HEVY SYNC UTILITY -->
      <div class="glass-card p-5 rounded-3xl max-w-2xl mx-auto shadow-xl">
        <div class="flex items-center gap-2 mb-2">
          <Copy class="w-4.5 h-4.5 text-violet-400" />
          <h3 class="text-sm font-bold text-white">Hevy Sync Helper</h3>
        </div>
        <p class="text-xs text-gray-400 mb-4">
          Click the copy button to copy your weekly median values to enter them directly into your Hevy logs.
        </p>

        <!-- Averages List -->
        <div class="space-y-2.5">
          <div 
            v-for="week in store.groupedWeeks" 
            :key="week.id"
            class="flex items-center justify-between p-3 rounded-xl bg-gray-900/60 border border-gray-800/40 hover:border-gray-700/60 transition-colors duration-200"
          >
            <div>
              <div class="text-xs font-semibold text-white flex items-center gap-1.5">
                <span>{{ week.label }}</span>
              </div>
              <div class="text-[10px] text-gray-500 mt-0.5">Based on {{ week.logs.length }} records</div>
            </div>
            
            <div class="flex items-center gap-5 sm:gap-6 flex-wrap sm:flex-nowrap">
              <div class="text-right">
                <span class="text-[10px] text-gray-400 block leading-none">Med Weight</span>
                <span class="text-sm font-bold text-white mt-0.5 block">{{ week.medianMass.toFixed(2) }} kg</span>
              </div>
              <div class="text-right">
                <span class="text-[10px] text-blue-400 block leading-none">Med Lean</span>
                <span class="text-sm font-bold text-blue-400 mt-0.5 block">{{ week.medianLeanMass.toFixed(2) }} kg</span>
              </div>
              <div class="text-right">
                <span class="text-[10px] text-emerald-400 block leading-none">Med Fat %</span>
                <span class="text-sm font-bold text-emerald-400 mt-0.5 block">{{ week.medianFat.toFixed(1) }}%</span>
              </div>
              <div class="text-right">
                <span class="text-[10px] text-amber-400 block leading-none">Med Fat kg</span>
                <span class="text-sm font-bold text-amber-400 mt-0.5 block">{{ week.medianFatMass.toFixed(2) }} kg</span>
              </div>

              <!-- Copy trigger -->
              <button 
                @click="copyAverage(week)"
                class="p-2 rounded-lg bg-gray-800 hover:bg-gray-750 text-gray-400 hover:text-white transition-all duration-200 cursor-pointer border border-gray-700/30 flex-shrink-0"
                title="Copy Weekly Averages"
              >
                <Check v-if="copiedId === week.id" class="w-4 h-4 text-emerald-400 animate-pulse" />
                <Copy v-else class="w-4 h-4 text-violet-400" />
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { Scale, Plus, ChevronLeft, ChevronRight, Copy, Check } from 'lucide-vue-next';
import { Chart, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';
import { useBodyGraphStore } from '../stores/bodyGraph';

Chart.register(...registerables);

const store = useBodyGraphStore();

// Custom Chart.js Plugin to draw target goal lines without forcing axis re-scale
const goalLinePlugin = {
  id: 'goalLine',
  afterDraw: (chart) => {
    const goalOpts = chart.options.plugins?.goalLine;
    if (!goalOpts || !goalOpts.lines || goalOpts.lines.length === 0) return;
    
    const yScale = chart.scales.y;
    const ctx = chart.ctx;
    const xLeft = chart.scales.x.left;
    const xRight = chart.scales.x.right;
    
    goalOpts.lines.forEach(line => {
      const value = line.value;
      if (value === undefined || value === null) return;
      
      if (value >= yScale.min && value <= yScale.max) {
        const y = yScale.getPixelForValue(value);

        ctx.save();
        ctx.strokeStyle = line.color || '#8b5cf6';
        ctx.lineWidth = line.lineWidth || 1.5;

        if (line.dashed) {
          ctx.setLineDash([5, 5]); // Dashed line
        } else {
          ctx.setLineDash([]); // Solid line
        }

        ctx.beginPath();
        ctx.moveTo(xLeft, y);
        ctx.lineTo(xRight, y);
        ctx.stroke();

        ctx.fillStyle = line.textColor || line.color || '#a78bfa';
        ctx.font = '10px Outfit, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`${line.label || 'Goal'}: ${value}${goalOpts.unit || ''}`, xRight - 6, y - 3);
        ctx.restore();
      }
    });
  }
};



// Canvas references
const weightMonthlyCanvas = ref(null);
const leanMonthlyCanvas = ref(null);
const fatMonthlyCanvas = ref(null);
const fatMassMonthlyCanvas = ref(null);
const weightAvgCanvas = ref(null);
const leanAvgCanvas = ref(null);
const fatAvgCanvas = ref(null);
const fatMassAvgCanvas = ref(null);

// Chart references
let chartW_Monthly = null;
let chartL_Monthly = null;
let chartF_Monthly = null;
let chartFM_Monthly = null;
let chartW_Avg = null;
let chartL_Avg = null;
let chartF_Avg = null;
let chartFM_Avg = null;

const copiedId = ref(null);

// Copy Hevy text
const copyAverage = (item) => {
  const text = `Weight: ${item.medianMass.toFixed(2)}kg, Fat: ${item.medianFat.toFixed(1)}%`;
  navigator.clipboard.writeText(text).then(() => {
    copiedId.value = item.id;
    setTimeout(() => {
      copiedId.value = null;
    }, 2000);
  });
};
// Swipe controls variables
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

  // Horizontal delta check
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

const commonTimeScaleOptions = {
  type: 'time',
  time: {
    unit: 'month',
    tooltipFormat: 'MMM yyyy',
    displayFormats: {
      month: 'MMM yyyy'
    }
  },
  grid: { display: false },
  ticks: { color: '#9ca3af', font: { family: 'Outfit', size: 10 } }
};

const commonWeeklyTimeScaleOptions = {
  type: 'time',
  time: {
    unit: 'week',
    tooltipFormat: 'MMM d, yyyy',
    displayFormats: {
      week: 'MMM d'
    }
  },
  grid: { display: false },
  ticks: { color: '#9ca3af', font: { family: 'Outfit', size: 10 } }
};

// Generates multiple goal lines configuration based on paliers for weight, fat, lean, and fat mass charts
const getGoalLinesForMetric = (metricType) => {
  const paliers = store.paliersSorted;
  if (paliers.length === 0) return [];

  // Find active palier index
  const activePalier = store.activePalier;
  const activeIndex = activePalier ? paliers.findIndex(p => p.id === activePalier.id) : -1;

  return paliers.map((palier, index) => {
    let value = null;
    let label = `Palier ${index + 1}`;
    let baseColor = '';

    if (metricType === 'weight') {
      value = palier.mass;
      baseColor = '139, 92, 246'; // violet
    } else if (metricType === 'fat') {
      value = palier.fat;
      baseColor = '16, 185, 129'; // emerald
    } else if (metricType === 'lean') {
      value = (palier.mass !== null && palier.fat !== null)
        ? palier.mass - (palier.mass * (palier.fat / 100))
        : null;
      baseColor = '59, 130, 246'; // blue
    } else if (metricType === 'fat_mass') {
      value = (palier.mass !== null && palier.fat !== null)
        ? palier.mass * (palier.fat / 100)
        : null;
      baseColor = '245, 158, 11'; // amber
    }

    if (value === null) return null;

    // Design:
    // - Completed/validated paliers: solid green line, low opacity but solid.
    // - Uncompleted: dashed line.
    // - Closer to active palier => higher opacity.
    // We compute Rank-based opacity decay from activeIndex
    let dashed = !palier.validated;
    let opacity = 0.8;
    let strokeColor = '';

    if (palier.validated) {
      // Completed => beautiful solid green/emerald
      strokeColor = `rgba(16, 185, 129, 0.4)`;
    } else {
      // Uncompleted. Rank based decay.
      if (activeIndex !== -1) {
        const diff = Math.abs(index - activeIndex);
        opacity = Math.max(0.15, 0.8 - (diff * 0.25));
      }
      strokeColor = `rgba(${baseColor}, ${opacity})`;
    }

    return {
      value,
      label,
      color: strokeColor,
      textColor: strokeColor,
      dashed,
      lineWidth: activeIndex === index ? 2 : 1.2
    };
  }).filter(Boolean);
};

// Render Global Monthly Median Trend Charts
const updateMonthlyCharts = () => {
  if (store.groupedMonths.length === 0) return;

  nextTick(() => {
    const sortedMonths = [...store.groupedMonths].reverse();
    const medianWeights = sortedMonths.map(m => ({ x: m.startDate, y: m.medianMass }));
    const medianLeans = sortedMonths.map(m => ({ x: m.startDate, y: m.medianLeanMass }));
    const medianFats = sortedMonths.map(m => ({ x: m.startDate, y: m.medianFat }));
    const medianFatMasses = sortedMonths.map(m => ({ x: m.startDate, y: m.medianFatMass }));

    const averageWeights = sortedMonths.map(m => ({ x: m.startDate, y: m.avgMass }));
    const averageLeans = sortedMonths.map(m => ({ x: m.startDate, y: m.avgLeanMass }));
    const averageFats = sortedMonths.map(m => ({ x: m.startDate, y: m.avgFat }));
    const averageFatMasses = sortedMonths.map(m => ({ x: m.startDate, y: m.avgFatMass }));

    // 1. Monthly Median Weight
    if (weightMonthlyCanvas.value) {
      if (chartW_Monthly) chartW_Monthly.destroy();
      const ctx = weightMonthlyCanvas.value.getContext('2d');
      
      const strokeGrad = ctx.createLinearGradient(0, 0, 0, 300);
      strokeGrad.addColorStop(0, '#a78bfa');
      strokeGrad.addColorStop(1, '#4f46e5');
      
      const fillGrad = ctx.createLinearGradient(0, 0, 0, 250);
      fillGrad.addColorStop(0, 'rgba(139, 92, 246, 0.2)');
      fillGrad.addColorStop(1, 'rgba(139, 92, 246, 0)');

      chartW_Monthly = new Chart(ctx, {
        type: 'line',
        data: {
          datasets: [
            {
              label: 'Monthly Median',
              data: medianWeights,
              borderColor: strokeGrad,
              borderWidth: 3,
              pointBackgroundColor: '#ffffff',
              pointBorderColor: '#8b5cf6',
              pointBorderWidth: 2,
              pointRadius: 5,
              pointHoverRadius: 7,
              fill: true,
              backgroundColor: fillGrad,
              tension: 0.3
            },
            {
              label: 'Monthly Average',
              data: averageWeights,
              borderColor: 'rgba(167, 139, 250, 0.7)',
              borderWidth: 2,
              borderDash: [4, 4],
              pointBackgroundColor: '#ffffff',
              pointBorderColor: 'rgba(167, 139, 250, 0.7)',
              pointBorderWidth: 1.5,
              pointRadius: 3,
              pointHoverRadius: 5,
              fill: false,
              tension: 0.3
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              labels: {
                color: '#9ca3af',
                font: {
                  family: 'Outfit',
                  size: 11
                }
              }
            },
            tooltip: {
              backgroundColor: 'rgba(17, 24, 39, 0.95)',
              titleColor: '#9ca3af',
              bodyColor: '#ffffff',
              borderColor: 'rgba(139, 92, 246, 0.3)',
              borderWidth: 1,
              padding: 10,
              displayColors: true,
              mode: 'index',
              intersect: false,
              callbacks: {
                label: (context) => {
                  const dsLabel = context.dataset.label;
                  const val = context.parsed.y;
                  if (val === null || val === undefined) return '';
                  return ` ${dsLabel}: ${val.toFixed(2)} kg`;
                }
              }
            },
            goalLine: {
              lines: getGoalLinesForMetric('weight'),
              unit: ' kg'
            }
          },
          scales: {
            y: {
              grid: { color: 'rgba(75, 85, 99, 0.08)' },
              ticks: { color: '#9ca3af', font: { family: 'Outfit', size: 11 } }
            },
            x: commonTimeScaleOptions
          }
        },
        plugins: [goalLinePlugin]
      });
    }

    // 2. Monthly Median Lean Mass
    if (leanMonthlyCanvas.value) {
      if (chartL_Monthly) chartL_Monthly.destroy();
      const ctx = leanMonthlyCanvas.value.getContext('2d');
      
      const strokeGrad = ctx.createLinearGradient(0, 0, 0, 300);
      strokeGrad.addColorStop(0, '#60a5fa');
      strokeGrad.addColorStop(1, '#2563eb');
      
      const fillGrad = ctx.createLinearGradient(0, 0, 0, 250);
      fillGrad.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
      fillGrad.addColorStop(1, 'rgba(59, 130, 246, 0)');

      chartL_Monthly = new Chart(ctx, {
        type: 'line',
        data: {
          datasets: [
            {
              label: 'Monthly Median',
              data: medianLeans,
              borderColor: strokeGrad,
              borderWidth: 3,
              pointBackgroundColor: '#ffffff',
              pointBorderColor: '#3b82f6',
              pointBorderWidth: 2,
              pointRadius: 5,
              pointHoverRadius: 7,
              fill: true,
              backgroundColor: fillGrad,
              tension: 0.3
            },
            {
              label: 'Monthly Average',
              data: averageLeans,
              borderColor: 'rgba(147, 197, 253, 0.7)',
              borderWidth: 2,
              borderDash: [4, 4],
              pointBackgroundColor: '#ffffff',
              pointBorderColor: 'rgba(147, 197, 253, 0.7)',
              pointBorderWidth: 1.5,
              pointRadius: 3,
              pointHoverRadius: 5,
              fill: false,
              tension: 0.3
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              labels: {
                color: '#9ca3af',
                font: {
                  family: 'Outfit',
                  size: 11
                }
              }
            },
            tooltip: {
              backgroundColor: 'rgba(17, 24, 39, 0.95)',
              titleColor: '#9ca3af',
              bodyColor: '#ffffff',
              borderColor: 'rgba(59, 130, 246, 0.3)',
              borderWidth: 1,
              padding: 10,
              displayColors: true,
              mode: 'index',
              intersect: false,
              callbacks: {
                label: (context) => {
                  const dsLabel = context.dataset.label;
                  const val = context.parsed.y;
                  if (val === null || val === undefined) return '';
                  return ` ${dsLabel}: ${val.toFixed(2)} kg`;
                }
              }
            },
            goalLine: {
              lines: getGoalLinesForMetric('lean'),
              unit: ' kg'
            }
          },
          scales: {
            y: {
              grid: { color: 'rgba(75, 85, 99, 0.08)' },
              ticks: { color: '#9ca3af', font: { family: 'Outfit', size: 11 } }
            },
            x: commonTimeScaleOptions
          }
        },
        plugins: [goalLinePlugin]
      });
    }

    // 3. Monthly Median Body Fat (%)
    if (fatMonthlyCanvas.value) {
      if (chartF_Monthly) chartF_Monthly.destroy();
      const ctx = fatMonthlyCanvas.value.getContext('2d');
      
      const strokeGrad = ctx.createLinearGradient(0, 0, 0, 300);
      strokeGrad.addColorStop(0, '#34d399');
      strokeGrad.addColorStop(1, '#059669');
      
      const fillGrad = ctx.createLinearGradient(0, 0, 0, 250);
      fillGrad.addColorStop(0, 'rgba(16, 185, 129, 0.2)');
      fillGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');

      chartF_Monthly = new Chart(ctx, {
        type: 'line',
        data: {
          datasets: [
            {
              label: 'Monthly Median',
              data: medianFats,
              borderColor: strokeGrad,
              borderWidth: 3,
              pointBackgroundColor: '#ffffff',
              pointBorderColor: '#10b981',
              pointBorderWidth: 2,
              pointRadius: 5,
              pointHoverRadius: 7,
              fill: true,
              backgroundColor: fillGrad,
              tension: 0.3
            },
            {
              label: 'Monthly Average',
              data: averageFats,
              borderColor: 'rgba(110, 231, 183, 0.7)',
              borderWidth: 2,
              borderDash: [4, 4],
              pointBackgroundColor: '#ffffff',
              pointBorderColor: 'rgba(110, 231, 183, 0.7)',
              pointBorderWidth: 1.5,
              pointRadius: 3,
              pointHoverRadius: 5,
              fill: false,
              tension: 0.3
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              labels: {
                color: '#9ca3af',
                font: {
                  family: 'Outfit',
                  size: 11
                }
              }
            },
            tooltip: {
              backgroundColor: 'rgba(17, 24, 39, 0.95)',
              titleColor: '#9ca3af',
              bodyColor: '#ffffff',
              borderColor: 'rgba(16, 185, 129, 0.3)',
              borderWidth: 1,
              padding: 10,
              displayColors: true,
              mode: 'index',
              intersect: false,
              callbacks: {
                label: (context) => {
                  const dsLabel = context.dataset.label;
                  const val = context.parsed.y;
                  if (val === null || val === undefined) return '';
                  return ` ${dsLabel}: ${val.toFixed(1)}%`;
                }
              }
            },
            goalLine: {
              lines: getGoalLinesForMetric('fat'),
              unit: '%'
            }
          },
          scales: {
            y: {
              grid: { color: 'rgba(75, 85, 99, 0.08)' },
              ticks: { color: '#9ca3af', font: { family: 'Outfit', size: 11 } }
            },
            x: commonTimeScaleOptions
          }
        },
        plugins: [goalLinePlugin]
      });
    }

    // 4. Monthly Median Fat Mass (kg)
    if (fatMassMonthlyCanvas.value) {
      if (chartFM_Monthly) chartFM_Monthly.destroy();
      const ctx = fatMassMonthlyCanvas.value.getContext('2d');
      
      const strokeGrad = ctx.createLinearGradient(0, 0, 0, 300);
      strokeGrad.addColorStop(0, '#fbbf24');
      strokeGrad.addColorStop(1, '#d97706');
      
      const fillGrad = ctx.createLinearGradient(0, 0, 0, 250);
      fillGrad.addColorStop(0, 'rgba(245, 158, 11, 0.2)');
      fillGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');

      chartFM_Monthly = new Chart(ctx, {
        type: 'line',
        data: {
          datasets: [
            {
              label: 'Monthly Median',
              data: medianFatMasses,
              borderColor: strokeGrad,
              borderWidth: 3,
              pointBackgroundColor: '#ffffff',
              pointBorderColor: '#f59e0b',
              pointBorderWidth: 2,
              pointRadius: 5,
              pointHoverRadius: 7,
              fill: true,
              backgroundColor: fillGrad,
              tension: 0.3
            },
            {
              label: 'Monthly Average',
              data: averageFatMasses,
              borderColor: 'rgba(252, 211, 77, 0.7)',
              borderWidth: 2,
              borderDash: [4, 4],
              pointBackgroundColor: '#ffffff',
              pointBorderColor: 'rgba(252, 211, 77, 0.7)',
              pointBorderWidth: 1.5,
              pointRadius: 3,
              pointHoverRadius: 5,
              fill: false,
              tension: 0.3
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              labels: {
                color: '#9ca3af',
                font: {
                  family: 'Outfit',
                  size: 11
                }
              }
            },
            tooltip: {
              backgroundColor: 'rgba(17, 24, 39, 0.95)',
              titleColor: '#9ca3af',
              bodyColor: '#ffffff',
              borderColor: 'rgba(245, 158, 11, 0.3)',
              borderWidth: 1,
              padding: 10,
              displayColors: true,
              mode: 'index',
              intersect: false,
              callbacks: {
                label: (context) => {
                  const dsLabel = context.dataset.label;
                  const val = context.parsed.y;
                  if (val === null || val === undefined) return '';
                  return ` ${dsLabel}: ${val.toFixed(2)} kg`;
                }
              }
            },
            goalLine: {
              lines: getGoalLinesForMetric('fat_mass'),
              unit: ' kg'
            }
          },
          scales: {
            y: {
              grid: { color: 'rgba(75, 85, 99, 0.08)' },
              ticks: { color: '#9ca3af', font: { family: 'Outfit', size: 11 } }
            },
            x: commonTimeScaleOptions
          }
        },
        plugins: [goalLinePlugin]
      });
    }
  });
};

// Render Global Weekly Median Trend Charts
const updateWeeklyCharts = () => {
  if (store.groupedWeeks.length === 0) return;

  nextTick(() => {
    const sortedWeeks = [...store.groupedWeeks].reverse();
    const medianWeights = sortedWeeks.map(w => ({ x: w.monday, y: w.medianMass }));
    const medianLeans = sortedWeeks.map(w => ({ x: w.monday, y: w.medianLeanMass }));
    const medianFats = sortedWeeks.map(w => ({ x: w.monday, y: w.medianFat }));
    const medianFatMasses = sortedWeeks.map(w => ({ x: w.monday, y: w.medianFatMass }));

    const averageWeights = sortedWeeks.map(w => ({ x: w.monday, y: w.avgMass }));
    const averageLeans = sortedWeeks.map(w => ({ x: w.monday, y: w.avgLeanMass }));
    const averageFats = sortedWeeks.map(w => ({ x: w.monday, y: w.avgFat }));
    const averageFatMasses = sortedWeeks.map(w => ({ x: w.monday, y: w.avgFatMass }));

    // 1. Weekly Median Weight
    if (weightAvgCanvas.value) {
      if (chartW_Avg) chartW_Avg.destroy();
      const ctx = weightAvgCanvas.value.getContext('2d');
      
      const strokeGrad = ctx.createLinearGradient(0, 0, 0, 300);
      strokeGrad.addColorStop(0, '#a78bfa');
      strokeGrad.addColorStop(1, '#4f46e5');
      
      const fillGrad = ctx.createLinearGradient(0, 0, 0, 250);
      fillGrad.addColorStop(0, 'rgba(139, 92, 246, 0.2)');
      fillGrad.addColorStop(1, 'rgba(139, 92, 246, 0)');

      chartW_Avg = new Chart(ctx, {
        type: 'line',
        data: {
          datasets: [
            {
              label: 'Weekly Median',
              data: medianWeights,
              borderColor: strokeGrad,
              borderWidth: 3,
              pointBackgroundColor: '#ffffff',
              pointBorderColor: '#8b5cf6',
              pointBorderWidth: 2,
              pointRadius: 5,
              pointHoverRadius: 7,
              fill: true,
              backgroundColor: fillGrad,
              tension: 0.3
            },
            {
              label: 'Weekly Average',
              data: averageWeights,
              borderColor: 'rgba(167, 139, 250, 0.7)',
              borderWidth: 2,
              borderDash: [4, 4],
              pointBackgroundColor: '#ffffff',
              pointBorderColor: 'rgba(167, 139, 250, 0.7)',
              pointBorderWidth: 1.5,
              pointRadius: 3,
              pointHoverRadius: 5,
              fill: false,
              tension: 0.3
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              labels: {
                color: '#9ca3af',
                font: {
                  family: 'Outfit',
                  size: 11
                }
              }
            },
            tooltip: {
              backgroundColor: 'rgba(17, 24, 39, 0.95)',
              titleColor: '#9ca3af',
              bodyColor: '#ffffff',
              borderColor: 'rgba(139, 92, 246, 0.3)',
              borderWidth: 1,
              padding: 10,
              displayColors: true,
              mode: 'index',
              intersect: false,
              callbacks: {
                label: (context) => {
                  const dsLabel = context.dataset.label;
                  const val = context.parsed.y;
                  if (val === null || val === undefined) return '';
                  return ` ${dsLabel}: ${val.toFixed(2)} kg`;
                }
              }
            },
            goalLine: {
              lines: getGoalLinesForMetric('weight'),
              unit: ' kg'
            }
          },
          scales: {
            y: {
              grid: { color: 'rgba(75, 85, 99, 0.08)' },
              ticks: { color: '#9ca3af', font: { family: 'Outfit', size: 11 } }
            },
            x: commonWeeklyTimeScaleOptions
          }
        },
        plugins: [goalLinePlugin]
      });
    }

    // 2. Weekly Median Lean Mass
    if (leanAvgCanvas.value) {
      if (chartL_Avg) chartL_Avg.destroy();
      const ctx = leanAvgCanvas.value.getContext('2d');
      
      const strokeGrad = ctx.createLinearGradient(0, 0, 0, 300);
      strokeGrad.addColorStop(0, '#60a5fa');
      strokeGrad.addColorStop(1, '#2563eb');
      
      const fillGrad = ctx.createLinearGradient(0, 0, 0, 250);
      fillGrad.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
      fillGrad.addColorStop(1, 'rgba(59, 130, 246, 0)');

      chartL_Avg = new Chart(ctx, {
        type: 'line',
        data: {
          datasets: [
            {
              label: 'Weekly Median',
              data: medianLeans,
              borderColor: strokeGrad,
              borderWidth: 3,
              pointBackgroundColor: '#ffffff',
              pointBorderColor: '#3b82f6',
              pointBorderWidth: 2,
              pointRadius: 5,
              pointHoverRadius: 7,
              fill: true,
              backgroundColor: fillGrad,
              tension: 0.3
            },
            {
              label: 'Weekly Average',
              data: averageLeans,
              borderColor: 'rgba(147, 197, 253, 0.7)',
              borderWidth: 2,
              borderDash: [4, 4],
              pointBackgroundColor: '#ffffff',
              pointBorderColor: 'rgba(147, 197, 253, 0.7)',
              pointBorderWidth: 1.5,
              pointRadius: 3,
              pointHoverRadius: 5,
              fill: false,
              tension: 0.3
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              labels: {
                color: '#9ca3af',
                font: {
                  family: 'Outfit',
                  size: 11
                }
              }
            },
            tooltip: {
              backgroundColor: 'rgba(17, 24, 39, 0.95)',
              titleColor: '#9ca3af',
              bodyColor: '#ffffff',
              borderColor: 'rgba(59, 130, 246, 0.3)',
              borderWidth: 1,
              padding: 10,
              displayColors: true,
              mode: 'index',
              intersect: false,
              callbacks: {
                label: (context) => {
                  const dsLabel = context.dataset.label;
                  const val = context.parsed.y;
                  if (val === null || val === undefined) return '';
                  return ` ${dsLabel}: ${val.toFixed(2)} kg`;
                }
              }
            },
            goalLine: {
              lines: getGoalLinesForMetric('lean'),
              unit: ' kg'
            }
          },
          scales: {
            y: {
              grid: { color: 'rgba(75, 85, 99, 0.08)' },
              ticks: { color: '#9ca3af', font: { family: 'Outfit', size: 11 } }
            },
            x: commonWeeklyTimeScaleOptions
          }
        },
        plugins: [goalLinePlugin]
      });
    }

    // 3. Weekly Median Body Fat (%)
    if (fatAvgCanvas.value) {
      if (chartF_Avg) chartF_Avg.destroy();
      const ctx = fatAvgCanvas.value.getContext('2d');
      
      const strokeGrad = ctx.createLinearGradient(0, 0, 0, 300);
      strokeGrad.addColorStop(0, '#34d399');
      strokeGrad.addColorStop(1, '#059669');
      
      const fillGrad = ctx.createLinearGradient(0, 0, 0, 250);
      fillGrad.addColorStop(0, 'rgba(16, 185, 129, 0.2)');
      fillGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');

      chartF_Avg = new Chart(ctx, {
        type: 'line',
        data: {
          datasets: [
            {
              label: 'Weekly Median',
              data: medianFats,
              borderColor: strokeGrad,
              borderWidth: 3,
              pointBackgroundColor: '#ffffff',
              pointBorderColor: '#10b981',
              pointBorderWidth: 2,
              pointRadius: 5,
              pointHoverRadius: 7,
              fill: true,
              backgroundColor: fillGrad,
              tension: 0.3
            },
            {
              label: 'Weekly Average',
              data: averageFats,
              borderColor: 'rgba(110, 231, 183, 0.7)',
              borderWidth: 2,
              borderDash: [4, 4],
              pointBackgroundColor: '#ffffff',
              pointBorderColor: 'rgba(110, 231, 183, 0.7)',
              pointBorderWidth: 1.5,
              pointRadius: 3,
              pointHoverRadius: 5,
              fill: false,
              tension: 0.3
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              labels: {
                color: '#9ca3af',
                font: {
                  family: 'Outfit',
                  size: 11
                }
              }
            },
            tooltip: {
              backgroundColor: 'rgba(17, 24, 39, 0.95)',
              titleColor: '#9ca3af',
              bodyColor: '#ffffff',
              borderColor: 'rgba(16, 185, 129, 0.3)',
              borderWidth: 1,
              padding: 10,
              displayColors: true,
              mode: 'index',
              intersect: false,
              callbacks: {
                label: (context) => {
                  const dsLabel = context.dataset.label;
                  const val = context.parsed.y;
                  if (val === null || val === undefined) return '';
                  return ` ${dsLabel}: ${val.toFixed(1)}%`;
                }
              }
            },
            goalLine: {
              lines: getGoalLinesForMetric('fat'),
              unit: '%'
            }
          },
          scales: {
            y: {
              grid: { color: 'rgba(75, 85, 99, 0.08)' },
              ticks: { color: '#9ca3af', font: { family: 'Outfit', size: 11 } }
            },
            x: commonWeeklyTimeScaleOptions
          }
        },
        plugins: [goalLinePlugin]
      });
    }

    // 4. Weekly Median Fat Mass (kg)
    if (fatMassAvgCanvas.value) {
      if (chartFM_Avg) chartFM_Avg.destroy();
      const ctx = fatMassAvgCanvas.value.getContext('2d');
      
      const strokeGrad = ctx.createLinearGradient(0, 0, 0, 300);
      strokeGrad.addColorStop(0, '#fbbf24');
      strokeGrad.addColorStop(1, '#d97706');
      
      const fillGrad = ctx.createLinearGradient(0, 0, 0, 250);
      fillGrad.addColorStop(0, 'rgba(245, 158, 11, 0.2)');
      fillGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');

      chartFM_Avg = new Chart(ctx, {
        type: 'line',
        data: {
          datasets: [
            {
              label: 'Weekly Median',
              data: medianFatMasses,
              borderColor: strokeGrad,
              borderWidth: 3,
              pointBackgroundColor: '#ffffff',
              pointBorderColor: '#f59e0b',
              pointBorderWidth: 2,
              pointRadius: 5,
              pointHoverRadius: 7,
              fill: true,
              backgroundColor: fillGrad,
              tension: 0.3
            },
            {
              label: 'Weekly Average',
              data: averageFatMasses,
              borderColor: 'rgba(252, 211, 77, 0.7)',
              borderWidth: 2,
              borderDash: [4, 4],
              pointBackgroundColor: '#ffffff',
              pointBorderColor: 'rgba(252, 211, 77, 0.7)',
              pointBorderWidth: 1.5,
              pointRadius: 3,
              pointHoverRadius: 5,
              fill: false,
              tension: 0.3
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              labels: {
                color: '#9ca3af',
                font: {
                  family: 'Outfit',
                  size: 11
                }
              }
            },
            tooltip: {
              backgroundColor: 'rgba(17, 24, 39, 0.95)',
              titleColor: '#9ca3af',
              bodyColor: '#ffffff',
              borderColor: 'rgba(245, 158, 11, 0.3)',
              borderWidth: 1,
              padding: 10,
              displayColors: true,
              mode: 'index',
              intersect: false,
              callbacks: {
                label: (context) => {
                  const dsLabel = context.dataset.label;
                  const val = context.parsed.y;
                  if (val === null || val === undefined) return '';
                  return ` ${dsLabel}: ${val.toFixed(2)} kg`;
                }
              }
            },
            goalLine: {
              lines: getGoalLinesForMetric('fat_mass'),
              unit: ' kg'
            }
          },
          scales: {
            y: {
              grid: { color: 'rgba(75, 85, 99, 0.08)' },
              ticks: { color: '#9ca3af', font: { family: 'Outfit', size: 11 } }
            },
            x: commonWeeklyTimeScaleOptions
          }
        },
        plugins: [goalLinePlugin]
      });
    }
  });
};

const drawAll = () => {
  if (store.activeTab === 'monthly') {
    updateMonthlyCharts();
  } else if (store.activeTab === 'weekly') {
    updateWeeklyCharts();
  }
};

watch([() => store.logs, () => store.activeTab, () => store.paliers], () => {
  drawAll();
}, { deep: true });

onMounted(() => {
  drawAll();
});

onUnmounted(() => {
  if (chartW_Monthly) chartW_Monthly.destroy();
  if (chartL_Monthly) chartL_Monthly.destroy();
  if (chartF_Monthly) chartF_Monthly.destroy();
  if (chartFM_Monthly) chartFM_Monthly.destroy();
  if (chartW_Avg) chartW_Avg.destroy();
  if (chartL_Avg) chartL_Avg.destroy();
  if (chartF_Avg) chartF_Avg.destroy();
  if (chartFM_Avg) chartFM_Avg.destroy();
});
</script>

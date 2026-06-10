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
    <!-- SUB-TOGGLE: DAILY VS WEEKLY -->
    <div class="flex gap-2 p-1 rounded-xl bg-gray-900/40 border border-gray-800/50 max-w-[280px]">
      <button 
        @click="store.dashboardMode = 'daily'"
        :class="[
          'flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer',
          store.dashboardMode === 'daily' 
            ? 'bg-violet-600/30 text-violet-200 border border-violet-500/20' 
            : 'text-gray-400 hover:text-gray-200'
        ]"
      >
        Week Focus (Daily)
      </button>
      <button 
        @click="store.dashboardMode = 'weekly'"
        :class="[
          'flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer',
          store.dashboardMode === 'weekly' 
            ? 'bg-violet-600/30 text-violet-200 border border-violet-500/20' 
            : 'text-gray-400 hover:text-gray-200'
        ]"
      >
        All-Time (Averages)
      </button>
    </div>

    <!-- 1. DAILY FOCUS VIEW -->
    <div 
      v-show="store.dashboardMode === 'daily'" 
      class="space-y-4"
      @touchstart="handleTouchStart"
      @touchend="handleTouchEnd"
    >
      <!-- WEEK NAVIGATION BAR -->
      <div v-if="store.activeWeek" class="flex items-center justify-between glass-card p-3 rounded-2xl max-w-sm mx-auto shadow-md">
        <!-- Prev week button -->
        <button 
          @click="store.goToPreviousWeek" 
          :disabled="store.selectedWeekIndex >= store.groupedWeeks.length - 1"
          class="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
        >
          <ChevronLeft class="w-5 h-5" />
        </button>

        <!-- Current week display label -->
        <div class="text-center">
          <div class="text-xs text-violet-400 font-semibold uppercase tracking-wider">Active Week</div>
          <div class="text-sm font-bold text-white mt-0.5">{{ store.activeWeek.label }}</div>
        </div>

        <!-- Next week button -->
        <button 
          @click="store.goToNextWeek" 
          :disabled="store.selectedWeekIndex <= 0"
          class="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
        >
          <ChevronRight class="w-5 h-5" />
        </button>
      </div>

      <!-- Gestures tip (mobile only) -->
      <p class="text-center text-[10px] text-gray-500 hidden sm:block md:hidden">💡 Tip: Swipe left/right on the cards to navigate weeks</p>

      <!-- Charts grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Weight Daily Chart -->
        <div class="glass-card p-4 sm:p-5 rounded-3xl relative">
          <h3 class="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-violet-500"></span> Daily Weight Fluctuations (kg)
          </h3>
          <div class="relative h-[250px] w-full">
            <canvas ref="weightDailyCanvas"></canvas>
          </div>
        </div>

        <!-- Fat Daily Chart -->
        <div class="glass-card p-4 sm:p-5 rounded-3xl relative">
          <h3 class="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Daily Body Fat Evolution (%)
          </h3>
          <div class="relative h-[250px] w-full">
            <canvas ref="fatDailyCanvas"></canvas>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. ALL-TIME WEEKLY AVERAGES VIEW -->
    <div v-show="store.dashboardMode === 'weekly'" class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Weight Average Chart -->
        <div class="glass-card p-4 sm:p-5 rounded-3xl">
          <h3 class="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-violet-500 animate-pulse"></span> Long-Term Weight Averages (kg)
          </h3>
          <div class="relative h-[250px] w-full">
            <canvas ref="weightAvgCanvas"></canvas>
          </div>
        </div>

        <!-- Fat Average Chart -->
        <div class="glass-card p-4 sm:p-5 rounded-3xl">
          <h3 class="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span> Long-Term Fat Averages (%)
          </h3>
          <div class="relative h-[250px] w-full">
            <canvas ref="fatAvgCanvas"></canvas>
          </div>
        </div>
      </div>

      <!-- COPYABLE HEVY AVERAGES TABLE -->
      <div class="glass-card p-5 rounded-3xl max-w-2xl">
        <div class="flex items-center gap-2 mb-4">
          <Copy class="w-4.5 h-4.5 text-violet-400" />
          <h3 class="text-sm font-semibold text-white">Hevy Sync helper (Weekly Averages)</h3>
        </div>
        <p class="text-xs text-gray-400 mb-4">
          Click copy on Sunday to copy your calculated averages and easily input them into your Hevy logs.
        </p>

        <!-- Averages Table Grid -->
        <div class="space-y-2.5">
          <div 
            v-for="week in store.groupedWeeks" 
            :key="week.id"
            class="flex items-center justify-between p-3 rounded-xl bg-gray-900/60 border border-gray-800/40"
          >
            <div>
              <div class="text-xs font-semibold text-white">{{ week.label }}</div>
              <div class="text-[10px] text-gray-500 mt-0.5">Based on {{ week.logs.length }} records</div>
            </div>
            
            <div class="flex items-center gap-6">
              <div class="text-right">
                <span class="text-[10px] text-gray-400 block leading-none">Avg Weight</span>
                <span class="text-sm font-bold text-white mt-0.5 block">{{ week.avgMass.toFixed(2) }} kg</span>
              </div>
              <div class="text-right">
                <span class="text-[10px] text-gray-400 block leading-none">Avg Fat</span>
                <span class="text-sm font-bold text-white mt-0.5 block">{{ week.avgFat.toFixed(1) }}%</span>
              </div>

              <!-- Copy trigger -->
              <button 
                @click="copyWeeklyAverage(week)"
                class="p-2 rounded-lg bg-gray-800 hover:bg-gray-750 text-gray-400 hover:text-white transition-all duration-200 cursor-pointer"
                title="Copy Averages"
              >
                <Check v-if="copiedWeekId === week.id" class="w-4 h-4 text-emerald-400" />
                <Copy v-else class="w-4 h-4" />
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
import { useBodyGraphStore } from '../stores/bodyGraph';

Chart.register(...registerables);

const store = useBodyGraphStore();

// Canvas elements reference
const weightDailyCanvas = ref(null);
const fatDailyCanvas = ref(null);
const weightAvgCanvas = ref(null);
const fatAvgCanvas = ref(null);

// Chart references
let chartW_Daily = null;
let chartF_Daily = null;
let chartW_Avg = null;
let chartF_Avg = null;

const copiedWeekId = ref(null);

// Copy Hevy stats
const copyWeeklyAverage = (week) => {
  const text = `Weight: ${week.avgMass.toFixed(2)}kg, Fat: ${week.avgFat.toFixed(1)}%`;
  navigator.clipboard.writeText(text).then(() => {
    copiedWeekId.value = week.id;
    setTimeout(() => {
      copiedWeekId.value = null;
    }, 2000);
  });
};

// Touch Swipes Tracking
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

  // Verify swipe was horizontal and exceeded threshold
  if (Math.abs(deltaX) > 60 && Math.abs(deltaY) < 40) {
    if (deltaX > 0) {
      // Swipe Right -> Older week
      store.goToPreviousWeek();
    } else {
      // Swipe Left -> Newer week
      store.goToNextWeek();
    }
  }
};

// Render Daily Week Detail Charts
const updateDailyCharts = () => {
  if (store.dashboardMode !== 'daily' || !store.activeWeek) return;

  nextTick(() => {
    // 7 Days weekdays layout
    const daysLabel = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    // Fill arrays with null
    const dailyWeights = Array(7).fill(null);
    const dailyFats = Array(7).fill(null);

    // Map logs to day slots (Sunday=0 -> index 6, Monday=1 -> index 0)
    for (const log of store.activeWeek.logs) {
      const d = new Date(log.date);
      // getDay() gives 0 for Sunday. We want Monday=0...Sunday=6
      const dayIndex = (d.getDay() + 6) % 7;
      
      // Store the most recent log if duplicates exist on the same day
      if (dailyWeights[dayIndex] === null) {
        dailyWeights[dayIndex] = log.mass;
        dailyFats[dayIndex] = log.body_fat;
      }
    }

    // 1. Draw daily weight
    if (weightDailyCanvas.value) {
      if (chartW_Daily) chartW_Daily.destroy();
      const ctx = weightDailyCanvas.value.getContext('2d');
      
      const strokeGrad = ctx.createLinearGradient(0, 0, 0, 300);
      strokeGrad.addColorStop(0, '#a78bfa');
      strokeGrad.addColorStop(1, '#6366f1');
      
      const fillGrad = ctx.createLinearGradient(0, 0, 0, 250);
      fillGrad.addColorStop(0, 'rgba(139, 92, 246, 0.2)');
      fillGrad.addColorStop(1, 'rgba(139, 92, 246, 0)');

      chartW_Daily = new Chart(ctx, {
        type: 'line',
        data: {
          labels: daysLabel,
          datasets: [{
            data: dailyWeights,
            borderColor: strokeGrad,
            borderWidth: 3,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: '#8b5cf6',
            pointBorderWidth: 2,
            pointRadius: 4,
            spanGaps: true, // Seamlessly connect points over missing days
            fill: true,
            backgroundColor: fillGrad,
            tension: 0.25
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(17, 24, 39, 0.95)',
              titleColor: '#9ca3af',
              bodyColor: '#ffffff',
              borderColor: 'rgba(139, 92, 246, 0.3)',
              borderWidth: 1,
              padding: 10,
              displayColors: false,
              callbacks: {
                label: (context) => ` ${context.parsed.y} kg`
              }
            }
          },
          scales: {
            y: {
              grid: { color: 'rgba(75, 85, 99, 0.08)' },
              ticks: { color: '#9ca3af', font: { family: 'Outfit', size: 11 } }
            },
            x: {
              grid: { display: false },
              ticks: { color: '#9ca3af', font: { family: 'Outfit', size: 11 } }
            }
          }
        }
      });
    }

    // 2. Draw daily fat
    if (fatDailyCanvas.value) {
      if (chartF_Daily) chartF_Daily.destroy();
      const ctx = fatDailyCanvas.value.getContext('2d');
      
      const strokeGrad = ctx.createLinearGradient(0, 0, 0, 300);
      strokeGrad.addColorStop(0, '#34d399');
      strokeGrad.addColorStop(1, '#059669');
      
      const fillGrad = ctx.createLinearGradient(0, 0, 0, 250);
      fillGrad.addColorStop(0, 'rgba(16, 185, 129, 0.2)');
      fillGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');

      chartF_Daily = new Chart(ctx, {
        type: 'line',
        data: {
          labels: daysLabel,
          datasets: [{
            data: dailyFats,
            borderColor: strokeGrad,
            borderWidth: 3,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: '#10b981',
            pointBorderWidth: 2,
            pointRadius: 4,
            spanGaps: true,
            fill: true,
            backgroundColor: fillGrad,
            tension: 0.25
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(17, 24, 39, 0.95)',
              titleColor: '#9ca3af',
              bodyColor: '#ffffff',
              borderColor: 'rgba(16, 185, 129, 0.3)',
              borderWidth: 1,
              padding: 10,
              displayColors: false,
              callbacks: {
                label: (context) => ` ${context.parsed.y} %`
              }
            }
          },
          scales: {
            y: {
              grid: { color: 'rgba(75, 85, 99, 0.08)' },
              ticks: { color: '#9ca3af', font: { family: 'Outfit', size: 11 } }
            },
            x: {
              grid: { display: false },
              ticks: { color: '#9ca3af', font: { family: 'Outfit', size: 11 } }
            }
          }
        }
      });
    }
  });
};

// Render Global Weekly Average Trend Charts
const updateWeeklyCharts = () => {
  if (store.dashboardMode !== 'weekly' || store.groupedWeeks.length === 0) return;

  nextTick(() => {
    // Chronological order (oldest week first, left-to-right)
    const sortedWeeks = [...store.groupedWeeks].reverse();
    const labels = sortedWeeks.map(w => w.label);
    const avgWeights = sortedWeeks.map(w => w.avgMass);
    const avgFats = sortedWeeks.map(w => w.avgFat);

    // 1. Draw average weight trends
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
          labels,
          datasets: [{
            data: avgWeights,
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
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(17, 24, 39, 0.95)',
              titleColor: '#9ca3af',
              bodyColor: '#ffffff',
              borderColor: 'rgba(139, 92, 246, 0.3)',
              borderWidth: 1,
              padding: 10,
              displayColors: false,
              callbacks: {
                label: (context) => ` Avg: ${context.parsed.y.toFixed(2)} kg`
              }
            }
          },
          scales: {
            y: {
              grid: { color: 'rgba(75, 85, 99, 0.08)' },
              ticks: { color: '#9ca3af', font: { family: 'Outfit', size: 11 } }
            },
            x: {
              grid: { display: false },
              ticks: { color: '#9ca3af', font: { family: 'Outfit', size: 10 } }
            }
          }
        }
      });
    }

    // 2. Draw average fat trends
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
          labels,
          datasets: [{
            data: avgFats,
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
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(17, 24, 39, 0.95)',
              titleColor: '#9ca3af',
              bodyColor: '#ffffff',
              borderColor: 'rgba(16, 185, 129, 0.3)',
              borderWidth: 1,
              padding: 10,
              displayColors: false,
              callbacks: {
                label: (context) => ` Avg: ${context.parsed.y.toFixed(1)} %`
              }
            }
          },
          scales: {
            y: {
              grid: { color: 'rgba(75, 85, 99, 0.08)' },
              ticks: { color: '#9ca3af', font: { family: 'Outfit', size: 11 } }
            },
            x: {
              grid: { display: false },
              ticks: { color: '#9ca3af', font: { family: 'Outfit', size: 10 } }
            }
          }
        }
      });
    }
  });
};

const triggerChartDraws = () => {
  if (store.dashboardMode === 'daily') {
    updateDailyCharts();
  } else {
    updateWeeklyCharts();
  }
};

// Watchers mapping to update chart rendering
watch([() => store.logs, () => store.dashboardMode, () => store.selectedWeekIndex], () => {
  triggerChartDraws();
}, { deep: true });

onMounted(() => {
  triggerChartDraws();
});

onUnmounted(() => {
  if (chartW_Daily) chartW_Daily.destroy();
  if (chartF_Daily) chartF_Daily.destroy();
  if (chartW_Avg) chartW_Avg.destroy();
  if (chartF_Avg) chartF_Avg.destroy();
});
</script>

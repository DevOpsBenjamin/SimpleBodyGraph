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

  <div v-else class="space-y-8">
    
    <!-- 1. DAILY FOCUS SECTION (WEEK FOCUS) -->
    <div 
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

      <!-- Touch Swipe Swipe tip (mobile only) -->
      <p class="text-center text-[10px] text-gray-500 select-none">💡 Swipe left/right on cards to navigate weeks</p>

      <!-- Charts grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Weight Daily Chart -->
        <div class="glass-card p-4 sm:p-5 rounded-3xl relative shadow-lg">
          <h3 class="text-xs font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-violet-500"></span> Daily Weight Fluctuations (kg)
          </h3>
          <div class="relative h-[230px] w-full">
            <canvas ref="weightDailyCanvas"></canvas>
          </div>
        </div>

        <!-- Fat Daily Chart -->
        <div class="glass-card p-4 sm:p-5 rounded-3xl relative shadow-lg">
          <h3 class="text-xs font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span> Daily Body Fat Evolution (%)
          </h3>
          <div class="relative h-[230px] w-full">
            <canvas ref="fatDailyCanvas"></canvas>
          </div>
        </div>
      </div>
    </div>

    <!-- SEPARATOR LINE -->
    <div class="border-t border-gray-800/60 my-2"></div>

    <!-- 2. ALL-TIME LONG-TERM VIEW -->
    <div class="space-y-6">
      <div class="flex flex-col">
        <h2 class="text-base font-bold text-white tracking-tight">All-Time Trends</h2>
        <p class="text-[11px] text-gray-500 mt-0.5">Plotting computed weekly averages to filter out daily balance noise.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Weight Average Chart -->
        <div class="glass-card p-4 sm:p-5 rounded-3xl shadow-lg">
          <h3 class="text-xs font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-violet-500 animate-pulse"></span> Historical Weekly Weight Averages (kg)
          </h3>
          <div class="relative h-[230px] w-full">
            <canvas ref="weightAvgCanvas"></canvas>
          </div>
        </div>

        <!-- Fat Average Chart -->
        <div class="glass-card p-4 sm:p-5 rounded-3xl shadow-lg">
          <h3 class="text-xs font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Historical Weekly Fat Averages (%)
          </h3>
          <div class="relative h-[230px] w-full">
            <canvas ref="fatAvgCanvas"></canvas>
          </div>
        </div>
      </div>

      <!-- HEVY SYNC UTILITY -->
      <div class="glass-card p-5 rounded-3xl max-w-2xl shadow-xl">
        <div class="flex items-center gap-2 mb-2">
          <Copy class="w-4.5 h-4.5 text-violet-400" />
          <h3 class="text-sm font-bold text-white">Hevy Sync Helper</h3>
        </div>
        <p class="text-xs text-gray-400 mb-4">
          Click the copy button to copy your weekly average values to enter them directly into your Hevy logs.
        </p>

        <!-- Averages List -->
        <div class="space-y-2.5">
          <div 
            v-for="week in store.groupedWeeks" 
            :key="week.id"
            class="flex items-center justify-between p-3 rounded-xl bg-gray-900/60 border border-gray-800/40 hover:border-gray-700/60 transition-colors duration-200"
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
                class="p-2 rounded-lg bg-gray-800 hover:bg-gray-750 text-gray-400 hover:text-white transition-all duration-200 cursor-pointer border border-gray-700/30"
                title="Copy Weekly Averages"
              >
                <Check v-if="copiedWeekId === week.id" class="w-4 h-4 text-emerald-400 animate-pulse" />
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

// Canvas references
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

// Copy Hevy text
const copyWeeklyAverage = (week) => {
  const text = `Weight: ${week.avgMass.toFixed(2)}kg, Fat: ${week.avgFat.toFixed(1)}%`;
  navigator.clipboard.writeText(text).then(() => {
    copiedWeekId.value = week.id;
    setTimeout(() => {
      copiedWeekId.value = null;
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
      store.goToPreviousWeek();
    } else {
      store.goToNextWeek();
    }
  }
};

// Render Daily Week Detail Charts
const updateDailyCharts = () => {
  if (!store.activeWeek) return;

  nextTick(() => {
    const daysLabel = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dailyWeights = Array(7).fill(null);
    const dailyFats = Array(7).fill(null);

    for (const log of store.activeWeek.logs) {
      const d = new Date(log.date);
      const dayIndex = (d.getDay() + 6) % 7; // Monday = 0
      
      if (dailyWeights[dayIndex] === null) {
        dailyWeights[dayIndex] = log.mass;
        dailyFats[dayIndex] = log.body_fat;
      }
    }

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
              borderColor: 'rgba(139, 92, 246, 0.3)',
              borderWidth: 1,
              padding: 10,
              displayColors: false,
              callbacks: {
                label: (context) => ` ${context.parsed.y.toFixed(2)} kg`
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
                label: (context) => ` ${context.parsed.y.toFixed(1)} %`
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
  if (store.groupedWeeks.length === 0) return;

  nextTick(() => {
    const sortedWeeks = [...store.groupedWeeks].reverse();
    const labels = sortedWeeks.map(w => w.label);
    const avgWeights = sortedWeeks.map(w => w.avgMass);
    const avgFats = sortedWeeks.map(w => w.avgFat);

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

const drawAll = () => {
  updateDailyCharts();
  updateWeeklyCharts();
};

watch(() => store.logs, () => {
  drawAll();
}, { deep: true });

watch(() => store.selectedWeekIndex, () => {
  updateDailyCharts();
});

onMounted(() => {
  drawAll();
});

onUnmounted(() => {
  if (chartW_Daily) chartW_Daily.destroy();
  if (chartF_Daily) chartF_Daily.destroy();
  if (chartW_Avg) chartW_Avg.destroy();
  if (chartF_Avg) chartF_Avg.destroy();
});
</script>

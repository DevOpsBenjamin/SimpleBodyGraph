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
    
    <!-- 1. DAILY FOCUS SECTION (WEEK FOCUS) -->
    <div 
      v-show="store.activeTab === 'daily'"
      class="space-y-4 animate-fade-in"
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
        class="glass-card p-4 rounded-3xl max-w-sm mx-auto shadow-lg flex items-center justify-between border border-gray-800/40 hover:border-gray-700/60 transition-all duration-300"
      >
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-xl bg-violet-600/10 border border-violet-500/15">
            <Copy class="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h4 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>Hevy Helper</span>
              <span v-if="store.activeWeek.hasSickLogs" class="text-[9px] text-amber-400 normal-case flex items-center gap-0.5 font-normal" title="Weighted average (sick outlier weighted 0.25)">
                <Thermometer class="w-3.5 h-3.5" /> Weighted
              </span>
            </h4>
            <div class="flex items-center gap-2 mt-1">
              <span class="text-xs text-gray-400">Avg W: <strong class="text-white">{{ store.activeWeek.avgMass.toFixed(2) }} kg</strong></span>
              <span class="text-xs text-gray-600">|</span>
              <span class="text-xs text-gray-400">Avg F: <strong class="text-white">{{ store.activeWeek.avgFat.toFixed(1) }}%</strong></span>
            </div>
          </div>
        </div>

        <button 
          @click="copyWeeklyAverage(store.activeWeek)"
          class="p-2 px-3 rounded-xl bg-gray-800 hover:bg-gray-750 text-gray-400 hover:text-white transition-all duration-200 cursor-pointer border border-gray-700/30 flex items-center gap-1.5 text-xs font-medium"
          title="Copy Weekly Averages"
        >
          <Check v-if="copiedWeekId === store.activeWeek.id" class="w-4 h-4 text-emerald-400 animate-bounce" />
          <Copy v-else class="w-4 h-4 text-violet-400" />
          <span>{{ copiedWeekId === store.activeWeek.id ? 'Copied!' : 'Copy' }}</span>
        </button>
      </div>

      <!-- Daily Charts grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Weight Daily Chart -->
        <div class="glass-card p-4 sm:p-5 rounded-3xl relative shadow-lg">
          <h3 class="text-xs font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-violet-500"></span> Daily Weight Fluctuations (kg)
          </h3>
          <div class="relative h-[240px] w-full">
            <canvas ref="weightDailyCanvas"></canvas>
          </div>
        </div>

        <!-- Lean Mass Daily Chart -->
        <div class="glass-card p-4 sm:p-5 rounded-3xl relative shadow-lg">
          <h3 class="text-xs font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-blue-500"></span> Daily Lean Mass Fluctuations (kg)
          </h3>
          <div class="relative h-[240px] w-full">
            <canvas ref="leanDailyCanvas"></canvas>
          </div>
        </div>

        <!-- Fat Daily Chart -->
        <div class="glass-card p-4 sm:p-5 rounded-3xl relative shadow-lg">
          <h3 class="text-xs font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span> Daily Body Fat Evolution (%)
          </h3>
          <div class="relative h-[240px] w-full">
            <canvas ref="fatDailyCanvas"></canvas>
          </div>
        </div>

        <!-- Fat Mass Daily Chart -->
        <div class="glass-card p-4 sm:p-5 rounded-3xl relative shadow-lg">
          <h3 class="text-xs font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-amber-500"></span> Daily Fat Mass Evolution (kg)
          </h3>
          <div class="relative h-[240px] w-full">
            <canvas ref="fatMassDailyCanvas"></canvas>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. ALL-TIME LONG-TERM VIEW -->
    <div 
      v-show="store.activeTab === 'weekly'"
      class="space-y-6"
    >
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Weight Average Chart -->
        <div class="glass-card p-4 sm:p-5 rounded-3xl shadow-lg">
          <h3 class="text-xs font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-violet-500 animate-pulse"></span> Historical Weekly Weight Averages (kg)
          </h3>
          <div class="relative h-[240px] w-full">
            <canvas ref="weightAvgCanvas"></canvas>
          </div>
        </div>

        <!-- Lean Mass Average Chart -->
        <div class="glass-card p-4 sm:p-5 rounded-3xl shadow-lg">
          <h3 class="text-xs font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span> Historical Weekly Lean Mass Averages (kg)
          </h3>
          <div class="relative h-[240px] w-full">
            <canvas ref="leanAvgCanvas"></canvas>
          </div>
        </div>

        <!-- Fat Average Chart -->
        <div class="glass-card p-4 sm:p-5 rounded-3xl shadow-lg">
          <h3 class="text-xs font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Historical Weekly Fat Averages (%)
          </h3>
          <div class="relative h-[240px] w-full">
            <canvas ref="fatAvgCanvas"></canvas>
          </div>
        </div>

        <!-- Fat Mass Average Chart -->
        <div class="glass-card p-4 sm:p-5 rounded-3xl shadow-lg">
          <h3 class="text-xs font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> Historical Weekly Fat Mass Averages (kg)
          </h3>
          <div class="relative h-[240px] w-full">
            <canvas ref="fatMassAvgCanvas"></canvas>
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
              <div class="text-xs font-semibold text-white flex items-center gap-1.5">
                <span>{{ week.label }}</span>
                <span v-if="week.hasSickLogs" class="text-[9px] text-amber-400 flex items-center gap-0.5 font-medium" title="Weighted average (sick outlier weighted 0.25)">
                  <Thermometer class="w-3 h-3" /> Weighted
                </span>
              </div>
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
import { Scale, Plus, ChevronLeft, ChevronRight, Copy, Check, Thermometer } from 'lucide-vue-next';
import { Chart, registerables } from 'chart.js';
import { useBodyGraphStore } from '../stores/bodyGraph';

Chart.register(...registerables);

const store = useBodyGraphStore();

// Custom Chart.js Plugin to draw target goal lines without forcing axis re-scale
const goalLinePlugin = {
  id: 'goalLine',
  afterDraw: (chart) => {
    const goalOpts = chart.options.plugins?.goalLine;
    if (!goalOpts || goalOpts.value === undefined || goalOpts.value === null) return;
    
    const value = goalOpts.value;
    const yScale = chart.scales.y;
    
    if (value >= yScale.min && value <= yScale.max) {
      const ctx = chart.ctx;
      const y = yScale.getPixelForValue(value);
      const xLeft = chart.scales.x.left;
      const xRight = chart.scales.x.right;
      
      ctx.save();
      ctx.strokeStyle = goalOpts.color || '#8b5cf6';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]); // Dashed line
      
      ctx.beginPath();
      ctx.moveTo(xLeft, y);
      ctx.lineTo(xRight, y);
      ctx.stroke();
      
      ctx.fillStyle = goalOpts.textColor || goalOpts.color || '#a78bfa';
      ctx.font = '10px Outfit, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${goalOpts.label || 'Goal'}: ${value}${goalOpts.unit || ''}`, xRight - 6, y - 3);
      ctx.restore();
    }
  }
};

// Custom Chart.js Plugin to draw vertical dashed line segments connecting the estimated curve point to the floating raw outlier point
const sickLinkLinePlugin = {
  id: 'sickLinkLine',
  afterDatasetsDraw: (chart) => {
    const ds0 = chart.data.datasets[0];
    const ds1 = chart.data.datasets[1];
    if (!ds0 || !ds1 || ds1.label !== 'Raw Outlier') return;

    const meta0 = chart.getDatasetMeta(0);
    const meta1 = chart.getDatasetMeta(1);
    const ctx = chart.ctx;

    ctx.save();
    ctx.strokeStyle = '#d97706'; // darker amber for line segment
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 3]);

    for (let i = 0; i < ds1.data.length; i++) {
      if (ds1.data[i] !== null && ds1.data[i] !== undefined) {
        const pt0 = meta0.data[i];
        const pt1 = meta1.data[i];
        if (pt0 && pt1 && pt0.x !== undefined && pt0.y !== undefined && pt1.y !== undefined) {
          ctx.beginPath();
          ctx.moveTo(pt0.x, pt0.y);
          ctx.lineTo(pt0.x, pt1.y);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }
};

// Canvas references
const weightDailyCanvas = ref(null);
const leanDailyCanvas = ref(null);
const fatDailyCanvas = ref(null);
const fatMassDailyCanvas = ref(null);
const weightAvgCanvas = ref(null);
const leanAvgCanvas = ref(null);
const fatAvgCanvas = ref(null);
const fatMassAvgCanvas = ref(null);

// Chart references
let chartW_Daily = null;
let chartL_Daily = null;
let chartF_Daily = null;
let chartFM_Daily = null;
let chartW_Avg = null;
let chartL_Avg = null;
let chartF_Avg = null;
let chartFM_Avg = null;

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
    
    // Dataset 0: Trend values (estimated if sick, raw if healthy)
    const dailyWeights = Array(7).fill(null);
    const dailyLeans = Array(7).fill(null);
    const dailyFats = Array(7).fill(null);
    const dailyFatMasses = Array(7).fill(null);
    
    // Dataset 1: Raw outliers (raw if sick, null if healthy)
    const dailyWeightsRawOnly = Array(7).fill(null);
    const dailyLeansRawOnly = Array(7).fill(null);
    const dailyFatsRawOnly = Array(7).fill(null);
    const dailyFatMassesRawOnly = Array(7).fill(null);
    
    // Sick status flag arrays
    const dailyWeightsIsSick = Array(7).fill(false);
    const dailyLeansIsSick = Array(7).fill(false);
    const dailyFatsIsSick = Array(7).fill(false);
    const dailyFatMassesIsSick = Array(7).fill(false);

    for (const log of store.activeWeek.logs) {
      const d = new Date(log.date);
      const dayIndex = (d.getDay() + 6) % 7; // Monday = 0
      
      if (dailyWeights[dayIndex] === null) {
        dailyWeights[dayIndex] = log.is_sick ? log.estimated_mass : log.mass;
        dailyLeans[dayIndex] = log.is_sick ? log.estimated_lean_mass : log.lean_mass;
        dailyFats[dayIndex] = log.is_sick ? log.estimated_body_fat : log.body_fat;
        dailyFatMasses[dayIndex] = log.is_sick ? log.estimated_fat_mass : log.fat_mass;
        
        dailyWeightsRawOnly[dayIndex] = log.is_sick ? log.mass : null;
        dailyLeansRawOnly[dayIndex] = log.is_sick ? log.lean_mass : null;
        dailyFatsRawOnly[dayIndex] = log.is_sick ? log.body_fat : null;
        dailyFatMassesRawOnly[dayIndex] = log.is_sick ? log.fat_mass : null;
        
        dailyWeightsIsSick[dayIndex] = !!log.is_sick;
        dailyLeansIsSick[dayIndex] = !!log.is_sick;
        dailyFatsIsSick[dayIndex] = !!log.is_sick;
        dailyFatMassesIsSick[dayIndex] = !!log.is_sick;
      }
    }

    // 1. Total Weight Daily Chart
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
          datasets: [
            {
              label: 'Trend Weight',
              data: dailyWeights,
              borderColor: strokeGrad,
              borderWidth: 3,
              pointBackgroundColor: '#ffffff',
              pointBorderColor: dailyWeightsIsSick.map(sick => sick ? '#f59e0b' : '#8b5cf6'),
              pointBorderWidth: dailyWeightsIsSick.map(sick => sick ? 2.5 : 2),
              pointRadius: dailyWeightsIsSick.map(sick => sick ? 5 : 4),
              pointHoverRadius: dailyWeightsIsSick.map(sick => sick ? 7 : 6),
              pointStyle: 'circle',
              spanGaps: true,
              fill: true,
              backgroundColor: fillGrad,
              tension: 0.25
            },
            {
              label: 'Raw Outlier',
              data: dailyWeightsRawOnly,
              showLine: false,
              pointBackgroundColor: '#f59e0b',
              pointBorderColor: '#d97706',
              pointBorderWidth: 2,
              pointRadius: 6,
              pointHoverRadius: 8,
              pointStyle: 'rectRot'
            }
          ]
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
              displayColors: true,
              mode: 'index',
              intersect: false,
              callbacks: {
                label: (context) => {
                  const dsLabel = context.dataset.label;
                  const val = context.parsed.y;
                  if (val === null || val === undefined) return '';

                  if (dsLabel === 'Trend Weight') {
                    const isSick = dailyWeightsIsSick[context.dataIndex];
                    if (isSick) {
                      return ` Trend Estimate: ${val.toFixed(2)} kg`;
                    }
                    return ` Weight: ${val.toFixed(2)} kg`;
                  } else if (dsLabel === 'Raw Outlier') {
                    return ` Actual Outlier: ${val.toFixed(2)} kg (Sick Day)`;
                  }
                  return ` ${val.toFixed(2)} kg`;
                }
              },
              filter: (tooltipItem) => {
                return tooltipItem.raw !== null && tooltipItem.raw !== undefined;
              }
            },
            goalLine: {
              value: store.targetMass,
              color: 'rgba(167, 139, 250, 0.4)',
              textColor: 'rgba(167, 139, 250, 0.8)',
              label: 'Target',
              unit: ' kg'
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
        },
        plugins: [goalLinePlugin, sickLinkLinePlugin]
      });
    }

    // 2. Lean Mass Daily Chart
    if (leanDailyCanvas.value) {
      if (chartL_Daily) chartL_Daily.destroy();
      const ctx = leanDailyCanvas.value.getContext('2d');
      
      const strokeGrad = ctx.createLinearGradient(0, 0, 0, 300);
      strokeGrad.addColorStop(0, '#60a5fa');
      strokeGrad.addColorStop(1, '#3b82f6');
      
      const fillGrad = ctx.createLinearGradient(0, 0, 0, 250);
      fillGrad.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
      fillGrad.addColorStop(1, 'rgba(59, 130, 246, 0)');

      chartL_Daily = new Chart(ctx, {
        type: 'line',
        data: {
          labels: daysLabel,
          datasets: [
            {
              label: 'Trend Lean',
              data: dailyLeans,
              borderColor: strokeGrad,
              borderWidth: 3,
              pointBackgroundColor: '#ffffff',
              pointBorderColor: dailyLeansIsSick.map(sick => sick ? '#f59e0b' : '#3b82f6'),
              pointBorderWidth: dailyLeansIsSick.map(sick => sick ? 2.5 : 2),
              pointRadius: dailyLeansIsSick.map(sick => sick ? 5 : 4),
              pointHoverRadius: dailyLeansIsSick.map(sick => sick ? 7 : 6),
              pointStyle: 'circle',
              spanGaps: true,
              fill: true,
              backgroundColor: fillGrad,
              tension: 0.25
            },
            {
              label: 'Raw Outlier',
              data: dailyLeansRawOnly,
              showLine: false,
              pointBackgroundColor: '#f59e0b',
              pointBorderColor: '#d97706',
              pointBorderWidth: 2,
              pointRadius: 6,
              pointHoverRadius: 8,
              pointStyle: 'rectRot'
            }
          ]
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

                  if (dsLabel === 'Trend Lean') {
                    const isSick = dailyLeansIsSick[context.dataIndex];
                    if (isSick) {
                      return ` Trend Estimate: ${val.toFixed(2)} kg`;
                    }
                    return ` Lean Mass: ${val.toFixed(2)} kg`;
                  } else if (dsLabel === 'Raw Outlier') {
                    return ` Actual Outlier: ${val.toFixed(2)} kg (Sick Day)`;
                  }
                  return ` ${val.toFixed(2)} kg`;
                }
              },
              filter: (tooltipItem) => {
                return tooltipItem.raw !== null && tooltipItem.raw !== undefined;
              }
            },
            goalLine: {
              value: store.targetLeanMass,
              color: 'rgba(96, 165, 250, 0.4)',
              textColor: 'rgba(96, 165, 250, 0.8)',
              label: 'Target',
              unit: ' kg'
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
        },
        plugins: [goalLinePlugin, sickLinkLinePlugin]
      });
    }

    // 3. Body Fat (%) Daily Chart
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
          datasets: [
            {
              label: 'Trend Fat',
              data: dailyFats,
              borderColor: strokeGrad,
              borderWidth: 3,
              pointBackgroundColor: '#ffffff',
              pointBorderColor: dailyFatsIsSick.map(sick => sick ? '#f59e0b' : '#10b981'),
              pointBorderWidth: dailyFatsIsSick.map(sick => sick ? 2.5 : 2),
              pointRadius: dailyFatsIsSick.map(sick => sick ? 5 : 4),
              pointHoverRadius: dailyFatsIsSick.map(sick => sick ? 7 : 6),
              pointStyle: 'circle',
              spanGaps: true,
              fill: true,
              backgroundColor: fillGrad,
              tension: 0.25
            },
            {
              label: 'Raw Outlier',
              data: dailyFatsRawOnly,
              showLine: false,
              pointBackgroundColor: '#f59e0b',
              pointBorderColor: '#d97706',
              pointBorderWidth: 2,
              pointRadius: 6,
              pointHoverRadius: 8,
              pointStyle: 'rectRot'
            }
          ]
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
              displayColors: true,
              mode: 'index',
              intersect: false,
              callbacks: {
                label: (context) => {
                  const dsLabel = context.dataset.label;
                  const val = context.parsed.y;
                  if (val === null || val === undefined) return '';

                  if (dsLabel === 'Trend Fat') {
                    const isSick = dailyFatsIsSick[context.dataIndex];
                    if (isSick) {
                      return ` Trend Estimate: ${val.toFixed(1)} %`;
                    }
                    return ` Body Fat: ${val.toFixed(1)} %`;
                  } else if (dsLabel === 'Raw Outlier') {
                    return ` Actual Outlier: ${val.toFixed(1)} % (Sick Day)`;
                  }
                  return ` ${val.toFixed(1)} %`;
                }
              },
              filter: (tooltipItem) => {
                return tooltipItem.raw !== null && tooltipItem.raw !== undefined;
              }
            },
            goalLine: {
              value: store.targetFat,
              color: 'rgba(52, 211, 153, 0.4)',
              textColor: 'rgba(52, 211, 153, 0.8)',
              label: 'Target',
              unit: '%'
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
        },
        plugins: [goalLinePlugin, sickLinkLinePlugin]
      });
    }

    // 4. Fat Mass (kg) Daily Chart
    if (fatMassDailyCanvas.value) {
      if (chartFM_Daily) chartFM_Daily.destroy();
      const ctx = fatMassDailyCanvas.value.getContext('2d');
      
      const strokeGrad = ctx.createLinearGradient(0, 0, 0, 300);
      strokeGrad.addColorStop(0, '#fbbf24');
      strokeGrad.addColorStop(1, '#f59e0b');
      
      const fillGrad = ctx.createLinearGradient(0, 0, 0, 250);
      fillGrad.addColorStop(0, 'rgba(245, 158, 11, 0.2)');
      fillGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');

      chartFM_Daily = new Chart(ctx, {
        type: 'line',
        data: {
          labels: daysLabel,
          datasets: [
            {
              label: 'Trend Fat Mass',
              data: dailyFatMasses,
              borderColor: strokeGrad,
              borderWidth: 3,
              pointBackgroundColor: '#ffffff',
              pointBorderColor: dailyFatMassesIsSick.map(sick => sick ? '#f59e0b' : '#f59e0b'),
              pointBorderWidth: dailyFatMassesIsSick.map(sick => sick ? 2.5 : 2),
              pointRadius: dailyFatMassesIsSick.map(sick => sick ? 5 : 4),
              pointHoverRadius: dailyFatMassesIsSick.map(sick => sick ? 7 : 6),
              pointStyle: 'circle',
              spanGaps: true,
              fill: true,
              backgroundColor: fillGrad,
              tension: 0.25
            },
            {
              label: 'Raw Outlier',
              data: dailyFatMassesRawOnly,
              showLine: false,
              pointBackgroundColor: '#f59e0b',
              pointBorderColor: '#d97706',
              pointBorderWidth: 2,
              pointRadius: 6,
              pointHoverRadius: 8,
              pointStyle: 'rectRot'
            }
          ]
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

                  if (dsLabel === 'Trend Fat Mass') {
                    const isSick = dailyFatMassesIsSick[context.dataIndex];
                    if (isSick) {
                      return ` Trend Estimate: ${val.toFixed(2)} kg`;
                    }
                    return ` Fat Mass: ${val.toFixed(2)} kg`;
                  } else if (dsLabel === 'Raw Outlier') {
                    return ` Actual Outlier: ${val.toFixed(2)} kg (Sick Day)`;
                  }
                  return ` ${val.toFixed(2)} kg`;
                }
              },
              filter: (tooltipItem) => {
                return tooltipItem.raw !== null && tooltipItem.raw !== undefined;
              }
            },
            goalLine: {
              value: store.targetFatMass,
              color: 'rgba(245, 158, 11, 0.4)',
              textColor: 'rgba(245, 158, 11, 0.8)',
              label: 'Target',
              unit: ' kg'
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
        },
        plugins: [goalLinePlugin, sickLinkLinePlugin]
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
    const avgLeans = sortedWeeks.map(w => w.avgLeanMass);
    const avgFats = sortedWeeks.map(w => w.avgFat);
    const avgFatMasses = sortedWeeks.map(w => w.avgFatMass);

    // 1. Weekly Average Weight
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
                label: (context) => {
                  const week = sortedWeeks[context.dataIndex];
                  const val = context.parsed.y;
                  if (week && week.hasSickLogs) {
                    return ` Avg: ${val.toFixed(2)} kg (Weighted - includes sick outlier)`;
                  }
                  return ` Avg: ${val.toFixed(2)} kg`;
                }
              }
            },
            goalLine: {
              value: store.targetMass,
              color: 'rgba(167, 139, 250, 0.4)',
              textColor: 'rgba(167, 139, 250, 0.8)',
              label: 'Target',
              unit: ' kg'
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
        },
        plugins: [goalLinePlugin]
      });
    }

    // 2. Weekly Average Lean Mass
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
          labels,
          datasets: [{
            data: avgLeans,
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
              borderColor: 'rgba(59, 130, 246, 0.3)',
              borderWidth: 1,
              padding: 10,
              displayColors: false,
              callbacks: {
                label: (context) => {
                  const week = sortedWeeks[context.dataIndex];
                  const val = context.parsed.y;
                  if (week && week.hasSickLogs) {
                    return ` Avg: ${val.toFixed(2)} kg (Weighted - includes sick outlier)`;
                  }
                  return ` Avg: ${val.toFixed(2)} kg`;
                }
              }
            },
            goalLine: {
              value: store.targetLeanMass,
              color: 'rgba(96, 165, 250, 0.4)',
              textColor: 'rgba(96, 165, 250, 0.8)',
              label: 'Target',
              unit: ' kg'
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
        },
        plugins: [goalLinePlugin]
      });
    }

    // 3. Weekly Average Body Fat (%)
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
                label: (context) => {
                  const week = sortedWeeks[context.dataIndex];
                  const val = context.parsed.y;
                  if (week && week.hasSickLogs) {
                    return ` Avg: ${val.toFixed(1)} % (Weighted - includes sick outlier)`;
                  }
                  return ` Avg: ${val.toFixed(1)} %`;
                }
              }
            },
            goalLine: {
              value: store.targetFat,
              color: 'rgba(52, 211, 153, 0.4)',
              textColor: 'rgba(52, 211, 153, 0.8)',
              label: 'Target',
              unit: '%'
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
        },
        plugins: [goalLinePlugin]
      });
    }

    // 4. Weekly Average Fat Mass (kg)
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
          labels,
          datasets: [{
            data: avgFatMasses,
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
              borderColor: 'rgba(245, 158, 11, 0.3)',
              borderWidth: 1,
              padding: 10,
              displayColors: false,
              callbacks: {
                label: (context) => {
                  const week = sortedWeeks[context.dataIndex];
                  const val = context.parsed.y;
                  if (week && week.hasSickLogs) {
                    return ` Avg: ${val.toFixed(2)} kg (Weighted - includes sick outlier)`;
                  }
                  return ` Avg: ${val.toFixed(2)} kg`;
                }
              }
            },
            goalLine: {
              value: store.targetFatMass,
              color: 'rgba(245, 158, 11, 0.4)',
              textColor: 'rgba(245, 158, 11, 0.8)',
              label: 'Target',
              unit: ' kg'
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
        },
        plugins: [goalLinePlugin]
      });
    }
  });
};

const drawAll = () => {
  if (store.activeTab === 'daily') {
    updateDailyCharts();
  } else if (store.activeTab === 'weekly') {
    updateWeeklyCharts();
  }
};

watch([() => store.logs, () => store.activeTab, () => store.targetMass, () => store.targetFat], () => {
  drawAll();
}, { deep: true });

watch(() => store.selectedWeekIndex, () => {
  if (store.activeTab === 'daily') {
    updateDailyCharts();
  }
});

onMounted(() => {
  drawAll();
});

onUnmounted(() => {
  if (chartW_Daily) chartW_Daily.destroy();
  if (chartL_Daily) chartL_Daily.destroy();
  if (chartF_Daily) chartF_Daily.destroy();
  if (chartFM_Daily) chartFM_Daily.destroy();
  if (chartW_Avg) chartW_Avg.destroy();
  if (chartL_Avg) chartL_Avg.destroy();
  if (chartF_Avg) chartF_Avg.destroy();
  if (chartFM_Avg) chartFM_Avg.destroy();
});
</script>

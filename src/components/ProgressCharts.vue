<template>
  <div v-if="store.logs.length === 0" class="glass-card p-10 rounded-3xl text-center flex flex-col items-center justify-center">
    <div class="w-16 h-16 bg-gray-950 rounded-2xl flex items-center justify-center border border-gray-800/60 text-gray-500 mb-4">
      <Scale class="w-8 h-8" />
    </div>
    <h3 class="text-lg font-semibold text-white mb-1">No Data Available</h3>
    <p class="text-sm text-gray-400 max-w-xs mb-6">Start logging your body mass and body fat percentage to render your progress charts.</p>
    <button 
      @click="store.showAddModal = true"
      class="px-4 py-2 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white font-medium rounded-xl transition-all duration-200 flex items-center gap-2 cursor-pointer"
    >
      <Plus class="w-4 h-4" /> Add Your First Log
    </button>
  </div>

  <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <!-- Weight Chart -->
    <div class="glass-card p-4 sm:p-5 rounded-3xl">
      <h3 class="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-full bg-violet-500"></span> Weight Trend (kg)
      </h3>
      <div class="relative h-[260px] w-full">
        <canvas ref="weightChartCanvas"></canvas>
      </div>
    </div>

    <!-- Body Fat Chart -->
    <div class="glass-card p-4 sm:p-5 rounded-3xl">
      <h3 class="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Body Fat Trend (%)
      </h3>
      <div class="relative h-[260px] w-full">
        <canvas ref="fatChartCanvas"></canvas>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { Scale, Plus } from 'lucide-vue-next';
import { Chart, registerables } from 'chart.js';
import { useBodyGraphStore } from '../stores/bodyGraph';

// Register Chart.js elements
Chart.register(...registerables);

const store = useBodyGraphStore();

const weightChartCanvas = ref(null);
const fatChartCanvas = ref(null);

let wChartInstance = null;
let fChartInstance = null;

const updateCharts = () => {
  if (store.logs.length === 0) return;

  nextTick(() => {
    // Chronological order for trend display (oldest first, left-to-right)
    const sortedLogs = [...store.logs].reverse();
    const labels = sortedLogs.map(log => {
      const d = new Date(log.date);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    });
    
    const weights = sortedLogs.map(log => log.mass);
    const fats = sortedLogs.map(log => log.body_fat);

    // 1. Render Weight Chart
    if (weightChartCanvas.value) {
      if (wChartInstance) {
        wChartInstance.destroy();
      }

      const ctx = weightChartCanvas.value.getContext('2d');
      
      const strokeGrad = ctx.createLinearGradient(0, 0, 0, 300);
      strokeGrad.addColorStop(0, '#a78bfa'); // violet-400
      strokeGrad.addColorStop(1, '#6366f1'); // indigo-500
      
      const fillGrad = ctx.createLinearGradient(0, 0, 0, 250);
      fillGrad.addColorStop(0, 'rgba(139, 92, 246, 0.25)');
      fillGrad.addColorStop(1, 'rgba(139, 92, 246, 0)');

      wChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Weight (kg)',
            data: weights,
            borderColor: strokeGrad,
            borderWidth: 3,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: '#8b5cf6',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
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
              padding: 12,
              displayColors: false,
              callbacks: {
                label: (context) => ` ${context.parsed.y} kg`
              }
            }
          },
          scales: {
            y: {
              grid: { color: 'rgba(75, 85, 99, 0.12)' },
              ticks: { 
                color: '#9ca3af',
                font: { family: 'Outfit', size: 11 }
              }
            },
            x: {
              grid: { display: false },
              ticks: { 
                color: '#9ca3af',
                font: { family: 'Outfit', size: 10 }
              }
            }
          }
        }
      });
    }

    // 2. Render Fat Chart
    if (fatChartCanvas.value) {
      if (fChartInstance) {
        fChartInstance.destroy();
      }

      const ctx = fatChartCanvas.value.getContext('2d');
      
      const strokeGrad = ctx.createLinearGradient(0, 0, 0, 300);
      strokeGrad.addColorStop(0, '#34d399'); // emerald-400
      strokeGrad.addColorStop(1, '#059669'); // emerald-600
      
      const fillGrad = ctx.createLinearGradient(0, 0, 0, 250);
      fillGrad.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
      fillGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');

      fChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Body Fat (%)',
            data: fats,
            borderColor: strokeGrad,
            borderWidth: 3,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: '#10b981',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
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
              padding: 12,
              displayColors: false,
              callbacks: {
                label: (context) => ` ${context.parsed.y} %`
              }
            }
          },
          scales: {
            y: {
              grid: { color: 'rgba(75, 85, 99, 0.12)' },
              ticks: { 
                color: '#9ca3af',
                font: { family: 'Outfit', size: 11 }
              }
            },
            x: {
              grid: { display: false },
              ticks: { 
                color: '#9ca3af',
                font: { family: 'Outfit', size: 10 }
              }
            }
          }
        }
      });
    }
  });
};

watch(() => store.logs, () => {
  updateCharts();
}, { deep: true });

onMounted(() => {
  updateCharts();
});

onUnmounted(() => {
  if (wChartInstance) wChartInstance.destroy();
  if (fChartInstance) fChartInstance.destroy();
});
</script>

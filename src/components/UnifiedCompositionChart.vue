<template>
  <div class="glass-card p-4 sm:p-5 rounded-3xl shadow-lg space-y-4">
    <!-- Header & Interactive Toggle Pills -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-800/80">
      <div>
        <h3 class="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-violet-500 animate-pulse"></span>
          {{ title }}
        </h3>
        <p class="text-[11px] text-gray-400">Évolution de la masse corporelle en kg</p>
      </div>

      <!-- Quick Toggles -->
      <div class="flex items-center flex-wrap gap-1.5">
        <!-- Poids Pill -->
        <button
          type="button"
          @click="toggleCurve('showMass')"
          :class="[
            'px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all duration-150 flex items-center gap-1.5 cursor-pointer select-none border',
            store.displayPreferences.charts.showMass
              ? 'bg-violet-600/20 border-violet-500/50 text-violet-300 shadow-sm shadow-violet-500/10'
              : 'bg-gray-950/60 border-gray-800 text-gray-500 hover:text-gray-400'
          ]"
        >
          <span :class="['w-2 h-2 rounded-full', store.displayPreferences.charts.showMass ? 'bg-violet-400' : 'bg-gray-600']"></span>
          Poids Total
        </button>

        <!-- Masse Grasse Pill -->
        <button
          type="button"
          @click="toggleCurve('showFatMass')"
          :class="[
            'px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all duration-150 flex items-center gap-1.5 cursor-pointer select-none border',
            store.displayPreferences.charts.showFatMass
              ? 'bg-amber-600/20 border-amber-500/50 text-amber-300 shadow-sm shadow-amber-500/10'
              : 'bg-gray-950/60 border-gray-800 text-gray-500 hover:text-gray-400'
          ]"
        >
          <span :class="['w-2 h-2 rounded-full', store.displayPreferences.charts.showFatMass ? 'bg-amber-400' : 'bg-gray-600']"></span>
          Masse Grasse
        </button>

        <!-- Masse Maigre Pill -->
        <button
          type="button"
          @click="toggleCurve('showLeanMass')"
          :class="[
            'px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all duration-150 flex items-center gap-1.5 cursor-pointer select-none border',
            store.displayPreferences.charts.showLeanMass
              ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300 shadow-sm shadow-emerald-500/10'
              : 'bg-gray-950/60 border-gray-800 text-gray-500 hover:text-gray-400'
          ]"
        >
          <span :class="['w-2 h-2 rounded-full', store.displayPreferences.charts.showLeanMass ? 'bg-emerald-400' : 'bg-gray-600']"></span>
          Masse Maigre
        </button>
      </div>
    </div>

    <!-- Chart Canvas -->
    <div class="relative h-[280px] w-full">
      <canvas ref="canvasRef"></canvas>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { Chart, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';
import { useBodyGraphStore } from '../stores/bodyGraph';
import { goalLinePlugin, getScaleLimits } from '../utils/chartHelpers';

Chart.register(...registerables);

const props = defineProps({
  title: {
    type: String,
    default: 'Composition Corporelle'
  },
  massData: {
    type: Array,
    default: () => []
  },
  fatMassData: {
    type: Array,
    default: () => []
  },
  leanMassData: {
    type: Array,
    default: () => []
  },
  timeScaleOptions: {
    type: Object,
    required: true
  }
});

const store = useBodyGraphStore();
const canvasRef = ref(null);
let chartInstance = null;

const toggleCurve = (key) => {
  const current = store.displayPreferences.charts[key];
  store.updateDisplayPreferences({
    charts: {
      ...store.displayPreferences.charts,
      [key]: !current
    }
  });
};

const renderChart = () => {
  if (!canvasRef.value) return;

  const ctx = canvasRef.value.getContext('2d');

  // Colors & Gradients
  const violetGrad = ctx.createLinearGradient(0, 0, 0, 300);
  violetGrad.addColorStop(0, 'rgba(167, 139, 250, 1)');
  violetGrad.addColorStop(1, 'rgba(139, 92, 246, 0.7)');

  const amberGrad = ctx.createLinearGradient(0, 0, 0, 300);
  amberGrad.addColorStop(0, 'rgba(251, 191, 36, 1)');
  amberGrad.addColorStop(1, 'rgba(245, 158, 11, 0.7)');

  const emeraldGrad = ctx.createLinearGradient(0, 0, 0, 300);
  emeraldGrad.addColorStop(0, 'rgba(52, 211, 153, 1)');
  emeraldGrad.addColorStop(1, 'rgba(16, 185, 129, 0.7)');

  const datasets = [];

  if (store.displayPreferences.charts.showMass && props.massData.length > 0) {
    datasets.push({
      label: 'Poids Total (kg)',
      data: props.massData,
      borderColor: violetGrad,
      backgroundColor: 'rgba(139, 92, 246, 0.08)',
      fill: true,
      tension: 0.35,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: 'rgba(167, 139, 250, 1)',
      borderWidth: 2.5
    });
  }

  if (store.displayPreferences.charts.showFatMass && props.fatMassData.length > 0) {
    datasets.push({
      label: 'Masse Grasse (kg)',
      data: props.fatMassData,
      borderColor: amberGrad,
      backgroundColor: 'rgba(245, 158, 11, 0.06)',
      fill: true,
      tension: 0.35,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: 'rgba(251, 191, 36, 1)',
      borderWidth: 2.5
    });
  }

  if (store.displayPreferences.charts.showLeanMass && props.leanMassData.length > 0) {
    datasets.push({
      label: 'Masse Maigre (kg)',
      data: props.leanMassData,
      borderColor: emeraldGrad,
      backgroundColor: 'rgba(16, 185, 129, 0.06)',
      fill: true,
      tension: 0.35,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: 'rgba(52, 211, 153, 1)',
      borderWidth: 2.5
    });
  }

  // Calculate global Y-limits across active data
  const allActiveValues = datasets.flatMap(d => d.data.map(p => p.y)).filter(v => v !== null && !isNaN(v));
  const { min, max } = getScaleLimits(allActiveValues, 'weight');

  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: { datasets },
    plugins: [goalLinePlugin],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            color: '#9ca3af',
            boxWidth: 10,
            font: { size: 11, weight: '500' }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(17, 24, 39, 0.95)',
          titleColor: '#fff',
          bodyColor: '#e5e7eb',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label(context) {
              return ` ${context.dataset.label}: ${context.parsed.y.toFixed(2)} kg`;
            }
          }
        },
        goalLine: {
          lines: store.activePalier?.mass ? [{ value: store.activePalier.mass, label: `Objectif: ${store.activePalier.mass} kg`, color: '#a78bfa' }] : []
        }
      },
      scales: {
        x: {
          type: 'time',
          time: props.timeScaleOptions.time,
          grid: {
            color: 'rgba(255, 255, 255, 0.05)'
          },
          ticks: {
            color: '#9ca3af',
            font: { size: 11 }
          }
        },
        y: {
          min,
          max,
          grid: {
            color: 'rgba(255, 255, 255, 0.05)'
          },
          ticks: {
            color: '#9ca3af',
            font: { size: 11 },
            callback: (val) => `${val} kg`
          }
        }
      }
    }
  });
};

onMounted(() => {
  nextTick(renderChart);
});

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
});

watch(
  () => [
    props.massData, 
    props.fatMassData, 
    props.leanMassData, 
    store.displayPreferences.charts,
    props.timeScaleOptions
  ],
  () => {
    nextTick(renderChart);
  },
  { deep: true }
);
</script>

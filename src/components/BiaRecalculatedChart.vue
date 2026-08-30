<template>
  <div v-if="data && data.length > 0" class="glass-card p-4 sm:p-5 rounded-3xl shadow-lg space-y-4">
    <!-- Header & Interactive Toggle Pills -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-800/80">
      <div>
        <h3 class="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
          {{ title }}
        </h3>
        <p class="text-[11px] text-gray-400">
          {{ $t('charts.biaRecalculatedDesc') }}
        </p>
      </div>

      <!-- Quick Toggles -->
      <div class="flex items-center flex-wrap gap-1.5">
        <!-- 1. Taux de Gras % -->
        <button
          type="button"
          @click="toggleMetric('showFatPercent')"
          :class="[
            'px-2.5 py-1 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all duration-150 flex items-center gap-1.5 cursor-pointer select-none border',
            activeMetrics.showFatPercent
              ? 'bg-cyan-600/20 border-cyan-500/50 text-cyan-300 shadow-sm shadow-cyan-500/10'
              : 'bg-gray-950/60 border-gray-800 text-gray-500 hover:text-gray-400'
          ]"
        >
          <span :class="['w-2 h-2 rounded-full', activeMetrics.showFatPercent ? 'bg-cyan-400' : 'bg-gray-600']"></span>
          {{ $t('charts.biaToggles.fatPercent') }}
        </button>

        <!-- 2. Masse Grasse kg -->
        <button
          type="button"
          @click="toggleMetric('showFatMass')"
          :class="[
            'px-2.5 py-1 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all duration-150 flex items-center gap-1.5 cursor-pointer select-none border',
            activeMetrics.showFatMass
              ? 'bg-amber-600/20 border-amber-500/50 text-amber-300 shadow-sm shadow-amber-500/10'
              : 'bg-gray-950/60 border-gray-800 text-gray-500 hover:text-gray-400'
          ]"
        >
          <span :class="['w-2 h-2 rounded-full', activeMetrics.showFatMass ? 'bg-amber-400' : 'bg-gray-600']"></span>
          {{ $t('charts.biaToggles.fatMass') }}
        </button>

        <!-- 3. Muscle SMM kg -->
        <button
          type="button"
          @click="toggleMetric('showSmm')"
          :class="[
            'px-2.5 py-1 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all duration-150 flex items-center gap-1.5 cursor-pointer select-none border',
            activeMetrics.showSmm
              ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300 shadow-sm shadow-emerald-500/10'
              : 'bg-gray-950/60 border-gray-800 text-gray-500 hover:text-gray-400'
          ]"
        >
          <span :class="['w-2 h-2 rounded-full', activeMetrics.showSmm ? 'bg-emerald-400' : 'bg-gray-600']"></span>
          {{ $t('charts.biaToggles.smm') }}
        </button>

        <!-- 4. Eau Cellulaire ICW/ECW -->
        <button
          type="button"
          @click="toggleMetric('showWater')"
          :class="[
            'px-2.5 py-1 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all duration-150 flex items-center gap-1.5 cursor-pointer select-none border',
            activeMetrics.showWater
              ? 'bg-purple-600/20 border-purple-500/50 text-purple-300 shadow-sm shadow-purple-500/10'
              : 'bg-gray-950/60 border-gray-800 text-gray-500 hover:text-gray-400'
          ]"
        >
          <span :class="['w-2 h-2 rounded-full', activeMetrics.showWater ? 'bg-purple-400' : 'bg-gray-600']"></span>
          {{ $t('charts.biaToggles.water') }}
        </button>

        <!-- 5. Résistance Z50 -->
        <button
          type="button"
          @click="toggleMetric('showOhms')"
          :class="[
            'px-2.5 py-1 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all duration-150 flex items-center gap-1.5 cursor-pointer select-none border',
            activeMetrics.showOhms
              ? 'bg-blue-600/20 border-blue-500/50 text-blue-300 shadow-sm shadow-blue-500/10'
              : 'bg-gray-950/60 border-gray-800 text-gray-500 hover:text-gray-400'
          ]"
        >
          <span :class="['w-2 h-2 rounded-full', activeMetrics.showOhms ? 'bg-blue-400' : 'bg-gray-600']"></span>
          {{ $t('charts.biaToggles.ohms') }}
        </button>
      </div>
    </div>

    <!-- Chart Canvas -->
    <div class="relative h-[290px] w-full">
      <canvas ref="canvasRef"></canvas>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { Chart, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';
import { useI18n } from '../i18n';

Chart.register(...registerables);

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  data: {
    type: Array,
    default: () => []
  },
  timeScaleOptions: {
    type: Object,
    required: true
  }
});

const { t } = useI18n();
const canvasRef = ref(null);
let chartInstance = null;

const activeMetrics = reactive({
  showFatPercent: true,
  showFatMass: false,
  showSmm: false,
  showWater: false,
  showOhms: false
});

const toggleMetric = (key) => {
  activeMetrics[key] = !activeMetrics[key];
  renderChart();
};

const buildDatasets = () => {
  const datasets = [];

  // 1. % Gras Brut vs Recalculé
  if (activeMetrics.showFatPercent) {
    datasets.push({
      label: t('charts.datasets.rawFatPercent'),
      data: props.data.map(d => ({ x: d.date, y: d.rawFatPercent })),
      borderColor: '#f59e0b',
      backgroundColor: '#f59e0b',
      borderWidth: 2,
      borderDash: [5, 4],
      tension: 0.2,
      pointRadius: 4,
      pointHoverRadius: 6,
      yAxisID: 'y'
    });

    datasets.push({
      label: t('charts.datasets.recalcFatPercent'),
      data: props.data.map(d => ({ x: d.date, y: d.recalcFatPercent })),
      borderColor: '#06b6d4',
      backgroundColor: '#06b6d4',
      borderWidth: 2.5,
      tension: 0.2,
      pointRadius: 4,
      pointHoverRadius: 6,
      yAxisID: 'y'
    });
  }

  // 2. Masse Grasse kg (Brut vs Recalculé)
  if (activeMetrics.showFatMass) {
    datasets.push({
      label: t('charts.datasets.rawFatMass'),
      data: props.data.map(d => ({ x: d.date, y: d.rawFatMass })),
      borderColor: '#f43f5e',
      backgroundColor: '#f43f5e',
      borderWidth: 2,
      borderDash: [4, 4],
      tension: 0.2,
      pointRadius: 3,
      yAxisID: 'y'
    });

    datasets.push({
      label: t('charts.datasets.recalcFatMass'),
      data: props.data.map(d => ({ x: d.date, y: d.recalcFatMass })),
      borderColor: '#fb7185',
      backgroundColor: '#fb7185',
      borderWidth: 2.5,
      tension: 0.2,
      pointRadius: 3,
      yAxisID: 'y'
    });
  }

  // 3. Muscle SMM Recalculé
  if (activeMetrics.showSmm) {
    datasets.push({
      label: t('charts.datasets.recalcSmm'),
      data: props.data.map(d => ({ x: d.date, y: d.recalcSmm })),
      borderColor: '#10b981',
      backgroundColor: '#10b981',
      borderWidth: 2.5,
      tension: 0.2,
      pointRadius: 3,
      yAxisID: 'y'
    });
  }

  // 4. Eau Intracellulaire & Extracellulaire
  if (activeMetrics.showWater) {
    datasets.push({
      label: t('charts.datasets.recalcIcw'),
      data: props.data.map(d => ({ x: d.date, y: d.recalcIcw })),
      borderColor: '#a855f7',
      backgroundColor: '#a855f7',
      borderWidth: 2,
      tension: 0.2,
      pointRadius: 3,
      yAxisID: 'y'
    });

    datasets.push({
      label: t('charts.datasets.recalcEcw'),
      data: props.data.map(d => ({ x: d.date, y: d.recalcEcw })),
      borderColor: '#38bdf8',
      backgroundColor: '#38bdf8',
      borderWidth: 2,
      tension: 0.2,
      pointRadius: 3,
      yAxisID: 'y'
    });
  }

  // 5. Résistance Z50 (Ohms)
  if (activeMetrics.showOhms) {
    datasets.push({
      label: t('charts.datasets.medianZ50'),
      data: props.data.map(d => ({ x: d.date, y: d.medianZ50 })),
      borderColor: '#60a5fa',
      backgroundColor: '#60a5fa',
      borderWidth: 2,
      tension: 0.2,
      pointRadius: 3,
      yAxisID: activeMetrics.showFatPercent || activeMetrics.showFatMass || activeMetrics.showSmm || activeMetrics.showWater ? 'y1' : 'y'
    });
  }

  return datasets;
};

const renderChart = () => {
  if (!canvasRef.value) return;

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  const datasets = buildDatasets();
  const ctx = canvasRef.value.getContext('2d');

  const hasY1 = activeMetrics.showOhms && (activeMetrics.showFatPercent || activeMetrics.showFatMass || activeMetrics.showSmm || activeMetrics.showWater);

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: { datasets },
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
          position: 'top',
          labels: {
            color: '#9ca3af',
            font: { size: 11, weight: 'bold' },
            boxWidth: 12,
            padding: 12,
            usePointStyle: true
          }
        },
        tooltip: {
          backgroundColor: 'rgba(11, 15, 23, 0.95)',
          titleColor: '#f3f4f6',
          bodyColor: '#e5e7eb',
          borderColor: 'rgba(55, 65, 81, 0.8)',
          borderWidth: 1,
          padding: 10,
          boxPadding: 4,
          cornerRadius: 12
        }
      },
      scales: {
        x: {
          ...props.timeScaleOptions,
          grid: { color: 'rgba(31, 41, 55, 0.5)' },
          ticks: { color: '#6b7280', font: { size: 10 } }
        },
        y: {
          grid: { color: 'rgba(31, 41, 55, 0.5)' },
          ticks: { color: '#9ca3af', font: { size: 10 } }
        },
        ...(hasY1 ? {
          y1: {
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: { color: '#60a5fa', font: { size: 10 }, callback: v => `${v} Ω` }
          }
        } : {})
      }
    }
  });
};

onMounted(() => {
  nextTick(() => renderChart());
});

watch(() => props.data, () => {
  nextTick(() => renderChart());
}, { deep: true });

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
});
</script>

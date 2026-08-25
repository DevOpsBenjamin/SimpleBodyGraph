<template>
  <div v-if="data && data.length > 0" class="glass-card p-4 sm:p-5 rounded-3xl shadow-lg space-y-4">
    <!-- Header & Segment Toggle Pills -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-800/80">
      <div>
        <h3 class="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
          <span :class="['w-2.5 h-2.5 rounded-full animate-pulse', type === 'muscle' ? 'bg-emerald-400' : 'bg-amber-400']"></span>
          {{ title }}
        </h3>
        <p class="text-[11px] text-gray-400">
          Évolution segmentaire par zone anatomique (DEXA 8 électrodes)
        </p>
      </div>

      <!-- Quick Segment Toggles -->
      <div class="flex items-center flex-wrap gap-1.5">
        <button
          v-for="seg in segments"
          :key="seg.key"
          type="button"
          @click="toggleSegment(seg.key)"
          :class="[
            'px-2 py-0.5 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all duration-150 flex items-center gap-1.5 cursor-pointer select-none border',
            activeSegments[seg.key]
              ? seg.activeClass
              : 'bg-gray-950/60 border-gray-800 text-gray-500 hover:text-gray-400'
          ]"
        >
          <span :class="['w-2 h-2 rounded-full', activeSegments[seg.key] ? seg.dotColor : 'bg-gray-600']"></span>
          {{ seg.label }}
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
import { ref, reactive, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { Chart, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';
import { getScaleLimits } from '../utils/chartHelpers';

Chart.register(...registerables);

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  type: {
    type: String, // 'muscle' | 'fat'
    default: 'muscle'
  },
  data: {
    type: Array, // [{ date, muscle: { total, trunk, rightArm, leftArm, rightLeg, leftLeg }, fat: {...} }]
    default: () => []
  },
  timeScaleOptions: {
    type: Object,
    required: true
  }
});

const canvasRef = ref(null);
let chartInstance = null;

const segments = [
  { key: 'total', label: props.type === 'muscle' ? 'Total SMM' : 'Total Gras', dotColor: 'bg-violet-400', color: 'rgba(167, 139, 250, 1)', activeClass: 'bg-violet-600/20 border-violet-500/50 text-violet-300' },
  { key: 'trunk', label: 'Tronc', dotColor: 'bg-amber-400', color: 'rgba(251, 191, 36, 1)', activeClass: 'bg-amber-600/20 border-amber-500/50 text-amber-300' },
  { key: 'rightArm', label: 'Bras D.', dotColor: 'bg-cyan-400', color: 'rgba(34, 211, 238, 1)', activeClass: 'bg-cyan-600/20 border-cyan-500/50 text-cyan-300' },
  { key: 'leftArm', label: 'Bras G.', dotColor: 'bg-sky-400', color: 'rgba(56, 189, 248, 1)', activeClass: 'bg-sky-600/20 border-sky-500/50 text-sky-300' },
  { key: 'rightLeg', label: 'Jambe D.', dotColor: 'bg-emerald-400', color: 'rgba(52, 211, 153, 1)', activeClass: 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300' },
  { key: 'leftLeg', label: 'Jambe G.', dotColor: 'bg-lime-400', color: 'rgba(163, 230, 53, 1)', activeClass: 'bg-lime-600/20 border-lime-500/50 text-lime-300' }
];

const activeSegments = reactive({
  total: true,
  trunk: true,
  rightArm: true,
  leftArm: true,
  rightLeg: true,
  leftLeg: true
});

const toggleSegment = (key) => {
  activeSegments[key] = !activeSegments[key];
  nextTick(renderChart);
};

const renderChart = () => {
  if (!canvasRef.value || props.data.length === 0) return;

  const ctx = canvasRef.value.getContext('2d');
  const metricKey = props.type; // 'muscle' or 'fat'

  const datasets = [];
  segments.forEach(seg => {
    if (activeSegments[seg.key]) {
      const points = props.data.map(d => ({
        x: d.date,
        y: d[metricKey]?.[seg.key] ?? null
      })).filter(p => p.y !== null && !isNaN(p.y));

      if (points.length > 0) {
        datasets.push({
          label: `${seg.label} (kg)`,
          data: points,
          borderColor: seg.color,
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.35,
          pointRadius: 3.5,
          pointHoverRadius: 6,
          pointBackgroundColor: seg.color,
          borderWidth: seg.key === 'total' ? 2.5 : 1.8,
          borderDash: seg.key === 'total' ? [] : [3, 2]
        });
      }
    }
  });

  const allActiveValues = datasets.flatMap(d => d.data.map(p => p.y)).filter(v => v !== null && !isNaN(v));
  const { min, max } = getScaleLimits(allActiveValues, 'weight');

  if (chartInstance) {
    chartInstance.destroy();
  }

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
          position: 'bottom',
          labels: {
            color: '#9ca3af',
            boxWidth: 8,
            font: { size: 10, weight: '500' }
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
              return ` ${context.dataset.label}: ${context.parsed.y.toFixed(1)} kg`;
            }
          }
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
  () => [props.data, props.timeScaleOptions],
  () => {
    nextTick(renderChart);
  },
  { deep: true }
);
</script>

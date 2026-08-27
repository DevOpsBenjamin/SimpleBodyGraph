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
          {{ $t('charts.segmentalDexaDesc') }}
        </p>
      </div>

      <!-- Quick Segment Toggles -->
      <div class="flex items-center flex-wrap gap-1.5">
        <button
          v-for="seg in segments"
          :key="seg.key"
          type="button"
          @click="toggleSegment(seg.key)"
          :style="activeSegments[seg.key] ? { backgroundColor: `${seg.color}22`, borderColor: `${seg.color}66`, color: seg.color } : {}"
          :class="[
            'px-2 py-0.5 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all duration-150 flex items-center gap-1.5 cursor-pointer select-none border',
            !activeSegments[seg.key] ? 'bg-gray-950/60 border-gray-800 text-gray-500 hover:text-gray-400' : ''
          ]"
        >
          <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: activeSegments[seg.key] ? seg.color : '#4b5563' }"></span>
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
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { Chart, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';
import { useBodyGraphStore, DEFAULT_DISPLAY_PREFERENCES } from '../stores/bodyGraph';
import { getScaleLimits } from '../utils/chartHelpers';
import { useI18n } from '../i18n';

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

const store = useBodyGraphStore();
const { t, currentLanguage } = useI18n();
const canvasRef = ref(null);
let chartInstance = null;

const colors = computed(() => {
  return store.displayPreferences?.segmentalColors?.[props.type] || DEFAULT_DISPLAY_PREFERENCES.segmentalColors[props.type];
});

const defaultVisibility = computed(() => {
  return store.displayPreferences?.segmentalVisibility?.[props.type] || DEFAULT_DISPLAY_PREFERENCES.segmentalVisibility[props.type];
});

const segments = computed(() => [
  { key: 'total', label: props.type === 'muscle' ? t('charts.segments.totalSmm') : t('charts.segments.totalFat'), color: colors.value.total },
  { key: 'trunk', label: t('charts.segments.trunk'), color: colors.value.trunk },
  { key: 'rightArm', label: t('charts.segments.rightArm'), color: colors.value.rightArm },
  { key: 'leftArm', label: t('charts.segments.leftArm'), color: colors.value.leftArm },
  { key: 'rightLeg', label: t('charts.segments.rightLeg'), color: colors.value.rightLeg },
  { key: 'leftLeg', label: t('charts.segments.leftLeg'), color: colors.value.leftLeg }
]);

const activeSegments = reactive({
  total: true,
  trunk: true,
  rightArm: true,
  leftArm: true,
  rightLeg: true,
  leftLeg: true
});

watch(defaultVisibility, (val) => {
  if (val) {
    Object.assign(activeSegments, val);
  }
}, { immediate: true, deep: true });

const toggleSegment = (key) => {
  activeSegments[key] = !activeSegments[key];
  nextTick(renderChart);
};

const renderChart = () => {
  if (!canvasRef.value || props.data.length === 0) return;

  const ctx = canvasRef.value.getContext('2d');
  const metricKey = props.type; // 'muscle' or 'fat'

  const datasets = [];
  segments.value.forEach(seg => {
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
        tooltip: { enabled: false }
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
  () => [props.data, props.timeScaleOptions, colors.value, currentLanguage.value],
  () => {
    nextTick(renderChart);
  },
  { deep: true }
);
</script>


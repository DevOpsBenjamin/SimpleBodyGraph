<template>
  <div class="glass-card p-4 sm:p-5 rounded-3xl shadow-lg">
    <h3 class="text-xs font-semibold text-gray-300 mb-4 flex items-center gap-2">
      <span :class="['w-2 h-2 rounded-full animate-pulse', theme.dotBg]"></span>
      {{ title }}
    </h3>
    <div class="relative h-[240px] w-full">
      <canvas ref="canvasRef"></canvas>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { Chart, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';
import { 
  goalLinePlugin, 
  getGoalLinesForMetric, 
  getScaleLimits, 
  CHART_THEMES 
} from '../utils/chartHelpers';

Chart.register(...registerables);

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  metricType: {
    type: String, // 'weight' | 'lean' | 'fat' | 'fat_mass'
    required: true
  },
  colorType: {
    type: String, // 'violet' | 'blue' | 'emerald' | 'amber'
    default: 'violet'
  },
  medianData: {
    type: Array,
    default: () => []
  },
  averageData: {
    type: Array,
    default: () => []
  },
  medianLabel: {
    type: String,
    default: 'Median'
  },
  averageLabel: {
    type: String,
    default: 'Average'
  },
  unit: {
    type: String,
    default: ' kg'
  },
  paliers: {
    type: Array,
    default: () => []
  },
  activePalier: {
    type: Object,
    default: null
  },
  timeScaleOptions: {
    type: Object,
    required: true
  }
});

const canvasRef = ref(null);
let chartInstance = null;

const theme = computed(() => {
  return CHART_THEMES[props.colorType] || CHART_THEMES.violet;
});

const renderChart = () => {
  if (!canvasRef.value) return;
  if (props.medianData.length === 0 && props.averageData.length === 0) {
    if (chartInstance) {
      chartInstance.data.datasets[0].data = [];
      chartInstance.data.datasets[1].data = [];
      chartInstance.update();
    }
    return;
  }

  const ctx = canvasRef.value.getContext('2d');
  const t = theme.value;

  const strokeGrad = ctx.createLinearGradient(0, 0, 0, 300);
  strokeGrad.addColorStop(0, t.strokeStart);
  strokeGrad.addColorStop(1, t.strokeEnd);

  const fillGrad = ctx.createLinearGradient(0, 0, 0, 250);
  fillGrad.addColorStop(0, t.fillColor);
  fillGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  const scaleLimits = getScaleLimits(
    [props.medianData, props.averageData], 
    props.metricType, 
    props.paliers, 
    props.activePalier
  );

  const goalLines = getGoalLinesForMetric(props.metricType, props.paliers, props.activePalier);

  if (chartInstance) {
    chartInstance.data.datasets[0].label = props.medianLabel;
    chartInstance.data.datasets[0].data = props.medianData;
    chartInstance.data.datasets[0].borderColor = strokeGrad;
    chartInstance.data.datasets[0].pointBorderColor = t.pointBorder;
    chartInstance.data.datasets[0].backgroundColor = fillGrad;

    chartInstance.data.datasets[1].label = props.averageLabel;
    chartInstance.data.datasets[1].data = props.averageData;
    chartInstance.data.datasets[1].borderColor = t.avgBorder;
    chartInstance.data.datasets[1].pointBorderColor = t.avgBorder;

    chartInstance.options.plugins.goalLine = {
      lines: goalLines,
      unit: props.unit
    };

    if (scaleLimits.min !== undefined) {
      chartInstance.options.scales.y.min = scaleLimits.min;
      chartInstance.options.scales.y.max = scaleLimits.max;
    } else {
      delete chartInstance.options.scales.y.min;
      delete chartInstance.options.scales.y.max;
    }
    chartInstance.options.scales.x = props.timeScaleOptions;

    chartInstance.update();
    return;
  }

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [
        {
          label: props.medianLabel,
          data: props.medianData,
          borderColor: strokeGrad,
          borderWidth: 3,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: t.pointBorder,
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          fill: true,
          backgroundColor: fillGrad,
          tension: 0.3
        },
        {
          label: props.averageLabel,
          data: props.averageData,
          borderColor: t.avgBorder,
          borderWidth: 2,
          borderDash: [4, 4],
          pointBackgroundColor: '#ffffff',
          pointBorderColor: t.avgBorder,
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
        tooltip: { enabled: false },
        goalLine: {
          lines: goalLines,
          unit: props.unit
        }
      },
      scales: {
        y: {
          ...scaleLimits,
          grid: { color: 'rgba(75, 85, 99, 0.08)' },
          ticks: { color: '#9ca3af', font: { family: 'Outfit', size: 11 } }
        },
        x: props.timeScaleOptions
      }
    },
    plugins: [goalLinePlugin]
  });
};

watch(
  [
    () => props.medianData,
    () => props.averageData,
    () => props.paliers,
    () => props.activePalier,
    () => props.timeScaleOptions
  ],
  () => {
    nextTick(() => {
      renderChart();
    });
  },
  { deep: true }
);

onMounted(() => {
  nextTick(() => {
    renderChart();
  });
});

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
});
</script>

<template>
  <div class="space-y-6">
    <!-- Measurement Charts -->
    <div v-if="store.measurements.length > 0" class="glass-card p-4 sm:p-6 rounded-3xl space-y-8">
      <div class="h-[250px] sm:h-[300px] w-full relative">
        <canvas ref="measurementChartRef"></canvas>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="store.measurements.length === 0" class="glass-card p-10 rounded-3xl text-center flex flex-col items-center justify-center">
      <div class="w-16 h-16 bg-gray-950 rounded-2xl flex items-center justify-center border border-gray-800/60 text-gray-500 mb-4">
        <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21.54 15H17a2 2 0 0 0-2 2v4.54"></path>
            <path d="M7 3.34V5a3 3 0 0 0 3 3h0a2 2 0 0 1 2 2v0a2 2 0 0 0 2 2h0a2 2 0 0 1 2 2v0a2 2 0 0 0 2 2h0a2 2 0 0 1 2 2v0a2 2 0 0 0 2 2h.46"></path>
            <path d="M11 21.95V18a2 2 0 0 0-2-2h0a2 2 0 0 1-2-2v0a2 2 0 0 0-2-2h0a2 2 0 0 1-2-2v0a2 2 0 0 0-2-2h0a2 2 0 0 1-2-2V2.05"></path>
            <circle cx="12" cy="12" r="10"></circle>
        </svg>
      </div>
      <h3 class="text-lg font-semibold text-white mb-1">{{ $t('measurements.emptyTitle') }}</h3>
      <p class="text-sm text-gray-400 max-w-xs mb-6">{{ $t('measurements.emptyDesc') }}</p>
      <button
        @click="store.showAddMeasurementModal = true"
        class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium rounded-xl transition-all duration-200 flex items-center gap-2 cursor-pointer"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        {{ $t('measurements.addMeasurement') }}
      </button>
    </div>

    <!-- Measurement History List -->
    <div v-else class="space-y-3 max-w-2xl">
      <div
        v-for="log in store.sortedMeasurements"
        :key="log.id"
        class="glass-card hover:bg-gray-900/30 p-4 rounded-2xl flex items-center justify-between transition-all duration-300"
      >
        <!-- Details -->
        <div class="flex items-center gap-4">
          <!-- Date Circle -->
          <div class="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-gray-900 border border-gray-800 text-center">
            <span class="text-[10px] text-gray-400 uppercase leading-none font-semibold">{{ formatShortMonth(log.date) }}</span>
            <span class="text-lg font-bold text-white leading-none mt-0.5">{{ formatDay(log.date) }}</span>
          </div>

          <!-- Metrics Info -->
          <div class="flex flex-wrap items-center gap-x-5 gap-y-2">
            <div v-if="log.waist">
              <div class="text-xs text-gray-400">{{ $t('measurements.waist') }}</div>
              <div class="text-sm font-bold text-indigo-400 flex items-baseline gap-1">
                <span>{{ Number(log.waist).toFixed(1) }} <span class="text-[10px] font-normal text-gray-400">{{ $t('common.cm') }}</span></span>
              </div>
            </div>
            <div v-if="log.chest">
              <div class="text-xs text-gray-400">{{ $t('measurements.chest') }}</div>
              <div class="text-sm font-bold text-sky-400 flex items-baseline gap-1">
                <span>{{ Number(log.chest).toFixed(1) }} <span class="text-[10px] font-normal text-gray-500">{{ $t('common.cm') }}</span></span>
              </div>
            </div>
            <div v-if="log.arms">
              <div class="text-xs text-gray-400">{{ $t('measurements.arms') }}</div>
              <div class="text-sm font-bold text-emerald-400 flex items-baseline gap-1">
                <span>{{ Number(log.arms).toFixed(1) }} <span class="text-[10px] font-normal text-gray-400">{{ $t('common.cm') }}</span></span>
              </div>
            </div>
            <div v-if="log.thighs">
              <div class="text-xs text-gray-400">{{ $t('measurements.thighs') }}</div>
              <div class="text-sm font-bold text-amber-500 flex items-baseline gap-1">
                <span>{{ Number(log.thighs).toFixed(1) }} <span class="text-[10px] font-normal text-gray-500">{{ $t('common.cm') }}</span></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Sync Status and Action -->
        <div class="flex items-center gap-3 ml-2 shrink-0">
          <!-- Sync Icon Indicator -->
          <div :title="log.synced ? $t('measurements.syncedTooltip') : $t('measurements.unsyncedTooltip')">
            <svg v-if="log.synced" class="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"></path><polyline points="8 11 12 15 16 11"></polyline></svg>
            <div v-else class="flex items-center justify-center relative">
              <span class="absolute w-3 h-3 rounded-full bg-amber-400/20 animate-ping"></span>
              <svg class="w-4 h-4 text-amber-400 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"></path><polyline points="13 14 11 18 14 18 12 22"></polyline></svg>
            </div>
          </div>

          <!-- Edit Button -->
          <button
            @click="store.setEditingMeasurement(log)"
            class="p-2 rounded-xl hover:bg-indigo-500/10 text-gray-500 hover:text-indigo-400 active:bg-indigo-500/20 transition-all duration-200 cursor-pointer"
            :title="$t('measurements.editTitle')"
            :aria-label="$t('measurements.editTitle')"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>

          <!-- Delete Button -->
          <button
            @click="handleDelete(log.id)"
            class="p-2 rounded-xl hover:bg-rose-500/10 text-gray-500 hover:text-rose-400 active:bg-rose-500/20 transition-all duration-200 cursor-pointer"
            :title="$t('measurements.deleteTitle')"
            :aria-label="$t('measurements.deleteTitle')"
          >
            <svg class="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onBeforeUnmount, nextTick } from 'vue';
import { useBodyGraphStore } from '../stores/bodyGraph';
import { Chart, registerables } from 'chart.js';
import { useConfirm } from '../composables/useConfirm';
import { useToast } from '../composables/useToast';
import { useI18n } from '../i18n';

Chart.register(...registerables);

const store = useBodyGraphStore();
const { confirm } = useConfirm();
const toast = useToast();
const { t, formatShortMonth, formatDay, currentLanguage } = useI18n();
const measurementChartRef = ref(null);
let measurementChartInstance = null;

const handleDelete = async (id) => {
  const confirmed = await confirm({
    title: t('measurements.deleteConfirmTitle'),
    message: t('measurements.deleteConfirmMsg'),
    confirmText: t('measurements.deleteConfirmBtn'),
    cancelText: t('common.cancel'),
    variant: 'danger'
  });

  if (confirmed) {
    try {
      await store.deleteMeasurementEntry(id);
      toast.success(t('measurements.deleteSuccessToast'));
    } catch (error) {
      toast.error(t('measurements.deleteErrorToast') + error.message);
    }
  }
};

const renderChart = async () => {
  await nextTick();
  if (!measurementChartRef.value) return;

  // Use sorted measurements ascending for chronological chart plotting
  const chronologicalLogs = [...store.measurements].sort((a, b) => a.date.localeCompare(b.date));

  if (chronologicalLogs.length === 0) {
    if (measurementChartInstance) {
      measurementChartInstance.data.labels = [];
      measurementChartInstance.data.datasets.forEach(d => d.data = []);
      measurementChartInstance.update();
    }
    return;
  }

  const labels = chronologicalLogs.map(log => {
    const d = new Date(log.date);
    const locale = currentLanguage.value === 'en' ? 'en-US' : 'fr-FR';
    return `${d.toLocaleString(locale, { month: 'short', timeZone: 'UTC' })} ${d.getUTCDate()}`;
  });

  const waistData = chronologicalLogs.map(log => log.waist || null);
  const chestData = chronologicalLogs.map(log => log.chest || null);
  const armsData = chronologicalLogs.map(log => log.arms || null);
  const thighsData = chronologicalLogs.map(log => log.thighs || null);

  if (measurementChartInstance) {
    measurementChartInstance.data.labels = labels;
    measurementChartInstance.data.datasets[0].label = t('measurements.waist');
    measurementChartInstance.data.datasets[0].data = waistData;
    measurementChartInstance.data.datasets[1].label = t('measurements.chest');
    measurementChartInstance.data.datasets[1].data = chestData;
    measurementChartInstance.data.datasets[2].label = t('measurements.arms');
    measurementChartInstance.data.datasets[2].data = armsData;
    measurementChartInstance.data.datasets[3].label = t('measurements.thighs');
    measurementChartInstance.data.datasets[3].data = thighsData;
    measurementChartInstance.update();
    return;
  }

  const ctx = measurementChartRef.value.getContext('2d');
  measurementChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: t('measurements.waist'),
          data: waistData,
          borderColor: '#818cf8', // indigo-400
          backgroundColor: '#818cf8',
          borderWidth: 2,
          pointBackgroundColor: '#111827',
          pointBorderColor: '#818cf8',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          spanGaps: true,
          tension: 0.3
        },
        {
          label: t('measurements.chest'),
          data: chestData,
          borderColor: '#38bdf8', // sky-400
          backgroundColor: '#38bdf8',
          borderWidth: 2,
          pointBackgroundColor: '#111827',
          pointBorderColor: '#38bdf8',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          spanGaps: true,
          tension: 0.3
        },
        {
          label: t('measurements.arms'),
          data: armsData,
          borderColor: '#34d399', // emerald-400
          backgroundColor: '#34d399',
          borderWidth: 2,
          pointBackgroundColor: '#111827',
          pointBorderColor: '#34d399',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          spanGaps: true,
          tension: 0.3
        },
        {
          label: t('measurements.thighs'),
          data: thighsData,
          borderColor: '#fbbf24', // amber-400
          backgroundColor: '#fbbf24',
          borderWidth: 2,
          pointBackgroundColor: '#111827',
          pointBorderColor: '#fbbf24',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          spanGaps: true,
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          labels: {
            color: '#9ca3af',
            usePointStyle: true,
            boxWidth: 8
          }
        },
        tooltip: { enabled: false }
      },
      scales: {
        x: {
          grid: {
            display: false,
            drawBorder: false
          },
          ticks: {
            color: '#6b7280',
            font: {
              size: 10
            },
            maxTicksLimit: 6
          }
        },
        y: {
          grid: {
            color: 'rgba(55, 65, 81, 0.3)',
            drawBorder: false
          },
          ticks: {
            color: '#6b7280',
            font: {
              size: 10
            },
            callback: function(value) {
              return value + ' cm';
            }
          }
        }
      }
    }
  });
};

onMounted(() => {
  renderChart();
});

watch(() => [store.measurements, currentLanguage.value], () => {
  renderChart();
}, { deep: true });

onBeforeUnmount(() => {
  if (measurementChartInstance) {
    measurementChartInstance.destroy();
  }
});
</script>

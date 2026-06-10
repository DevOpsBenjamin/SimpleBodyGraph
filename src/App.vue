<template>
  <div class="min-h-screen bg-gray-950 text-gray-100 flex flex-col font-sans relative overflow-x-hidden">
    <!-- Neon Ambient Glows -->
    <div class="absolute top-0 left-1/4 -translate-x-1/2 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none animate-pulse-slow"></div>
    <div class="absolute bottom-10 right-1/4 translate-x-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>

    <!-- HEADER -->
    <header class="sticky top-0 z-30 w-full glass-card border-b border-gray-800/40 px-4 py-3 sm:px-6">
      <div class="max-w-6xl mx-auto flex items-center justify-between">
        <!-- Logo and Title -->
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center shadow-lg shadow-violet-500/10">
            <svg class="w-6 h-6 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="12" y1="20" x2="12" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
          </div>
          <div>
            <h1 class="text-xl font-bold tracking-tight text-white leading-tight font-sans">SimpleBodyGraph</h1>
            <p class="text-[10px] text-gray-400">Offline-first Tracker</p>
          </div>
        </div>

        <!-- Connection & Sync controls -->
        <div class="flex items-center gap-2">
          <!-- Online/Offline Badge -->
          <div 
            :class="[
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-300',
              isOnline 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
            ]"
          >
            <span :class="['w-1.5 h-1.5 rounded-full', isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400']"></span>
            {{ isOnline ? 'Online' : 'Offline' }}
          </div>

          <!-- Sync Trigger -->
          <button 
            @click="handleSync" 
            :disabled="isSyncing || !isOnline"
            class="p-2 rounded-xl glass-card text-gray-400 hover:text-white hover:bg-gray-800/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
            title="Sync Data"
          >
            <RefreshCw :class="['w-4 h-4', isSyncing ? 'animate-spin text-violet-400' : '']" />
          </button>
        </div>
      </div>
    </header>

    <!-- MAIN CONTAINER -->
    <main class="flex-grow max-w-6xl w-full mx-auto p-4 sm:p-6 pb-24 z-10">
      
      <!-- STATS OVERVIEW CARDS -->
      <section class="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <!-- Mass Card -->
        <div class="glass-card-violet p-4 rounded-2xl flex flex-col justify-between">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs text-violet-300/80 font-medium">Current Mass</span>
            <Scale class="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <div class="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-none">
              {{ stats.currentMass ? stats.currentMass.toFixed(1) : '--.-' }} <span class="text-sm font-normal text-gray-400">kg</span>
            </div>
            <div v-if="stats.massChange !== 0" class="flex items-center gap-1 mt-1.5 text-xs">
              <component 
                :is="stats.massChange < 0 ? TrendingDown : TrendingUp" 
                :class="[stats.massChange < 0 ? 'text-emerald-400' : 'text-amber-400', 'w-3 h-3']" 
              />
              <span :class="stats.massChange < 0 ? 'text-emerald-400' : 'text-amber-400'">
                {{ stats.massChange > 0 ? '+' : '' }}{{ stats.massChange.toFixed(1) }} kg
              </span>
              <span class="text-gray-500">last entry</span>
            </div>
            <div v-else class="text-[11px] text-gray-500 mt-1.5">No changes logged</div>
          </div>
        </div>

        <!-- Body Fat Card -->
        <div class="glass-card-emerald p-4 rounded-2xl flex flex-col justify-between">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs text-emerald-300/80 font-medium">Body Fat</span>
            <Percent class="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div class="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-none">
              {{ stats.currentFat ? stats.currentFat.toFixed(1) : '--.-' }} <span class="text-sm font-normal text-gray-400">%</span>
            </div>
            <div v-if="stats.fatChange !== 0" class="flex items-center gap-1 mt-1.5 text-xs">
              <component 
                :is="stats.fatChange < 0 ? TrendingDown : TrendingUp" 
                :class="[stats.fatChange < 0 ? 'text-emerald-400' : 'text-amber-400', 'w-3 h-3']" 
              />
              <span :class="stats.fatChange < 0 ? 'text-emerald-400' : 'text-amber-400'">
                {{ stats.fatChange > 0 ? '+' : '' }}{{ stats.fatChange.toFixed(1) }}%
              </span>
              <span class="text-gray-500">last entry</span>
            </div>
            <div v-else class="text-[11px] text-gray-500 mt-1.5">No changes logged</div>
          </div>
        </div>

        <!-- Log Count Card -->
        <div class="glass-card col-span-2 sm:col-span-1 p-4 rounded-2xl flex flex-col justify-between">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs text-gray-400 font-medium">Total Entries</span>
            <Activity class="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <div class="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-none">
              {{ logs.length }} <span class="text-sm font-normal text-gray-400">logs</span>
            </div>
            <div class="flex items-center gap-1.5 mt-1.5 text-xs text-gray-400">
              <span v-if="stats.unsyncedCount > 0" class="text-amber-400 flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                {{ stats.unsyncedCount }} pending sync
              </span>
              <span v-else class="text-emerald-400 flex items-center gap-1">
                All synced with Cloud
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- TAB CONTROLLER -->
      <section class="mb-6">
        <div class="flex p-1 rounded-xl bg-gray-900/80 border border-gray-800/60 max-w-sm">
          <button 
            @click="activeTab = 'charts'"
            :class="[
              'flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-300',
              activeTab === 'charts' 
                ? 'bg-violet-600/20 text-violet-300 border border-violet-500/20 shadow-md' 
                : 'text-gray-400 hover:text-gray-200'
            ]"
          >
            Dashboard
          </button>
          <button 
            @click="activeTab = 'history'"
            :class="[
              'flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-300',
              activeTab === 'history' 
                ? 'bg-violet-600/20 text-violet-300 border border-violet-500/20 shadow-md' 
                : 'text-gray-400 hover:text-gray-200'
            ]"
          >
            Logs History
          </button>
        </div>
      </section>

      <!-- DASHBOARD TAB (CHARTS) -->
      <section v-show="activeTab === 'charts'" class="space-y-6">
        <div v-if="logs.length === 0" class="glass-card p-10 rounded-3xl text-center flex flex-col items-center justify-center">
          <div class="w-16 h-16 bg-gray-950 rounded-2xl flex items-center justify-center border border-gray-800/60 text-gray-500 mb-4">
            <Scale class="w-8 h-8" />
          </div>
          <h3 class="text-lg font-semibold text-white mb-1">No Data Available</h3>
          <p class="text-sm text-gray-400 max-w-xs mb-6">Start logging your body mass and body fat percentage to render your progress charts.</p>
          <button 
            @click="showAddModal = true"
            class="px-4 py-2 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white font-medium rounded-xl transition-all duration-200 flex items-center gap-2"
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
      </section>

      <!-- HISTORY TAB -->
      <section v-show="activeTab === 'history'">
        <div v-if="logs.length === 0" class="glass-card p-10 rounded-3xl text-center flex flex-col items-center justify-center">
          <div class="w-16 h-16 bg-gray-950 rounded-2xl flex items-center justify-center border border-gray-800/60 text-gray-500 mb-4">
            <Calendar class="w-8 h-8" />
          </div>
          <h3 class="text-lg font-semibold text-white mb-1">No Entries Yet</h3>
          <p class="text-sm text-gray-400 max-w-xs mb-6">Your logged weight records will show up here.</p>
          <button 
            @click="showAddModal = true"
            class="px-4 py-2 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white font-medium rounded-xl transition-all duration-200 flex items-center gap-2"
          >
            <Plus class="w-4 h-4" /> Add New Log
          </button>
        </div>

        <div v-else class="space-y-3 max-w-2xl">
          <div 
            v-for="log in logs" 
            :key="log.id"
            class="glass-card hover:bg-gray-900/30 p-4 rounded-2xl flex items-center justify-between transition-all duration-300"
          >
            <!-- Details -->
            <div class="flex items-center gap-4">
              <!-- Date Circle -->
              <div class="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-gray-900 border border-gray-800 text-center">
                <span class="text-[10px] text-gray-400 uppercase leading-none font-semibold">{{ formatMonth(log.date) }}</span>
                <span class="text-lg font-bold text-white leading-none mt-0.5">{{ formatDay(log.date) }}</span>
              </div>
              
              <!-- Metrics Info -->
              <div class="flex items-center gap-5">
                <div>
                  <div class="text-xs text-gray-400">Mass</div>
                  <div class="text-sm font-bold text-white">{{ log.mass }} <span class="text-[10px] font-normal text-gray-400">kg</span></div>
                </div>
                <div>
                  <div class="text-xs text-gray-400">Body Fat</div>
                  <div class="text-sm font-bold text-white">{{ log.body_fat }} <span class="text-[10px] font-normal text-gray-400">%</span></div>
                </div>
              </div>
            </div>

            <!-- Sync Status and Action -->
            <div class="flex items-center gap-3">
              <!-- Sync Icon Indicator -->
              <div :title="log.synced ? 'Synced to Cloud' : 'Stored locally - pending sync'">
                <CloudCheck v-if="log.synced" class="w-4 h-4 text-emerald-400" />
                <div v-else class="flex items-center justify-center relative">
                  <span class="absolute w-3 h-3 rounded-full bg-amber-400/20 animate-ping"></span>
                  <CloudLightning class="w-4 h-4 text-amber-400 relative z-10" />
                </div>
              </div>

              <!-- Delete Button -->
              <button 
                @click="handleDeleteLog(log.id)"
                class="p-2 rounded-xl hover:bg-rose-500/10 text-gray-500 hover:text-rose-400 active:bg-rose-500/20 transition-all duration-200"
                title="Delete Entry"
              >
                <Trash2 class="w-4.5 h-4.5" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- FLOATING ACTION BUTTON (ADD LOG) -->
    <div class="fixed bottom-6 right-6 z-20">
      <button 
        @click="openFormModal"
        class="w-14 h-14 rounded-full bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white flex items-center justify-center shadow-lg shadow-violet-600/30 hover:scale-105 transition-all duration-300 select-none cursor-pointer"
        title="Add Log Entry"
      >
        <Plus class="w-8 h-8" />
      </button>
    </div>

    <!-- DIALOG FORM MODAL -->
    <div 
      v-if="showAddModal" 
      class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all duration-300"
    >
      <!-- Backdrop -->
      <div 
        @click="showAddModal = false" 
        class="absolute inset-0 bg-black/60 backdrop-blur-sm"
      ></div>

      <!-- Modal Card -->
      <div 
        class="w-full sm:max-w-md bg-gray-900 border-t sm:border border-gray-800 rounded-t-3xl sm:rounded-3xl p-6 relative z-10 shadow-2xl shadow-black max-h-[90vh] overflow-y-auto transform translate-y-0 transition-transform duration-300"
      >
        <!-- Modal Header -->
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-bold text-white flex items-center gap-2">
            <svg class="w-5 h-5 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
            Log Body Metrics
          </h2>
          <button 
            @click="showAddModal = false"
            class="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-all duration-200"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Form fields -->
        <form @submit.prevent="handleSaveLog" class="space-y-5">
          <!-- Date Field -->
          <div class="space-y-1.5">
            <label for="log-date" class="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</label>
            <div class="relative">
              <input 
                id="log-date"
                type="date" 
                v-model="form.date"
                required
                class="w-full px-4 py-3 rounded-xl glass-input text-sm text-white"
              />
            </div>
          </div>

          <!-- Grid: Mass and Body Fat -->
          <div class="grid grid-cols-2 gap-4">
            <!-- Mass Input -->
            <div class="space-y-1.5">
              <label for="log-mass" class="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Mass (kg)</label>
              <input 
                id="log-mass"
                type="number" 
                v-model.number="form.mass"
                placeholder="e.g. 78.5"
                step="0.1"
                min="20"
                max="300"
                required
                class="w-full px-4 py-3 rounded-xl glass-input text-sm text-white"
              />
            </div>

            <!-- Body Fat Input -->
            <div class="space-y-1.5">
              <label for="log-fat" class="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Body Fat (%)</label>
              <input 
                id="log-fat"
                type="number" 
                v-model.number="form.body_fat"
                placeholder="e.g. 14.2"
                step="0.1"
                min="1"
                max="70"
                required
                class="w-full px-4 py-3 rounded-xl glass-input text-sm text-white"
              />
            </div>
          </div>

          <!-- Submit Button -->
          <div class="pt-4 flex gap-3">
            <button 
              type="button" 
              @click="showAddModal = false"
              class="flex-1 py-3 text-sm font-semibold rounded-xl bg-gray-800 hover:bg-gray-750 text-gray-300 hover:text-white transition-all duration-200 border border-gray-700/50"
            >
              Cancel
            </button>
            <button 
              type="submit"
              class="flex-1 py-3 text-sm font-semibold rounded-xl bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white shadow-lg shadow-violet-600/20 hover:shadow-violet-600/30 transition-all duration-200"
            >
              Save Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue';
import { 
  Scale, Percent, Activity, Calendar, Trash2, Plus, X, RefreshCw, TrendingUp, TrendingDown,
  Cloud as CloudCheck, CloudLightning, Wifi, WifiOff
} from 'lucide-vue-next';
import { Chart, registerables } from 'chart.js';
import { getAllLogs, saveLog, deleteLog, syncLogs } from './db';

// Register Chart.js components
Chart.register(...registerables);

// STORES / STATE
const logs = ref([]);
const isOnline = ref(navigator.onLine);
const isSyncing = ref(false);
const showAddModal = ref(false);
const activeTab = ref('charts');

const form = reactive({
  date: '',
  mass: '',
  body_fat: ''
});

// Stats computed properties
const stats = computed(() => {
  const currentLogs = logs.value;
  const count = currentLogs.length;
  
  if (count === 0) {
    return {
      currentMass: null,
      currentFat: null,
      massChange: 0,
      fatChange: 0,
      unsyncedCount: 0
    };
  }

  // Logs are already sorted descending by date (logs[0] is most recent)
  const currentEntry = currentLogs[0];
  const prevEntry = currentLogs[1] || null;

  const unsyncedCount = currentLogs.filter(log => !log.synced).length;

  return {
    currentMass: Number(currentEntry.mass),
    currentFat: Number(currentEntry.body_fat),
    massChange: prevEntry ? Number(currentEntry.mass) - Number(prevEntry.mass) : 0,
    fatChange: prevEntry ? Number(currentEntry.body_fat) - Number(prevEntry.body_fat) : 0,
    unsyncedCount
  };
});

// Chart instance helpers
let wChartInstance = null;
let fChartInstance = null;
const weightChartCanvas = ref(null);
const fatChartCanvas = ref(null);

// Date formatting helpers
const formatMonth = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', { month: 'short' });
};

const formatDay = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  return parts[2] || '';
};

// Open Add modal resetting values to latest if available
const openFormModal = () => {
  form.date = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local format
  
  // Prefill with latest log entries if they exist to make input faster
  if (logs.value.length > 0) {
    form.mass = Number(logs.value[0].mass);
    form.body_fat = Number(logs.value[0].body_fat);
  } else {
    form.mass = '';
    form.body_fat = '';
  }
  showAddModal.value = true;
};

// CRUD handlers
const fetchLogsLocal = async () => {
  try {
    logs.value = await getAllLogs();
  } catch (error) {
    console.error('Failed to read logs from IndexedDB:', error);
  }
};

const handleSaveLog = async () => {
  const newLog = {
    id: crypto.randomUUID(),
    date: form.date,
    mass: Number(form.mass),
    body_fat: Number(form.body_fat),
    synced: false
  };

  try {
    await saveLog(newLog);
    showAddModal.value = false;
    await fetchLogsLocal();
    
    // Trigger sync non-blocking
    triggerBackgroundSync();
  } catch (error) {
    alert('Failed to save log entry locally: ' + error.message);
  }
};

const handleDeleteLog = async (id) => {
  if (confirm('Are you sure you want to delete this log entry?')) {
    try {
      await deleteLog(id);
      await fetchLogsLocal();
      
      // Trigger sync non-blocking
      triggerBackgroundSync();
    } catch (error) {
      alert('Failed to delete log entry: ' + error.message);
    }
  }
};

// Background Sync handlers
const triggerBackgroundSync = async () => {
  if (!isOnline.value) return;
  
  isSyncing.value = true;
  try {
    await syncLogs();
    await fetchLogsLocal();
  } catch (err) {
    console.warn('Sync failed:', err);
  } finally {
    isSyncing.value = false;
  }
};

const handleSync = async () => {
  if (!isOnline.value) return;
  isSyncing.value = true;
  try {
    const res = await syncLogs();
    if (res && res.success) {
      console.log('Synchronized database successfully.');
    }
    await fetchLogsLocal();
  } catch (error) {
    console.error('Manual sync failed:', error);
  } finally {
    isSyncing.value = false;
  }
};

// Render Charts
const updateCharts = () => {
  if (logs.value.length === 0 || activeTab.value !== 'charts') return;

  nextTick(() => {
    // Sort ascending for chart chronological display (left-to-right)
    const sortedLogs = [...logs.value].reverse();
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
      
      // Create gradient stroke
      const strokeGrad = ctx.createLinearGradient(0, 0, 0, 300);
      strokeGrad.addColorStop(0, '#a78bfa'); // violet-400
      strokeGrad.addColorStop(1, '#6366f1'); // indigo-500
      
      // Create gradient fill
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

// LIFECYCLE HOOKS
onMounted(async () => {
  // Read local data
  await fetchLogsLocal();

  // Network listeners
  window.addEventListener('online', () => {
    isOnline.value = true;
    triggerBackgroundSync();
  });
  
  window.addEventListener('offline', () => {
    isOnline.value = false;
  });

  // Initial Sync
  triggerBackgroundSync();

  // Watch for active tab or data changes to redraw charts
  watch([logs, activeTab], () => {
    updateCharts();
  }, { immediate: true });
});
</script>

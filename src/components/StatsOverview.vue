<template>
  <section class="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
    <!-- Mass Card -->
    <div class="glass-card-violet p-4 rounded-2xl flex flex-col justify-between">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs text-violet-300/80 font-medium">Current Mass</span>
        <Scale class="w-4 h-4 text-violet-400" />
      </div>
      <div>
        <div class="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-none">
          {{ store.stats.currentMass ? store.stats.currentMass.toFixed(2) : '--.--' }} <span class="text-sm font-normal text-gray-400">kg</span>
        </div>
        <!-- Sick / Outlier Badge & Estimate -->
        <div v-if="store.stats.currentIsSick" class="flex flex-col gap-1 mt-1.5 mb-1.5">
          <div class="inline-flex items-center gap-1 self-start px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-400 font-semibold uppercase tracking-wider">
            <Thermometer class="w-3 h-3" /> Sick Outlier
          </div>
          <span class="text-[10px] text-gray-400">Trend Estimate: <strong class="text-white">{{ store.stats.currentEstimatedMass ? store.stats.currentEstimatedMass.toFixed(2) : '--.--' }} kg</strong></span>
        </div>
        <div v-if="store.stats.massChange !== 0" class="flex items-center gap-1 mt-1.5 text-xs">
          <component 
            :is="store.stats.massChange < 0 ? TrendingDown : TrendingUp" 
            :class="[store.stats.massChange < 0 ? 'text-emerald-400' : 'text-amber-400', 'w-3 h-3']" 
          />
          <span :class="store.stats.massChange < 0 ? 'text-emerald-400' : 'text-amber-400'">
            {{ store.stats.massChange > 0 ? '+' : '' }}{{ store.stats.massChange.toFixed(2) }} kg
          </span>
          <span class="text-gray-500">last entry</span>
        </div>
        <div v-else class="text-[11px] text-gray-500 mt-1.5">No changes logged</div>
      </div>
      <!-- Goal target info -->
      <div v-if="store.targetMass !== null" class="flex items-center justify-between mt-2 pt-2 border-t border-violet-500/10 text-[10px] text-violet-300/60 font-medium font-sans">
        <span>Target: {{ store.targetMass.toFixed(2) }} kg</span>
        <span v-if="store.stats.currentMass">
          <span v-if="store.stats.currentMass > store.targetMass">
            {{ (store.stats.currentMass - store.targetMass).toFixed(2) }} kg to lose
          </span>
          <span v-else-if="store.stats.currentMass < store.targetMass">
            {{ (store.targetMass - store.stats.currentMass).toFixed(2) }} kg to gain
          </span>
          <span v-else class="text-emerald-400 font-bold">
            🎉 Goal met!
          </span>
        </span>
      </div>
      <button 
        v-else 
        @click="store.showSettingsModal = true"
        class="mt-2 pt-2 border-t border-dashed border-violet-500/10 text-[10px] text-violet-400/80 hover:text-violet-300 font-medium cursor-pointer w-full text-left transition-colors duration-150 font-sans"
      >
        + Set target weight
      </button>
    </div>

    <!-- Body Fat Card -->
    <div class="glass-card-emerald p-4 rounded-2xl flex flex-col justify-between">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs text-emerald-300/80 font-medium">Body Fat</span>
        <Percent class="w-4 h-4 text-emerald-400" />
      </div>
      <div>
        <div class="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-none">
          {{ store.stats.currentFat ? store.stats.currentFat.toFixed(1) : '--.-' }} <span class="text-sm font-normal text-gray-400">%</span>
        </div>
        <!-- Sick / Outlier Badge & Estimate -->
        <div v-if="store.stats.currentIsSick" class="flex flex-col gap-1 mt-1.5 mb-1.5">
          <div class="inline-flex items-center gap-1 self-start px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-400 font-semibold uppercase tracking-wider">
            <Thermometer class="w-3 h-3" /> Sick Outlier
          </div>
          <span class="text-[10px] text-gray-400">Trend Estimate: <strong class="text-white">{{ store.stats.currentEstimatedFat ? store.stats.currentEstimatedFat.toFixed(1) : '--.-' }}%</strong></span>
        </div>
        <div v-if="store.stats.fatChange !== 0" class="flex items-center gap-1 mt-1.5 text-xs">
          <component 
            :is="store.stats.fatChange < 0 ? TrendingDown : TrendingUp" 
            :class="[store.stats.fatChange < 0 ? 'text-emerald-400' : 'text-amber-400', 'w-3 h-3']" 
          />
          <span :class="store.stats.fatChange < 0 ? 'text-emerald-400' : 'text-amber-400'">
            {{ store.stats.fatChange > 0 ? '+' : '' }}{{ store.stats.fatChange.toFixed(1) }}%
          </span>
          <span class="text-gray-500">last entry</span>
        </div>
        <div v-else class="text-[11px] text-gray-500 mt-1.5">No changes logged</div>
      </div>
      <!-- Goal target info -->
      <div v-if="store.targetFat !== null" class="flex items-center justify-between mt-2 pt-2 border-t border-emerald-500/10 text-[10px] text-emerald-300/60 font-medium font-sans">
        <span>Target: {{ store.targetFat.toFixed(1) }}%</span>
        <span v-if="store.stats.currentFat">
          <span v-if="store.stats.currentFat > store.targetFat">
            {{ (store.stats.currentFat - store.targetFat).toFixed(1) }}% to lose
          </span>
          <span v-else-if="store.stats.currentFat < store.targetFat">
            {{ (store.targetFat - store.stats.currentFat).toFixed(1) }}% to gain
          </span>
          <span v-else class="text-emerald-400 font-bold">
            🎉 Goal met!
          </span>
        </span>
      </div>
      <button 
        v-else 
        @click="store.showSettingsModal = true"
        class="mt-2 pt-2 border-t border-dashed border-emerald-500/10 text-[10px] text-emerald-400/80 hover:text-emerald-300 font-medium cursor-pointer w-full text-left transition-colors duration-150 font-sans"
      >
        + Set target fat %
      </button>
    </div>

    <!-- Log Count Card -->
    <div class="glass-card col-span-2 sm:col-span-1 p-4 rounded-2xl flex flex-col justify-between">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs text-gray-400 font-medium">Total Entries</span>
        <Activity class="w-4 h-4 text-violet-400" />
      </div>
      <div>
        <div class="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-none">
          {{ store.logs.length }} <span class="text-sm font-normal text-gray-400">logs</span>
        </div>
        <div class="flex items-center gap-1.5 mt-1.5 text-xs text-gray-400">
          <span v-if="store.stats.unsyncedCount > 0" class="text-amber-400 flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
            {{ store.stats.unsyncedCount }} pending sync
          </span>
          <span v-else class="text-emerald-400 flex items-center gap-1">
            All synced with Cloud
          </span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { Scale, Percent, Activity, TrendingUp, TrendingDown, Thermometer } from 'lucide-vue-next';
import { useBodyGraphStore } from '../stores/bodyGraph';

const store = useBodyGraphStore();
</script>

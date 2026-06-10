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
          {{ store.stats.currentMass ? store.stats.currentMass.toFixed(1) : '--.-' }} <span class="text-sm font-normal text-gray-400">kg</span>
        </div>
        <div v-if="store.stats.massChange !== 0" class="flex items-center gap-1 mt-1.5 text-xs">
          <component 
            :is="store.stats.massChange < 0 ? TrendingDown : TrendingUp" 
            :class="[store.stats.massChange < 0 ? 'text-emerald-400' : 'text-amber-400', 'w-3 h-3']" 
          />
          <span :class="store.stats.massChange < 0 ? 'text-emerald-400' : 'text-amber-400'">
            {{ store.stats.massChange > 0 ? '+' : '' }}{{ store.stats.massChange.toFixed(1) }} kg
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
          {{ store.stats.currentFat ? store.stats.currentFat.toFixed(1) : '--.-' }} <span class="text-sm font-normal text-gray-400">%</span>
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
import { Scale, Percent, Activity, TrendingUp, TrendingDown } from 'lucide-vue-next';
import { useBodyGraphStore } from '../stores/bodyGraph';

const store = useBodyGraphStore();
</script>

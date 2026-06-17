<template>
  <section class="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-6">
    <!-- Mass Card (Primary, full width on mobile) -->
    <div class="col-span-2 md:col-span-1 glass-card-violet p-4 rounded-2xl flex flex-col justify-between">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs text-violet-300/80 font-medium">
          Current Mass
          <span class="text-[10px] text-violet-400/60 font-sans font-normal ml-1">7d Median</span>
        </span>
        <Scale class="w-4 h-4 text-violet-400" />
      </div>
      <div>
        <div class="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-none">
          {{ store.stats.rollingMedianMass ? store.stats.rollingMedianMass.toFixed(2) : '--.--' }} <span class="text-sm font-normal text-gray-400">kg</span>
        </div>

        <div v-if="store.stats.rollingMedianMassChange !== 0" class="flex items-center gap-1 mt-1.5 text-xs">
          <component 
            :is="store.stats.rollingMedianMassChange < 0 ? TrendingDown : TrendingUp" 
            :class="[massTrendClass, 'w-3 h-3']" 
          />
          <span :class="massTrendClass">
            {{ store.stats.rollingMedianMassChange > 0 ? '+' : '' }}{{ store.stats.rollingMedianMassChange.toFixed(2) }} kg
          </span>
          <span class="text-gray-500">vs 7d ago</span>
        </div>
        <div v-else class="text-[11px] text-gray-500 mt-1.5">No 7d change</div>
      </div>
      <!-- Goal target info -->
      <div v-if="store.targetMass !== null" class="flex items-center justify-between mt-2 pt-2 border-t border-violet-500/10 text-[10px] text-violet-300/60 font-medium font-sans">
        <span>Target: {{ store.targetMass.toFixed(2) }} kg</span>
        <span v-if="store.stats.rollingMedianMass">
          <span v-if="store.stats.rollingMedianMass > store.targetMass">
            {{ (store.stats.rollingMedianMass - store.targetMass).toFixed(2) }} kg to lose
          </span>
          <span v-else-if="store.stats.rollingMedianMass < store.targetMass">
            {{ (store.targetMass - store.stats.rollingMedianMass).toFixed(2) }} kg to gain
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

    <!-- Body Fat Card (Half width on mobile) -->
    <div class="col-span-1 glass-card-emerald p-4 rounded-2xl flex flex-col justify-between">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs text-emerald-300/80 font-medium">
          Body Fat
          <span class="text-[10px] text-emerald-400/60 font-sans font-normal ml-1">7d Median</span>
        </span>
        <Percent class="w-4 h-4 text-emerald-400" />
      </div>
      <div>
        <div class="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-none">
          {{ store.stats.rollingMedianFat ? store.stats.rollingMedianFat.toFixed(1) : '--.-' }} <span class="text-sm font-normal text-gray-400">%</span>
        </div>

        <div v-if="store.stats.rollingMedianFatChange !== 0" class="flex items-center gap-1 mt-1.5 text-xs">
          <component 
            :is="store.stats.rollingMedianFatChange < 0 ? TrendingDown : TrendingUp" 
            :class="[fatTrendClass, 'w-3 h-3']" 
          />
          <span :class="fatTrendClass">
            {{ store.stats.rollingMedianFatChange > 0 ? '+' : '' }}{{ store.stats.rollingMedianFatChange.toFixed(1) }}%
          </span>
          <span class="text-gray-500">vs 7d ago</span>
        </div>
        <div v-else class="text-[11px] text-gray-500 mt-1.5">No 7d change</div>
      </div>
      <!-- Goal target info -->
      <div v-if="store.targetFat !== null" class="flex items-center justify-between mt-2 pt-2 border-t border-emerald-500/10 text-[10px] text-emerald-300/60 font-medium font-sans">
        <span>Target: {{ store.targetFat.toFixed(1) }}%</span>
        <span v-if="store.stats.rollingMedianFat">
          <span v-if="store.stats.rollingMedianFat > store.targetFat">
            {{ (store.stats.rollingMedianFat - store.targetFat).toFixed(1) }}% to lose
          </span>
          <span v-else-if="store.stats.rollingMedianFat < store.targetFat">
            {{ (store.targetFat - store.stats.rollingMedianFat).toFixed(1) }}% to gain
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

    <!-- Lean Mass Card (Half width on mobile) -->
    <div class="col-span-1 glass-card-blue p-4 rounded-2xl flex flex-col justify-between">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs text-blue-300/80 font-medium">
          Lean Mass
          <span class="text-[10px] text-blue-400/60 font-sans font-normal ml-1">7d Median</span>
        </span>
        <Dumbbell class="w-4 h-4 text-blue-400" />
      </div>
      <div>
        <div class="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-none">
          {{ store.stats.rollingMedianLeanMass ? store.stats.rollingMedianLeanMass.toFixed(2) : '--.--' }} <span class="text-sm font-normal text-gray-400">kg</span>
        </div>

        <div v-if="store.stats.rollingMedianLeanMassChange !== 0" class="flex items-center gap-1 mt-1.5 text-xs">
          <component 
            :is="store.stats.rollingMedianLeanMassChange < 0 ? TrendingDown : TrendingUp" 
            :class="[leanMassTrendClass, 'w-3 h-3']" 
          />
          <span :class="leanMassTrendClass">
            {{ store.stats.rollingMedianLeanMassChange > 0 ? '+' : '' }}{{ store.stats.rollingMedianLeanMassChange.toFixed(2) }} kg
          </span>
          <span class="text-gray-500">vs 7d ago</span>
        </div>
        <div v-else class="text-[11px] text-gray-500 mt-1.5">No 7d change</div>
      </div>
      <!-- Goal target info -->
      <div v-if="store.targetLeanMass !== null" class="flex items-center justify-between mt-2 pt-2 border-t border-blue-500/10 text-[10px] text-blue-300/60 font-medium font-sans">
        <span>Target: {{ store.targetLeanMass.toFixed(2) }} kg</span>
        <span v-if="store.stats.rollingMedianLeanMass">
          <span v-if="store.stats.rollingMedianLeanMass < store.targetLeanMass">
            {{ (store.targetLeanMass - store.stats.rollingMedianLeanMass).toFixed(2) }} kg to gain
          </span>
          <span v-else-if="store.stats.rollingMedianLeanMass > store.targetLeanMass">
            {{ (store.stats.rollingMedianLeanMass - store.targetLeanMass).toFixed(2) }} kg above target
          </span>
          <span v-else class="text-emerald-400 font-bold">
            🎉 Target met!
          </span>
        </span>
      </div>
      <div v-else class="mt-2 pt-2 border-t border-dashed border-blue-500/10 text-[10px] text-gray-600 font-medium font-sans">
        No target set
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { Scale, Percent, TrendingUp, TrendingDown, Dumbbell } from 'lucide-vue-next';
import { useBodyGraphStore } from '../stores/bodyGraph';

const store = useBodyGraphStore();

const massTrendClass = computed(() => {
  const change = store.stats.rollingMedianMassChange;
  if (!change) return 'text-gray-400';
  if (store.targetMass === null) return 'text-violet-400/80';
  
  const current = store.stats.rollingMedianMass || 0;
  const target = store.targetMass;
  const isGood = current > target ? change < 0 : change > 0;
  return isGood ? 'text-emerald-400' : 'text-amber-400';
});

const fatTrendClass = computed(() => {
  const change = store.stats.rollingMedianFatChange;
  if (!change) return 'text-gray-400';
  if (store.targetFat === null) return 'text-emerald-400/80';
  
  const current = store.stats.rollingMedianFat || 0;
  const target = store.targetFat;
  const isGood = current > target ? change < 0 : change > 0;
  return isGood ? 'text-emerald-400' : 'text-amber-400';
});

const leanMassTrendClass = computed(() => {
  const change = store.stats.rollingMedianLeanMassChange;
  if (!change) return 'text-gray-400';
  
  // Gaining lean mass is always good
  return change > 0 ? 'text-emerald-400' : 'text-amber-400';
});
</script>

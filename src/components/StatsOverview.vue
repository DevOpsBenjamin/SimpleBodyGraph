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
      <div v-if="store.activePalier && store.targetMass !== null" class="flex flex-col gap-0.5 mt-2 pt-2 border-t border-violet-500/10 text-[10px] text-violet-300/60 font-medium font-sans">
        <div class="flex items-center justify-between">
          <span class="text-violet-300 font-bold bg-violet-500/15 px-1.5 py-0.5 rounded">Palier {{ activePalierIndex + 1 }}</span>
          <span v-if="store.stats.rollingMedianMass">
            <span v-if="store.stats.rollingMedianMass > store.targetMass">
              {{ (store.stats.rollingMedianMass - store.targetMass).toFixed(2) }} kg à perdre
            </span>
            <span v-else-if="store.stats.rollingMedianMass < store.targetMass">
              {{ (store.targetMass - store.stats.rollingMedianMass).toFixed(2) }} kg à prendre
            </span>
            <span v-else class="text-emerald-400 font-bold">
              🎉 Palier atteint !
            </span>
          </span>
        </div>
        <div class="flex justify-between items-center text-[9px] text-violet-400/60">
          <span>Target: {{ store.targetMass.toFixed(2) }} kg ({{ store.targetFat ? store.targetFat.toFixed(1) + '%' : 'sans limite de graisse' }})</span>
        </div>
      </div>
      <div v-else-if="store.activePalier" class="flex flex-col gap-0.5 mt-2 pt-2 border-t border-violet-500/10 text-[10px] text-violet-300/60 font-medium font-sans">
        <div class="flex items-center justify-between">
          <span class="text-violet-300 font-bold bg-violet-500/15 px-1.5 py-0.5 rounded">Palier {{ activePalierIndex + 1 }}</span>
          <span class="text-emerald-400 font-bold">Sans objectif de poids</span>
        </div>
      </div>
      <div v-else-if="store.paliers.length > 0 && !store.activePalier" class="mt-2 pt-2 border-t border-violet-500/10 text-[10px] text-emerald-400 font-bold font-sans text-center">
        🎉 Tous les paliers validés !
      </div>
      <button 
        v-else 
        @click="store.activeView = 'settings'"
        class="mt-2 pt-2 border-t border-dashed border-violet-500/10 text-[10px] text-violet-400/80 hover:text-violet-300 font-medium cursor-pointer w-full text-left transition-colors duration-150 font-sans"
      >
        + Configurer les paliers
      </button>
    </div>

    <!-- Fat Mass Card (Half width on mobile) -->
    <div class="col-span-1 glass-card-amber p-4 rounded-2xl flex flex-col justify-between">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs text-amber-300/80 font-medium">
          Fat Mass
          <span class="text-[10px] text-amber-400/60 font-sans font-normal ml-1">7d Median</span>
        </span>
        <Flame class="w-4 h-4 text-amber-400" />
      </div>
      <div>
        <div class="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-none">
          {{ store.stats.rollingMedianFatMass ? store.stats.rollingMedianFatMass.toFixed(2) : '--.--' }} <span class="text-sm font-normal text-gray-400">kg</span>
        </div>

        <div v-if="store.stats.rollingMedianFatMassChange !== 0" class="flex items-center gap-1 mt-1.5 text-xs">
          <component 
            :is="store.stats.rollingMedianFatMassChange < 0 ? TrendingDown : TrendingUp" 
            :class="[fatMassTrendClass, 'w-3 h-3']" 
          />
          <span :class="fatMassTrendClass">
            {{ store.stats.rollingMedianFatMassChange > 0 ? '+' : '' }}{{ store.stats.rollingMedianFatMassChange.toFixed(2) }} kg
          </span>
          <span class="text-gray-500">vs 7d ago</span>
        </div>
        <div v-else class="text-[11px] text-gray-500 mt-1.5">No 7d change</div>
      </div>
      <!-- Goal target info -->
      <div v-if="store.activePalier && store.targetFatMass !== null" class="flex items-center justify-between mt-2 pt-2 border-t border-amber-500/10 text-[10px] text-amber-300/60 font-medium font-sans">
        <span>Target: {{ store.targetFatMass.toFixed(2) }} kg</span>
        <span v-if="store.stats.rollingMedianFatMass">
          <span v-if="store.stats.rollingMedianFatMass > store.targetFatMass">
            {{ (store.stats.rollingMedianFatMass - store.targetFatMass).toFixed(2) }} kg à perdre
          </span>
          <span v-else-if="store.stats.rollingMedianFatMass < store.targetFatMass">
            {{ (store.targetFatMass - store.stats.rollingMedianFatMass).toFixed(2) }} kg à prendre
          </span>
          <span v-else class="text-emerald-400 font-bold">
            🎉 Atteint !
          </span>
        </span>
      </div>
      <div v-else class="mt-2 pt-2 border-t border-dashed border-amber-500/10 text-[10px] text-gray-650 font-medium font-sans">
        Pas de limite fat
      </div>
    </div>

    <!-- Body Fat % Card (Half width on mobile) -->
    <div class="col-span-1 glass-card-blue p-4 rounded-2xl flex flex-col justify-between">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs text-blue-300/80 font-medium">
          Body Fat
          <span class="text-[10px] text-blue-400/60 font-sans font-normal ml-1">7d Median</span>
        </span>
        <Percent class="w-4 h-4 text-blue-400" />
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
      <div v-if="store.activePalier && store.targetFat !== null" class="flex items-center justify-between mt-2 pt-2 border-t border-blue-500/10 text-[10px] text-blue-300/60 font-medium font-sans">
        <span>Target: {{ store.targetFat.toFixed(1) }}%</span>
        <span v-if="store.stats.rollingMedianFat">
          <span v-if="store.stats.rollingMedianFat > store.targetFat">
            {{ (store.stats.rollingMedianFat - store.targetFat).toFixed(1) }}% à perdre
          </span>
          <span v-else-if="store.stats.rollingMedianFat < store.targetFat">
            {{ (store.targetFat - store.stats.rollingMedianFat).toFixed(1) }}% à prendre
          </span>
          <span v-else class="text-emerald-400 font-bold">
            🎉 Atteint !
          </span>
        </span>
      </div>
      <div v-else class="mt-2 pt-2 border-t border-dashed border-blue-500/10 text-[10px] text-gray-650 font-medium font-sans">
        Pas d'objectif set
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { Scale, Flame, Percent, TrendingUp, TrendingDown } from 'lucide-vue-next';
import { useBodyGraphStore } from '../stores/bodyGraph';

const store = useBodyGraphStore();

const activePalierIndex = computed(() => {
  const active = store.activePalier;
  if (!active) return -1;
  return store.paliersSorted.findIndex(p => p.id === active.id);
});

const massTrendClass = computed(() => {
  const change = store.stats.rollingMedianMassChange;
  if (!change) return 'text-gray-400';
  if (store.targetMass === null) return 'text-violet-400/80';
  
  const current = store.stats.rollingMedianMass || 0;
  const target = store.targetMass;
  const isGood = current > target ? change < 0 : change > 0;
  return isGood ? 'text-emerald-400' : 'text-amber-400';
});

const fatMassTrendClass = computed(() => {
  const change = store.stats.rollingMedianFatMassChange;
  if (!change) return 'text-gray-400';
  if (store.targetFatMass === null) return 'text-amber-400/80';
  
  const current = store.stats.rollingMedianFatMass || 0;
  const target = store.targetFatMass;
  const isGood = current > target ? change < 0 : change > 0;
  return isGood ? 'text-emerald-400' : 'text-amber-400';
});

const fatTrendClass = computed(() => {
  const change = store.stats.rollingMedianFatChange;
  if (!change) return 'text-gray-400';
  if (store.targetFat === null) return 'text-blue-400/80';
  
  const current = store.stats.rollingMedianFat || 0;
  const target = store.targetFat;
  const isGood = current > target ? change < 0 : change > 0;
  return isGood ? 'text-emerald-400' : 'text-amber-400';
});
</script>

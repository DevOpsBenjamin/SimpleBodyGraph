<template>
  <section 
    v-if="visibleCardCount > 0"
    :class="gridContainerClass"
  >
    <!-- 1. Mass Card (Violet) -->
    <div 
      v-if="store.displayPreferences?.cards?.mass !== false"
      class="glass-card-violet p-4 rounded-2xl flex flex-col justify-between"
    >
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs text-violet-300/80 font-medium">
          Poids Total
          <span class="text-[10px] text-violet-400/60 font-sans font-normal ml-1">{{ periodStats.periodBadge }}</span>
        </span>
        <Scale class="w-4 h-4 text-violet-400" />
      </div>
      <div>
        <div class="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-none">
          {{ periodStats.currentMass !== null && periodStats.currentMass !== undefined ? periodStats.currentMass.toFixed(2) : '--.--' }} <span class="text-sm font-normal text-gray-400">kg</span>
        </div>

        <div v-if="periodStats.massChange !== 0" class="flex items-center gap-1 mt-1.5 text-xs">
          <component 
            :is="periodStats.massChange < 0 ? TrendingDown : TrendingUp" 
            :class="[massTrendClass, 'w-3 h-3']" 
          />
          <span :class="massTrendClass">
            {{ periodStats.massChange > 0 ? '+' : '' }}{{ periodStats.massChange.toFixed(2) }} kg
          </span>
          <span class="text-gray-500">{{ periodStats.comparisonLabel }}</span>
        </div>
        <div v-else class="text-[11px] text-gray-500 mt-1.5">Stable ({{ periodStats.comparisonLabel }})</div>
      </div>
      <!-- Goal target info -->
      <div v-if="store.activePalier && store.targetMass !== null" class="flex flex-col gap-0.5 mt-2 pt-2 border-t border-violet-500/10 text-[10px] text-violet-300/60 font-medium font-sans">
        <div class="flex items-center justify-between">
          <span class="text-violet-300 font-bold bg-violet-500/15 px-1.5 py-0.5 rounded">Palier {{ activePalierIndex + 1 }}</span>
          <span v-if="periodStats.currentMass">
            <span v-if="periodStats.currentMass > store.targetMass">
              {{ (periodStats.currentMass - store.targetMass).toFixed(2) }} kg à perdre
            </span>
            <span v-else-if="periodStats.currentMass < store.targetMass">
              {{ (store.targetMass - periodStats.currentMass).toFixed(2) }} kg à prendre
            </span>
            <span v-else class="text-emerald-400 font-bold">
              🎉 Palier atteint !
            </span>
          </span>
        </div>
        <div class="flex justify-between items-center text-[9px] text-violet-400/60">
          <span>Cible: {{ store.targetMass.toFixed(2) }} kg ({{ store.targetFat ? store.targetFat.toFixed(1) + '%' : 'sans limite fat' }})</span>
        </div>
      </div>
      <div v-else-if="store.activePalier" class="flex flex-col gap-0.5 mt-2 pt-2 border-t border-violet-500/10 text-[10px] text-violet-300/60 font-medium font-sans">
        <div class="flex items-center justify-between">
          <span class="text-violet-300 font-bold bg-violet-500/15 px-1.5 py-0.5 rounded">Palier {{ activePalierIndex + 1 }}</span>
          <span class="text-emerald-400 font-bold">Sans objectif poids</span>
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

    <!-- 2. Fat Mass Card (Amber) -->
    <div 
      v-if="store.displayPreferences?.cards?.fatMass !== false"
      class="glass-card-amber p-4 rounded-2xl flex flex-col justify-between"
    >
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs text-amber-300/80 font-medium">
          Masse Grasse
          <span class="text-[10px] text-amber-400/60 font-sans font-normal ml-1">{{ periodStats.periodBadge }}</span>
        </span>
        <Flame class="w-4 h-4 text-amber-400" />
      </div>
      <div>
        <div class="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-none">
          {{ periodStats.currentFatMass !== null && periodStats.currentFatMass !== undefined ? periodStats.currentFatMass.toFixed(2) : '--.--' }} <span class="text-sm font-normal text-gray-400">kg</span>
        </div>

        <div v-if="periodStats.fatMassChange !== 0" class="flex items-center gap-1 mt-1.5 text-xs">
          <component 
            :is="periodStats.fatMassChange < 0 ? TrendingDown : TrendingUp" 
            :class="[fatMassTrendClass, 'w-3 h-3']" 
          />
          <span :class="fatMassTrendClass">
            {{ periodStats.fatMassChange > 0 ? '+' : '' }}{{ periodStats.fatMassChange.toFixed(2) }} kg
          </span>
          <span class="text-gray-500">{{ periodStats.comparisonLabel }}</span>
        </div>
        <div v-else class="text-[11px] text-gray-500 mt-1.5">Stable ({{ periodStats.comparisonLabel }})</div>
      </div>
      <!-- Goal target info -->
      <div v-if="store.activePalier && store.targetFatMass !== null" class="flex items-center justify-between mt-2 pt-2 border-t border-amber-500/10 text-[10px] text-amber-300/60 font-medium font-sans">
        <span>Cible: {{ store.targetFatMass.toFixed(2) }} kg</span>
        <span v-if="periodStats.currentFatMass">
          <span v-if="periodStats.currentFatMass > store.targetFatMass">
            {{ (periodStats.currentFatMass - store.targetFatMass).toFixed(2) }} kg à perdre
          </span>
          <span v-else-if="periodStats.currentFatMass < store.targetFatMass">
            {{ (store.targetFatMass - periodStats.currentFatMass).toFixed(2) }} kg à prendre
          </span>
          <span v-else class="text-emerald-400 font-bold">
            🎉 Atteint !
          </span>
        </span>
      </div>
      <div v-else class="mt-2 pt-2 border-t border-dashed border-amber-500/10 text-[10px] text-gray-500 font-medium font-sans">
        Pas de limite fat
      </div>
    </div>

    <!-- 3. Body Fat % Card (Blue) -->
    <div 
      v-if="store.displayPreferences?.cards?.bodyFat !== false"
      class="glass-card-blue p-4 rounded-2xl flex flex-col justify-between"
    >
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs text-blue-300/80 font-medium">
          % Gras
          <span class="text-[10px] text-blue-400/60 font-sans font-normal ml-1">{{ periodStats.periodBadge }}</span>
        </span>
        <Percent class="w-4 h-4 text-blue-400" />
      </div>
      <div>
        <div class="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-none">
          {{ periodStats.currentFat !== null && periodStats.currentFat !== undefined ? periodStats.currentFat.toFixed(1) : '--.-' }} <span class="text-sm font-normal text-gray-400">%</span>
        </div>

        <div v-if="periodStats.fatChange !== 0" class="flex items-center gap-1 mt-1.5 text-xs">
          <component 
            :is="periodStats.fatChange < 0 ? TrendingDown : TrendingUp" 
            :class="[fatTrendClass, 'w-3 h-3']" 
          />
          <span :class="fatTrendClass">
            {{ periodStats.fatChange > 0 ? '+' : '' }}{{ periodStats.fatChange.toFixed(1) }}%
          </span>
          <span class="text-gray-500">{{ periodStats.comparisonLabel }}</span>
        </div>
        <div v-else class="text-[11px] text-gray-500 mt-1.5">Stable ({{ periodStats.comparisonLabel }})</div>
      </div>
      <!-- Goal target info -->
      <div v-if="store.activePalier && store.targetFat !== null" class="flex items-center justify-between mt-2 pt-2 border-t border-blue-500/10 text-[10px] text-blue-300/60 font-medium font-sans">
        <span>Cible: {{ store.targetFat.toFixed(1) }}%</span>
        <span v-if="periodStats.currentFat">
          <span v-if="periodStats.currentFat > store.targetFat">
            {{ (periodStats.currentFat - store.targetFat).toFixed(1) }}% à perdre
          </span>
          <span v-else-if="periodStats.currentFat < store.targetFat">
            {{ (store.targetFat - periodStats.currentFat).toFixed(1) }}% à prendre
          </span>
          <span v-else class="text-emerald-400 font-bold">
            🎉 Atteint !
          </span>
        </span>
      </div>
      <div v-else class="mt-2 pt-2 border-t border-dashed border-blue-500/10 text-[10px] text-gray-500 font-medium font-sans">
        Pas d'objectif set
      </div>
    </div>

    <!-- 4. Lean Mass Card (Emerald) -->
    <div 
      v-if="store.displayPreferences?.cards?.leanMass !== false"
      class="glass-card-emerald p-4 rounded-2xl flex flex-col justify-between"
    >
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs text-emerald-300/80 font-medium">
          Masse Maigre
          <span class="text-[10px] text-emerald-400/60 font-sans font-normal ml-1">{{ periodStats.periodBadge }}</span>
        </span>
        <Dumbbell class="w-4 h-4 text-emerald-400" />
      </div>
      <div>
        <div class="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-none">
          {{ periodStats.currentLeanMass !== null && periodStats.currentLeanMass !== undefined ? periodStats.currentLeanMass.toFixed(2) : '--.--' }} <span class="text-sm font-normal text-gray-400">kg</span>
        </div>

        <div v-if="periodStats.leanMassChange !== 0" class="flex items-center gap-1 mt-1.5 text-xs">
          <component 
            :is="periodStats.leanMassChange >= 0 ? TrendingUp : TrendingDown" 
            :class="[leanMassTrendClass, 'w-3 h-3']" 
          />
          <span :class="leanMassTrendClass">
            {{ periodStats.leanMassChange > 0 ? '+' : '' }}{{ periodStats.leanMassChange.toFixed(2) }} kg
          </span>
          <span class="text-gray-500">{{ periodStats.comparisonLabel }}</span>
        </div>
        <div v-else class="text-[11px] text-gray-500 mt-1.5">Stable ({{ periodStats.comparisonLabel }})</div>
      </div>
      <!-- Goal target info -->
      <div v-if="store.activePalier && store.targetLeanMass !== null" class="flex items-center justify-between mt-2 pt-2 border-t border-emerald-500/10 text-[10px] text-emerald-300/60 font-medium font-sans">
        <span>Cible: {{ store.targetLeanMass.toFixed(2) }} kg</span>
        <span class="text-emerald-400 font-bold">Maintien lean</span>
      </div>
      <div v-else class="mt-2 pt-2 border-t border-dashed border-emerald-500/10 text-[10px] text-gray-500 font-medium font-sans">
        Masse musculaire & vitale
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { Scale, Flame, Percent, Dumbbell, TrendingUp, TrendingDown } from 'lucide-vue-next';
import { useBodyGraphStore } from '../stores/bodyGraph';

const store = useBodyGraphStore();

const periodStats = computed(() => store.periodStats);

const visibleCardCount = computed(() => {
  const c = store.displayPreferences?.cards || {};
  let count = 0;
  if (c.mass !== false) count++;
  if (c.fatMass !== false) count++;
  if (c.bodyFat !== false) count++;
  if (c.leanMass !== false) count++;
  return count;
});

const gridContainerClass = computed(() => {
  const count = visibleCardCount.value;
  if (count === 4) return 'grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6';
  if (count === 3) return 'grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-6';
  if (count === 2) return 'grid grid-cols-2 gap-3 sm:gap-4 mb-6';
  return 'grid grid-cols-1 max-w-sm gap-3 sm:gap-4 mb-6';
});

const activePalierIndex = computed(() => {
  const active = store.activePalier;
  if (!active) return -1;
  return store.paliersSorted.findIndex(p => p.id === active.id);
});

const massTrendClass = computed(() => {
  const change = periodStats.value.massChange;
  if (!change) return 'text-gray-400';
  if (store.targetMass === null) return 'text-violet-400/80';
  
  const current = periodStats.value.currentMass || 0;
  const target = store.targetMass;
  const isGood = current > target ? change < 0 : change > 0;
  return isGood ? 'text-emerald-400' : 'text-amber-400';
});

const fatMassTrendClass = computed(() => {
  const change = periodStats.value.fatMassChange;
  if (!change) return 'text-gray-400';
  if (store.targetFatMass === null) return 'text-amber-400/80';
  
  const current = periodStats.value.currentFatMass || 0;
  const target = store.targetFatMass;
  const isGood = current > target ? change < 0 : change > 0;
  return isGood ? 'text-emerald-400' : 'text-amber-400';
});

const fatTrendClass = computed(() => {
  const change = periodStats.value.fatChange;
  if (!change) return 'text-gray-400';
  if (store.targetFat === null) return 'text-blue-400/80';
  
  const current = periodStats.value.currentFat || 0;
  const target = store.targetFat;
  const isGood = current > target ? change < 0 : change > 0;
  return isGood ? 'text-emerald-400' : 'text-amber-400';
});

const leanMassTrendClass = computed(() => {
  const change = periodStats.value.leanMassChange;
  if (!change) return 'text-gray-400';
  return change >= 0 ? 'text-emerald-400' : 'text-amber-400';
});
</script>

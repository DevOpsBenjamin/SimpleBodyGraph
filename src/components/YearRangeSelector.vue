<template>
  <div class="glass-card p-3 sm:p-4 rounded-2xl sm:rounded-3xl max-w-2xl mx-auto shadow-lg flex items-center justify-between gap-3 border border-gray-800/60">
    <div class="flex items-center gap-2.5">
      <div class="p-1.5 sm:p-2 rounded-xl bg-violet-600/10 border border-violet-500/20 text-violet-400">
        <Calendar class="w-4 h-4 sm:w-5 sm:h-5" />
      </div>
      <div>
        <h4 class="text-xs sm:text-sm font-bold text-white leading-tight">Filtre Années</h4>
        <p class="text-[10px] sm:text-xs text-gray-400 hidden xs:block">Période des graphiques</p>
      </div>
    </div>

    <!-- Compact Year Range Selectors -->
    <div class="flex items-center gap-2">
      <div class="relative">
        <select
          v-model="store.startYear"
          class="bg-gray-950 border border-gray-800 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-violet-500 cursor-pointer"
          aria-label="Année de départ"
        >
          <option v-for="yr in store.availableYears.slice().reverse()" :key="yr" :value="yr">{{ yr }}</option>
        </select>
      </div>

      <span class="text-gray-500 text-xs font-bold select-none">→</span>

      <div class="relative">
        <select
          v-model="store.endYear"
          class="bg-gray-950 border border-gray-800 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-violet-500 cursor-pointer"
          aria-label="Année de fin"
        >
          <option v-for="yr in store.availableYears" :key="yr" :value="yr" :disabled="yr < store.startYear">{{ yr }}</option>
        </select>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Calendar } from 'lucide-vue-next';
import { useBodyGraphStore } from '../stores/bodyGraph';

const store = useBodyGraphStore();
</script>
